const mongoose = require("mongoose");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const BankReconciliation = require("./bankReconciliation.model");
const JournalEntry = require("../accounting/accounting.model");
const ChartOfAccounts = require("../chartOfAccounts/coa.model");
const Bank = require("../bank/bank.model");
const BankService = require("../bank/bank.service");
const BankBookService = require("./bankBook.service");
const SettingsService = require("../settings/settings.service");
const AccountingService = require("../accounting/accounting.service");
const generateVoucherNumber = require("../../utils/generateVoucherNumber");
const { SOURCE_MODULES } = require("../../config/constants");
const { resolveReportLogoPath } = require("../../utils/reportLogo");
const { NotFoundError, BadRequestError } = require("../../errors");

// The six line categories printed on AFC's paper statement, each tagged with
// the half of the form it appears in. Order matters: it is the print order.
//
// `posting` marks the two categories that represent money the BANK moved that
// the books never recorded — the only two that can generate a journal entry.
// The other four are timing differences: the books already hold those
// transactions and the bank simply hasn't caught up, so posting anything for
// them would double-count. `bankSide` is the sign of the posted entry's
// effect on the bank account (debit-positive, matching
// BankService.calculateCoaLedgerBalance), and `defaultAccountCode` is the
// seeded chart-of-accounts fallback when neither the line nor Settings names
// a contra account.
const ADJUSTMENT_SECTIONS = [
  {
    type: "bankCreditsNotInBooks",
    group: "add",
    label: "Transactions Credited to Bank Statement but Not Debited to AFC A/C Statement:",
    posting: {
      bankSide: 1, // Dr bank / Cr contra
      transactionType: "receipt",
      settingsKey: "bankCreditAccount",
      defaultAccountCode: "4803", // FDR Interest — the usual unrecorded bank credit
      contraLabel: "income",
    },
  },
  {
    type: "outstandingCheques",
    group: "add",
    label: "Outstanding Cheques: (Cheques Issued but not Presented to Bank)",
  },
  {
    type: "previousDepositsInTransit",
    group: "add",
    label: "Previous Month's Deposit in Transit:",
  },
  {
    type: "previousOutstandingCheques",
    group: "deduct",
    label: "Previous Month's Outstanding Cheques (Transactions Debited to Bank Statement)",
  },
  {
    type: "depositsInTransit",
    group: "deduct",
    label: "Deposit in Transit:",
  },
  {
    type: "bankCharges",
    group: "deduct",
    label: "Bank Charges & Other Fees:",
    posting: {
      bankSide: -1, // Dr contra / Cr bank
      transactionType: "payment",
      settingsKey: "bankChargeAccount",
      defaultAccountCode: "6408",
      contraLabel: "expense",
    },
  },
];

const ADJUSTMENT_TYPES = ADJUSTMENT_SECTIONS.map((section) => section.type);
const ADD_TYPES = ADJUSTMENT_SECTIONS.filter((s) => s.group === "add").map((s) => s.type);
const DEDUCT_TYPES = ADJUSTMENT_SECTIONS.filter((s) => s.group === "deduct").map((s) => s.type);

const SECTION_BY_TYPE = new Map(ADJUSTMENT_SECTIONS.map((s) => [s.type, s]));
const POSTABLE_TYPES = ADJUSTMENT_SECTIONS.filter((s) => s.posting).map((s) => s.type);

const RECONCILE_TOLERANCE = 0.01; // major-unit (Taka) tolerance for "balances"

class BankReconciliationService {
  static assertKnownType(type) {
    if (!ADJUSTMENT_TYPES.includes(type)) {
      throw new BadRequestError(
        `Adjustment type must be one of: ${ADJUSTMENT_TYPES.join(", ")}`,
      );
    }
  }

  /**
   * Thin wrapper over bank.service.js's already-verified ledger-balance
   * calculation — no new balance logic here. bankAccount is a
   * ChartOfAccounts _id (see bankReconciliation.model.js's comment on why
   * this follows bankBook's account-identity convention, not bank.model.js's).
   */
  static async getBookBalance(bankAccountId, asOfDate = new Date()) {
    // Through the END of the Dhaka day, matching the Bank Book's closing
    // balance — see normalizePeriod.
    return await BankService.calculateCoaLedgerBalance(
      bankAccountId,
      BankBookService.endOfDhakaDay(this.dhakaISODate(asOfDate)),
    );
  }

  static sumLines(lines = []) {
    return (lines || []).reduce((sum, line) => sum + Number(line.amount || 0), 0);
  }

  /**
   * The reconciliation math, taken directly from AFC's paper statement. It
   * walks from the book balance to the bank balance:
   *
   *   Balance as per AFC Statement (books, computed live from the ledger)
   *   + bankCreditsNotInBooks + outstandingCheques + previousDepositsInTransit
   *   − previousOutstandingCheques − depositsInTransit − bankCharges
   *   = Balance as per Bank Statement
   *
   * Every category's sign is fixed by which half of the printed form it sits
   * in, so the computed total always equals what the paper statement totals
   * to for the same lines. Which category a given item belongs in stays the
   * preparer's call, exactly as it is on paper — nothing is auto-classified.
   *
   * `liveBookBalance` is the ledger balance as it stands right now, which
   * already includes any adjustment this reconciliation has posted (a posted
   * bank charge has debited the expense and credited the bank). The opening
   * line of the statement must stay the PRE-adjustment book balance — that is
   * what "Balance as per AFC Statement" means on the paper form, and what the
   * six categories below are the reconciling items against. So whatever the
   * posted lines actually put into that balance gets backed out here. The
   * consequence is the one that matters: posting a line changes nothing about
   * how this statement reads or totals, it only puts the entry in the books.
   */
  static async getStatementBookBalance(reconciliation) {
    const bankAccountId = reconciliation.bankAccount?._id || reconciliation.bankAccount;
    const liveBookBalance = await this.getBookBalance(bankAccountId, reconciliation.periodEnd);

    return liveBookBalance - (await this.getPostedAdjustmentEffect(reconciliation));
  }

  /**
   * How much this reconciliation's own posted entries contribute to the
   * ledger balance at the period end — read from the journal entries
   * themselves, under the same filter calculateCoaLedgerBalance applies.
   *
   * The line's own date and amount can't be trusted for this: a voucher can
   * be re-dated (or reversed) in the journal afterwards, and the line keeps
   * its old values. Backing out a line whose voucher now sits after the
   * period end subtracted money that was never in the balance, which is how
   * the statement's opening line drifted away from the ledger's closing
   * balance for the same date.
   */
  static async getPostedAdjustmentEffect(reconciliation) {
    const bankAccountId = reconciliation.bankAccount?._id || reconciliation.bankAccount;
    const entryIds = POSTABLE_TYPES.flatMap((type) =>
      (reconciliation[type] || [])
        .map((line) => line.journalEntryId?._id || line.journalEntryId)
        .filter(Boolean),
    );

    if (entryIds.length === 0) return 0;

    const entries = await JournalEntry.find({
      _id: { $in: entryIds },
      "bookEntries.account": bankAccountId,
      status: "posted",
      approvalStatus: "approved",
      deletedAt: null,
      voucherDate: {
        $lte: BankBookService.endOfDhakaDay(this.dhakaISODate(reconciliation.periodEnd)),
      },
    });

    return entries.reduce((effect, entry) => {
      const line = BankService.getBankLine(entry.toJSON(), bankAccountId);
      return effect + Number(line?.debit || 0) - Number(line?.credit || 0);
    }, 0);
  }

  // `bookBalance` is the pre-adjustment figure from getStatementBookBalance.
  static computeClosingBalance(reconciliation, bookBalance) {
    const totals = {};
    for (const type of ADJUSTMENT_TYPES) {
      totals[type] = this.sumLines(reconciliation[type]);
    }

    const totalAdd = ADD_TYPES.reduce((sum, type) => sum + totals[type], 0);
    const totalDeduct = DEDUCT_TYPES.reduce((sum, type) => sum + totals[type], 0);

    return {
      bookBalance,
      totals,
      totalAdd,
      totalDeduct,
      // The template prints this running subtotal on its own line, between
      // the Add and Deduct halves.
      subTotal: bookBalance + totalAdd,
      computedClosingBalance: bookBalance + totalAdd - totalDeduct,
    };
  }

  static async getReconciliationById(reconciliationId) {
    const query = BankReconciliation.findById(reconciliationId)
      .populate("bankAccount", "accountCode accountName accountType")
      .populate("preparedBy", "name email")
      .populate("approvedBy", "name email")
      .populate("previousPeriodReconciliation", "periodStart periodEnd statementClosingBalance");

    // Any line can reference a journal entry (a timing-difference line may
    // point at the voucher it's waiting on), and that voucher's date is the
    // one the statement shows — see applyJournalDates. Only the postable
    // categories carry a contra account.
    for (const type of ADJUSTMENT_TYPES) {
      query.populate(`${type}.journalEntryId`, "voucherNumber voucherDate status");
    }
    for (const type of POSTABLE_TYPES) {
      query.populate(`${type}.contraAccount`, "accountCode accountName");
    }

    const reconciliation = await query;

    if (!reconciliation) {
      throw new NotFoundError("Bank reconciliation not found");
    }

    return reconciliation;
  }

  /**
   * The statement header names the real bank and account number ("Brac Bank
   * PLC" / "A/C Number: 2065149550001"), which live on the Bank record, not
   * on the ChartOfAccounts leaf this module keys off. The COA account is the
   * fallback when no Bank record is linked to it.
   */
  static async getAccountHeader(bankAccount) {
    const accountId = bankAccount?._id || bankAccount;
    const bank = await Bank.findOne({ coaAccount: accountId, deletedAt: null })
      .select("bankName accountNumber")
      .lean();

    return {
      bankName: bank?.bankName || bankAccount?.accountName || "Bank Account",
      accountNumber: bank?.accountNumber || "",
      accountCode: bankAccount?.accountCode || "",
      accountName: bankAccount?.accountName || "",
    };
  }

  /**
   * A line backed by a journal entry is dated by that entry — the journal is
   * the source of truth. The line's stored date is only a copy taken when it
   * was posted, and goes stale if the voucher is re-dated afterwards; showing
   * it would put the statement (screen and PDF alike) at odds with the
   * ledger. Resolved at read time so no stored data has to be rewritten.
   * Expects journalEntryId populated, as getReconciliationById does.
   */
  static applyJournalDates(reconciliationJson) {
    for (const type of ADJUSTMENT_TYPES) {
      for (const line of reconciliationJson[type] || []) {
        const voucherDate = line.journalEntryId?.voucherDate;
        if (voucherDate) line.date = voucherDate;
      }
    }

    return reconciliationJson;
  }

  /**
   * Builds the full statement view: stored fields + the computed
   * book-balance/variance breakdown + the printable section list, so neither
   * the screen nor the PDF has to reimplement the arithmetic or the ordering.
   */
  static async getReconciliationView(reconciliationId) {
    const reconciliation = await this.getReconciliationById(reconciliationId);
    const bookBalance = await this.getStatementBookBalance(reconciliation);

    const breakdown = this.computeClosingBalance(reconciliation, bookBalance);
    const variance =
      breakdown.computedClosingBalance - Number(reconciliation.statementClosingBalance || 0);

    const header = await this.getAccountHeader(reconciliation.bankAccount);

    return {
      reconciliation: this.applyJournalDates(reconciliation.toJSON()),
      header,
      sections: ADJUSTMENT_SECTIONS,
      breakdown,
      variance,
      isReconciled: Math.abs(variance) < RECONCILE_TOLERANCE,
    };
  }

  /**
   * Latest finalized period per account, keyed by account id string (value
   * is null for accounts with none). Reconciliation coverage is period-based,
   * so this period's end date is the cutoff any "is this covered?" question
   * compares against — the dashboard's unreconciled signal is the only
   * caller today, but the lookup lives here so the finalized-period rule
   * has exactly one definition.
   */
  static async getLatestFinalizedByAccount(bankAccountIds = []) {
    const coverage = new Map(bankAccountIds.map((id) => [String(id), null]));

    if (bankAccountIds.length === 0) return coverage;

    const finalized = await BankReconciliation.find({
      bankAccount: { $in: bankAccountIds },
      status: "finalized",
      deletedAt: null,
    })
      .select("bankAccount periodStart periodEnd")
      .sort({ periodEnd: 1 });

    // Ascending periodEnd means the last write per account wins, leaving the
    // latest finalized period in the map.
    for (const doc of finalized) {
      coverage.set(String(doc.bankAccount), doc);
    }

    return coverage;
  }

  /**
   * Draft periods that don't balance — the same variance
   * finalizeReconciliation refuses to finalize on, surfaced before someone
   * tries. Drafts are few (typically one open period per account), so the
   * per-draft ledger sum here is cheap.
   */
  static async getDraftVariances(bankAccountIds = []) {
    if (bankAccountIds.length === 0) return [];

    const drafts = await BankReconciliation.find({
      bankAccount: { $in: bankAccountIds },
      status: "draft",
      deletedAt: null,
    }).populate("bankAccount", "accountCode accountName");

    const variances = [];

    for (const draft of drafts) {
      const bookBalance = await this.getStatementBookBalance(draft);
      const breakdown = this.computeClosingBalance(draft, bookBalance);
      const variance =
        breakdown.computedClosingBalance - Number(draft.statementClosingBalance || 0);

      if (Math.abs(variance) >= RECONCILE_TOLERANCE) {
        variances.push({ reconciliation: draft, variance });
      }
    }

    return variances;
  }

  static async listByAccount(filters = {}) {
    const query = { deletedAt: null };

    if (filters.bankAccount) query.bankAccount = filters.bankAccount;
    if (filters.status) query.status = filters.status;

    const page = Math.max(1, parseInt(filters.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      BankReconciliation.find(query)
        .populate("bankAccount", "accountCode accountName")
        .populate("preparedBy", "name email")
        .sort({ periodEnd: -1 })
        .skip(skip)
        .limit(limit),
      BankReconciliation.countDocuments(query),
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  /**
   * A period covers whole days in Dhaka time, the same boundaries the Bank
   * Book statement uses. Stored as bare dates (midnight UTC = 06:00 Dhaka),
   * the period silently dropped every voucher timestamped later on its last
   * day, so the reconciliation's book balance disagreed with the ledger's
   * closing balance for the same date.
   */
  static normalizePeriod(periodStart, periodEnd) {
    return {
      start: BankBookService.startOfDhakaDay(this.dhakaISODate(periodStart)),
      end: BankBookService.endOfDhakaDay(this.dhakaISODate(periodEnd)),
    };
  }

  // The calendar date a value falls on in Dhaka. A plain "YYYY-MM-DD" string
  // is taken as that date, not converted, so user input never shifts a day.
  static dhakaISODate(value) {
    const raw = String(value || "");
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    return new Date(value).toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });
  }

  static async createReconciliationPeriod(input, userId) {
    const { bankAccount, periodStart, periodEnd } = input;

    const account = await ChartOfAccounts.findOne({ _id: bankAccount, deletedAt: null });
    if (!account) {
      throw new NotFoundError("Bank account (chart of accounts) not found");
    }

    if (
      Number.isNaN(new Date(periodStart).getTime()) ||
      Number.isNaN(new Date(periodEnd).getTime())
    ) {
      throw new BadRequestError("Period start/end must be valid dates");
    }

    const { start, end } = this.normalizePeriod(periodStart, periodEnd);

    if (start > end) {
      throw new BadRequestError("Period start must be before period end");
    }

    // Two periods covering the same days would each count the same ledger
    // activity, and the dashboard's "reconciled through" date would depend on
    // which one happened to be finalized last.
    const overlapping = await BankReconciliation.findOne({
      bankAccount,
      periodStart: { $lte: end },
      periodEnd: { $gte: start },
      deletedAt: null,
    }).select("periodStart periodEnd");

    if (overlapping) {
      throw new BadRequestError(
        `This period overlaps an existing reconciliation for this account ` +
          `(${this.formatLongDate(overlapping.periodStart)} to ${this.formatLongDate(overlapping.periodEnd)}).`,
      );
    }

    // Most recent PRIOR period for this account (by periodEnd), used to
    // default the opening balance and to snapshot carry-forward items.
    const previousPeriod = await BankReconciliation.findOne({
      bankAccount,
      periodEnd: { $lt: start },
      deletedAt: null,
    }).sort({ periodEnd: -1 });

    // The prior period's still-open items become this period's two
    // "Previous Month's ..." reversal sections, pre-filled so the preparer
    // starts from the same place they would on paper. They are ordinary
    // editable lines: anything that did not actually clear gets deleted here
    // and re-entered in the current-period section instead, which is exactly
    // the judgement call the paper form leaves to the preparer.
    // A carried line backed by a journal entry takes the entry's current date,
    // not the (possibly stale) copy on the old line — see applyJournalDates.
    const carriedEntryIds = previousPeriod
      ? [...previousPeriod.depositsInTransit, ...previousPeriod.outstandingCheques]
          .map((line) => line.journalEntryId)
          .filter(Boolean)
      : [];
    const journalDates = new Map(
      carriedEntryIds.length
        ? (
            await JournalEntry.find({ _id: { $in: carriedEntryIds } }).select("voucherDate").lean()
          ).map((entry) => [String(entry._id), entry.voucherDate])
        : [],
    );

    const copyLine = (line) => ({
      journalEntryId: line.journalEntryId || null,
      description: line.description,
      amount: line.amount,
      date: journalDates.get(String(line.journalEntryId)) || line.date,
    });

    const previousDepositsInTransit = previousPeriod
      ? previousPeriod.depositsInTransit.map(copyLine)
      : [];
    const previousOutstandingCheques = previousPeriod
      ? previousPeriod.outstandingCheques.map(copyLine)
      : [];

    const reconciliation = new BankReconciliation({
      bankAccount,
      periodStart: start,
      periodEnd: end,
      statementClosingBalance:
        input.statementClosingBalance !== undefined
          ? Number(input.statementClosingBalance)
          : 0,
      previousPeriodReconciliation: previousPeriod?._id || null,
      previousDepositsInTransit,
      previousOutstandingCheques,
      preparedBy: userId,
    });

    await reconciliation.save();

    return await this.getReconciliationById(reconciliation._id);
  }

  static async updateBalances(reconciliationId, updateData, userId) {
    const reconciliation = await BankReconciliation.findOne({
      _id: reconciliationId,
      deletedAt: null,
    });

    if (!reconciliation) {
      throw new NotFoundError("Bank reconciliation not found");
    }

    if (reconciliation.status === "finalized") {
      throw new BadRequestError("Cannot edit a finalized bank reconciliation");
    }

    if (updateData.statementClosingBalance !== undefined) {
      reconciliation.statementClosingBalance = Number(updateData.statementClosingBalance);
    }

    reconciliation.updatedBy = userId;
    await reconciliation.save();

    return await this.getReconciliationById(reconciliation._id);
  }

  static async addAdjustmentLine(reconciliationId, type, line) {
    this.assertKnownType(type);

    const reconciliation = await BankReconciliation.findOne({
      _id: reconciliationId,
      deletedAt: null,
    });

    if (!reconciliation) {
      throw new NotFoundError("Bank reconciliation not found");
    }

    if (reconciliation.status === "finalized") {
      throw new BadRequestError("Cannot edit a finalized bank reconciliation");
    }

    // Nothing on this statement can be dated after it closes — the bank can't
    // have printed it yet. A bank credit or charge is also dated on the
    // statement itself, so it can't predate the period either; the timing
    // categories can (an old cheque still outstanding). Posting books the
    // entry on this date, so a line dated in a later month lands in THAT
    // month's ledger and inflates the next reconciliation's book balance.
    const lineDay = this.dhakaISODate(line.date);
    const startDay = this.dhakaISODate(reconciliation.periodStart);
    const endDay = this.dhakaISODate(reconciliation.periodEnd);

    if (lineDay > endDay) {
      throw new BadRequestError(
        `Line date ${lineDay} is after this period ends (${endDay}). ` +
          "It belongs on the next period's reconciliation.",
      );
    }

    if (POSTABLE_TYPES.includes(type) && lineDay < startDay) {
      throw new BadRequestError(
        `Line date ${lineDay} is before this period starts (${startDay}). ` +
          "Bank credits and charges must be dated within the statement period.",
      );
    }

    // Only the postable categories ever generate an entry, so a contra account
    // on any other line would be meaningless. Checked here rather than at
    // posting time so a bad pick is refused while the preparer is still
    // looking at it, not discovered at finalize.
    let contraAccount = null;
    if (line.contraAccount && POSTABLE_TYPES.includes(type)) {
      contraAccount = (await this.assertUsableContraAccount(line.contraAccount, reconciliation))._id;
    }

    reconciliation[type].push({
      journalEntryId: line.journalEntryId || null,
      contraAccount,
      description: line.description,
      amount: Number(line.amount),
      date: new Date(line.date),
    });

    await reconciliation.save();

    return await this.getReconciliationById(reconciliation._id);
  }

  /**
   * Which chart-of-accounts leaf the other half of this line's journal entry
   * hits, in falling order of specificity: the account the preparer chose on
   * the line, the organisation-wide default in Settings, then the seeded
   * account code for the category. Resolving to nothing is a hard error
   * rather than a guess — booking a real expense against the wrong account is
   * worse than refusing to post it.
   */
  /**
   * An account the preparer picked by hand must be usable as-is. Falling back
   * to the default when it isn't would book the entry somewhere they never
   * chose, without telling them.
   */
  static async assertUsableContraAccount(accountId, reconciliation) {
    const account = await ChartOfAccounts.findOne({
      _id: accountId,
      deletedAt: null,
      status: "active",
    });

    if (!account) {
      throw new BadRequestError("The selected contra account was not found or is not active");
    }

    const bankAccountId = reconciliation.bankAccount?._id || reconciliation.bankAccount;
    if (String(account._id) === String(bankAccountId)) {
      throw new BadRequestError("The contra account cannot be the bank account being reconciled");
    }

    return account;
  }

  static async resolveContraAccount(type, explicitAccountId, reconciliation) {
    const section = SECTION_BY_TYPE.get(type);
    const { settingsKey, defaultAccountCode, contraLabel } = section.posting;

    if (explicitAccountId) {
      return await this.assertUsableContraAccount(explicitAccountId, reconciliation);
    }

    const settings = await SettingsService.getSettings();
    if (settings?.[settingsKey]) {
      const account = await ChartOfAccounts.findOne({
        _id: settings[settingsKey],
        deletedAt: null,
        status: "active",
      });

      if (account) return account;
    }

    const seeded = await ChartOfAccounts.findOne({
      accountCode: defaultAccountCode,
      deletedAt: null,
      status: "active",
    });

    if (seeded) return seeded;

    throw new BadRequestError(
      `No ${contraLabel} account is configured for "${section.label.replace(/:$/, "")}". ` +
        `Pick an account on the line, set one in Settings, or create account ${defaultAccountCode}.`,
    );
  }

  /**
   * Turns one adjustment line into a real, posted journal entry against the
   * bank account this reconciliation covers.
   *
   * The entry is dated on the line's own date — the date the bank actually
   * moved the money — so the expense or income lands in the period it belongs
   * to rather than the period someone happened to reconcile in. It posts
   * without a separate approval step because reaching this point already
   * required the accountant/director tier that approves journal entries, and
   * a reconciliation that could only be half-recorded pending someone else's
   * click would leave the books mid-adjustment.
   */
  static async postAdjustmentLine(reconciliationId, type, lineId, options = {}, userId) {
    this.assertKnownType(type);

    if (!POSTABLE_TYPES.includes(type)) {
      throw new BadRequestError(
        `"${SECTION_BY_TYPE.get(type).label.replace(/:$/, "")}" is a timing difference — ` +
          "those transactions are already in the books and must not be posted again. " +
          `Only ${POSTABLE_TYPES.join(" and ")} can be posted.`,
      );
    }

    const reconciliation = await BankReconciliation.findOne({
      _id: reconciliationId,
      deletedAt: null,
    });

    if (!reconciliation) {
      throw new NotFoundError("Bank reconciliation not found");
    }

    if (reconciliation.status === "finalized") {
      throw new BadRequestError("Cannot edit a finalized bank reconciliation");
    }

    const line = reconciliation[type].id(lineId);
    if (!line) {
      throw new NotFoundError("Adjustment line not found");
    }

    if (line.journalEntryId) {
      throw new BadRequestError("This adjustment line has already been posted to the books");
    }

    const plan = await this.preparePosting(reconciliation, type, line, options.contraAccount);

    await this.inTransaction(async (session) => {
      await this.postLine(reconciliation, plan, userId, session);
      await reconciliation.save({ session });
    });

    return await this.getReconciliationById(reconciliation._id);
  }

  /**
   * The journal entry and the line that records its id have to land together.
   * Written separately, a failed save after a successful post leaves a posted
   * entry the reconciliation doesn't know about, and the next attempt posts
   * it a second time.
   */
  static async inTransaction(work) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const result = await work(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      if (session.inTransaction()) await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Every check a line has to pass before it can be posted, with no writes.
   * Finalize runs this over all pending lines first, so one bad line refuses
   * the whole sign-off instead of failing after some entries already exist.
   */
  static async preparePosting(reconciliation, type, line, contraAccountId) {
    const contra = await this.resolveContraAccount(
      type,
      contraAccountId || line.contraAccount?._id || line.contraAccount,
      reconciliation,
    );
    const bankAccountId = reconciliation.bankAccount?._id || reconciliation.bankAccount;
    const amount = Number(line.amount || 0);
    const voucherDate = new Date(line.date);

    if (amount <= 0) {
      throw new BadRequestError("Cannot post an adjustment line with a zero amount");
    }

    // The entry is dated on the line's own date, which nothing forces to sit
    // inside this reconciliation's period — a mistyped year is enough to land
    // it in an already-signed month, silently changing that statement's
    // variance after the fact. Same rule accounting.service.js's
    // assertDateNotInFinalizedReconciliation enforces when a voucher date is
    // edited; it has to hold here too, since this is the other way a dated
    // entry can appear inside a closed period.
    const closedPeriod = await BankReconciliation.findOne({
      _id: { $ne: reconciliation._id },
      bankAccount: bankAccountId,
      status: "finalized",
      periodStart: { $lte: voucherDate },
      periodEnd: { $gte: voucherDate },
      deletedAt: null,
    }).select("periodStart periodEnd");

    if (closedPeriod) {
      throw new BadRequestError(
        `"${line.description}" is dated ${this.dhakaISODate(voucherDate)}, which falls inside ` +
          `a finalized reconciliation (${this.dhakaISODate(closedPeriod.periodStart)} to ` +
          `${this.dhakaISODate(closedPeriod.periodEnd)}). Correct the line's date before posting it.`,
      );
    }

    return { type, line, contra, bankAccountId, amount, voucherDate };
  }

  /**
   * Posts a line that preparePosting already cleared and stamps the result
   * onto it, without saving — the caller owns the save and the session, so
   * the entry and the stamp commit together.
   */
  static async postLine(reconciliation, plan, userId, session) {
    const { type, line, contra, bankAccountId, amount, voucherDate } = plan;
    const { bankSide, transactionType } = SECTION_BY_TYPE.get(type).posting;

    // bankSide is +1 when the bank was credited by the bank (money in, so the
    // bank account is debited) and -1 when it was charged.
    const bankLine =
      bankSide === 1
        ? { account: bankAccountId, debit: amount, credit: 0 }
        : { account: bankAccountId, debit: 0, credit: amount };
    const contraLine =
      bankSide === 1
        ? { account: contra._id, debit: 0, credit: amount }
        : { account: contra._id, debit: amount, credit: 0 };

    const entry = await AccountingService.createJournalEntry({
      voucherNumber: await generateVoucherNumber("BRA"),
      voucherDate,
      transactionType,
      description: `Bank reconciliation adjustment — ${line.description}`,
      referenceNumber: String(reconciliation._id),
      referenceType: SOURCE_MODULES.BANK_RECONCILIATION,
      referenceAccount: bankAccountId,
      sourceModule: SOURCE_MODULES.BANK_RECONCILIATION,
      requiresApproval: false,
      createdBy: userId,
      bookEntries: [
        { ...bankLine, description: line.description },
        { ...contraLine, description: line.description },
      ],
    }, { session });

    line.journalEntryId = entry._id;
    line.contraAccount = contra._id;
    line.postedAt = new Date();
    line.postedBy = userId;

    return entry;
  }

  /**
   * Every postable line that hasn't been posted yet. Finalizing runs this so
   * signing off on a reconciliation and recording what it found are one
   * action — the whole point of identifying a bank charge is that it has to
   * reach the books, and leaving that as a second manual step is exactly how
   * it gets forgotten.
   */
  static async preparePendingLines(reconciliation) {
    const plans = [];

    for (const type of POSTABLE_TYPES) {
      for (const line of reconciliation[type] || []) {
        if (line.journalEntryId) continue;
        plans.push(await this.preparePosting(reconciliation, type, line, null));
      }
    }

    return plans;
  }

  static async postPendingLines(reconciliation, plans, userId, session) {
    const posted = [];

    for (const plan of plans) {
      const entry = await this.postLine(reconciliation, plan, userId, session);
      posted.push({
        type: plan.type,
        lineId: plan.line._id,
        journalEntryId: entry._id,
        voucherNumber: entry.voucherNumber,
      });
    }

    return posted;
  }

  static async removeAdjustmentLine(reconciliationId, type, lineId) {
    this.assertKnownType(type);

    const reconciliation = await BankReconciliation.findOne({
      _id: reconciliationId,
      deletedAt: null,
    });

    if (!reconciliation) {
      throw new NotFoundError("Bank reconciliation not found");
    }

    if (reconciliation.status === "finalized") {
      throw new BadRequestError("Cannot edit a finalized bank reconciliation");
    }

    const line = reconciliation[type].id(lineId);
    if (!line) {
      throw new NotFoundError("Adjustment line not found");
    }

    // The journal entry behind a posted line is itself posted and locked.
    // Silently dropping the line here would leave that entry in the ledger
    // with nothing explaining it, so removal has to go the other way round:
    // reverse the entry in the journal module first.
    if (line.journalEntryId) {
      throw new BadRequestError(
        "This line has already been posted to the books. Reverse its journal entry first, " +
          "then remove the line.",
      );
    }

    line.deleteOne();
    await reconciliation.save();

    return await this.getReconciliationById(reconciliation._id);
  }

  /**
   * Signing off a period: check that it balances, record everything it found
   * that the books were missing, then lock it.
   *
   * The variance check runs BEFORE any posting, so a reconciliation that is
   * refused never leaves half-posted journal entries behind. `skipPosting`
   * exists for the case where the adjustments were already entered by hand
   * through the journal module.
   */
  static async finalizeReconciliation(
    reconciliationId,
    userId,
    { force = false, skipPosting = false } = {},
  ) {
    const reconciliation = await BankReconciliation.findOne({
      _id: reconciliationId,
      deletedAt: null,
    });

    if (!reconciliation) {
      throw new NotFoundError("Bank reconciliation not found");
    }

    if (reconciliation.status === "finalized") {
      throw new BadRequestError("This reconciliation is already finalized");
    }

    const bookBalance = await this.getStatementBookBalance(reconciliation);
    const breakdown = this.computeClosingBalance(reconciliation, bookBalance);
    const variance =
      breakdown.computedClosingBalance - Number(reconciliation.statementClosingBalance || 0);
    const isReconciled = Math.abs(variance) < RECONCILE_TOLERANCE;

    if (!isReconciled && !force) {
      throw new BadRequestError(
        `Reconciliation does not balance (variance: ${variance.toFixed(2)}). ` +
          "Adjust the itemized lines or the statement closing balance, or pass force to finalize anyway.",
      );
    }

    // Every pending line is checked before anything is written, and the
    // entries commit together with the lock — so a refused finalize leaves
    // neither stray journal entries nor a half-stamped reconciliation.
    const plans = skipPosting ? [] : await this.preparePendingLines(reconciliation);

    const posted = await this.inTransaction(async (session) => {
      const result = await this.postPendingLines(reconciliation, plans, userId, session);

      reconciliation.status = "finalized";
      reconciliation.approvedBy = userId;
      reconciliation.approvedAt = new Date();

      await reconciliation.save({ session });
      return result;
    });

    return {
      reconciliation: await this.getReconciliationById(reconciliation._id),
      breakdown,
      variance,
      isReconciled,
      posted,
    };
  }

  static async deleteReconciliation(reconciliationId, userId) {
    const reconciliation = await BankReconciliation.findOne({
      _id: reconciliationId,
      deletedAt: null,
    });

    if (!reconciliation) {
      throw new NotFoundError("Bank reconciliation not found");
    }

    if (reconciliation.status === "finalized") {
      throw new BadRequestError(
        "Cannot delete a finalized reconciliation. This is a historical record.",
      );
    }

    // A draft can still have posted lines behind it (someone posted a bank
    // charge, then wanted to redo the period). Those journal entries are in
    // the ledger and locked, so the reconciliation that explains them has to
    // stay too.
    const postedCount = POSTABLE_TYPES.reduce(
      (count, type) =>
        count + (reconciliation[type] || []).filter((line) => line.journalEntryId).length,
      0,
    );

    if (postedCount > 0) {
      throw new BadRequestError(
        `This reconciliation has ${postedCount} adjustment line(s) already posted to the books. ` +
          "Reverse those journal entries first.",
      );
    }

    reconciliation.deletedAt = new Date();
    reconciliation.deletedBy = userId;
    await reconciliation.save();

    return reconciliation;
  }

  // "April 30, 2026" — the long form the printed statement's headings use,
  // which is not the dd-MMM-yyyy form BankBookService.formatStatementDate
  // produces for ledger rows.
  static formatLongDate(value) {
    if (!value) return "";
    return new Date(value).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "Asia/Dhaka",
    });
  }

  // "April'26" — the footer's period tag.
  static formatPeriodTag(value) {
    if (!value) return "";
    const d = new Date(value);
    const month = d.toLocaleDateString("en-US", { month: "long", timeZone: "Asia/Dhaka" });
    const year = d.toLocaleDateString("en-US", { year: "2-digit", timeZone: "Asia/Dhaka" });
    return `${month}'${year}`;
  }

  /**
   * PDF export — a direct reproduction of AFC's paper Bank Reconciliation
   * Statement: the same bordered three-column table (Particulars, per-line
   * Amount, section-total Amount), the same six labelled sections in the same
   * Add/Deduct order, the same running subtotal between the halves, and the
   * same signature block and page footer.
   *
   * Reuses bankBook.service.js's pdfkit conventions (org logo/name via
   * SettingsService, money formatting, signature block) but owns its own
   * layout, since this is a fixed form rather than a paginated ledger.
   */
  static async exportReconciliationPdf(reconciliationId, stream) {
    const view = await this.getReconciliationView(reconciliationId);
    const orgInfo = await SettingsService.getOrgInfo({ withLogo: true });
    const { reconciliation, header, breakdown, variance, isReconciled } = view;

    const money = (value) => BankBookService.formatStatementMoney(value);
    const periodEndLabel = this.formatLongDate(reconciliation.periodEnd);

    // A posted line names the voucher that recorded it, so the signed
    // statement is its own audit trail back into the ledger. The figures are
    // unchanged either way — see getPostedAdjustmentEffect.
    const lineLabel = (entry) =>
      entry.journalEntryId?.voucherNumber
        ? `${entry.description}  [${entry.journalEntryId.voucherNumber}]`
        : entry.description;

    const doc = new PDFDocument({ margin: 40, size: "A4", bufferPages: true });
    doc.pipe(stream);

    const left = 40;
    const contentWidth = doc.page.width - left * 2;
    const bottomLimit = doc.page.height - 90;

    // Three columns: Particulars | Amount (BDT) per line | Amount (BDT) total.
    // 84pt holds the widest realistic figure at 9.5pt and leaves the
    // Particulars column wide enough for the longest section label to sit on
    // one line, as it does on the paper form.
    const colAmountWidth = 84;
    const colDetailX = left + contentWidth - colAmountWidth * 2;
    const colTotalX = left + contentWidth - colAmountWidth;

    const ROW_H = 15;
    const PAD = 4;

    let y = 0;
    let tableTop = 0;

    const line = (x1, y1, x2, y2, color = "#000000", width = 0.7) => {
      doc.save().lineWidth(width).strokeColor(color).moveTo(x1, y1).lineTo(x2, y2).stroke().restore();
    };

    // Vertical column rules are drawn per page, from where the column header
    // sits down to wherever the table stops on that page.
    const closePageRules = () => {
      line(left, tableTop, left, y);
      line(colDetailX, tableTop, colDetailX, y);
      line(colTotalX, tableTop, colTotalX, y);
      line(left + contentWidth, tableTop, left + contentWidth, y);
      line(left, y, left + contentWidth, y);
    };

    const drawColumnHeader = () => {
      doc.save().rect(left, y, contentWidth, ROW_H + 3).fill("#e9eee4").restore();
      line(left, y, left + contentWidth, y);
      doc.font("Times-Bold").fontSize(9.5).fillColor("#000000");
      doc.text("Particulars", left + PAD, y + PAD, {
        width: colDetailX - left - PAD * 2,
        align: "center",
      });
      doc.text("Amount (BDT)", colDetailX + PAD, y + PAD, {
        width: colAmountWidth - PAD * 2,
        align: "center",
      });
      doc.text("Amount (BDT)", colTotalX + PAD, y + PAD, {
        width: colAmountWidth - PAD * 2,
        align: "center",
      });
      y += ROW_H + 3;
      line(left, y, left + contentWidth, y);
      tableTop = y;
    };

    const ensureSpace = (needed = ROW_H) => {
      if (y + needed <= bottomLimit) return;
      closePageRules();
      doc.addPage();
      y = 50;
      drawColumnHeader();
    };

    /**
     * One table row. `detail` goes in the middle column, `total` in the right
     * column; either may be omitted. `align` controls the Particulars text.
     */
    const row = (
      label,
      { detail = null, total = null, bold = false, indent = 0, align = "left" } = {},
    ) => {
      const textWidth = colDetailX - left - PAD * 2 - indent;
      doc.font(bold ? "Times-Bold" : "Times-Roman").fontSize(9.5).fillColor("#000000");
      const labelHeight = label
        ? doc.heightOfString(label, { width: textWidth, align })
        : 0;
      const rowHeight = Math.max(ROW_H, labelHeight + PAD * 2 - 2);

      ensureSpace(rowHeight);

      if (label) {
        doc.text(label, left + PAD + indent, y + PAD - 1, { width: textWidth, align });
      }
      if (detail !== null) {
        doc.text(detail, colDetailX + PAD, y + PAD - 1, {
          width: colAmountWidth - PAD * 2,
          align: "right",
        });
      }
      if (total !== null) {
        doc.text(total, colTotalX + PAD, y + PAD - 1, {
          width: colAmountWidth - PAD * 2,
          align: "right",
        });
      }

      y += rowHeight;
      return y;
    };

    // ---------- Letterhead ----------
    const logoPath = orgInfo.logoImage || resolveReportLogoPath(orgInfo.orgLogo);
    // Width only — the full logo is landscape (758x564), so width 78 renders
    // ~58pt tall, comfortably above the table top set below. It was ~86pt with
    // the old portrait mark, so this header sits slightly tighter now.
    if (logoPath) {
      doc.image(logoPath, left + 18, 40, { width: 78 });
    }

    doc
      .font("Times-Bold")
      .fontSize(15)
      .fillColor("#000000")
      .text(orgInfo.orgName || "Alliance Française de Chittagong", left, 42, {
        width: contentWidth,
        align: "center",
      });
    doc
      .fontSize(10.5)
      .text("Bank Reconciliation Statement", left, 62, { width: contentWidth, align: "center" });
    doc
      .fontSize(10.5)
      .text(`For the Month Ended ${periodEndLabel}`, left, 77, {
        width: contentWidth,
        align: "center",
      });

    // ---------- Account identity block ----------
    y = 136;
    tableTop = y;

    const identityRow = (text) => {
      line(left, y, left + contentWidth, y);
      doc.font("Times-Bold").fontSize(9.5).fillColor("#000000");
      doc.text(text, left + PAD, y + PAD - 1, { width: contentWidth - PAD * 2 });
      y += ROW_H;
    };

    identityRow(
      header.accountNumber ? `A/C Number: ${header.accountNumber}` : `A/C: ${header.accountCode}`,
    );
    identityRow(header.bankName);

    // The identity rows are full-width boxes, so close their side borders
    // before the three-column table starts.
    line(left, tableTop, left, y);
    line(left + contentWidth, tableTop, left + contentWidth, y);
    line(left, y, left + contentWidth, y);

    drawColumnHeader();

    // ---------- Opening line: balance per the books ----------
    row(`Balance as per AFC Statement, ${periodEndLabel}`, {
      total: money(breakdown.bookBalance),
      bold: true,
      align: "right",
    });

    // ---------- Add ----------
    row("Add:", { bold: true });

    for (const section of ADJUSTMENT_SECTIONS.filter((s) => s.group === "add")) {
      const lines = reconciliation[section.type] || [];
      row(section.label, { bold: true });

      if (lines.length === 0) {
        row("", { detail: "-", total: "-" });
      } else {
        lines.forEach((entry, index) => {
          row(lineLabel(entry), {
            detail: money(entry.amount),
            // The category total sits on its last line, as on the paper form.
            total: index === lines.length - 1 ? money(breakdown.totals[section.type]) : null,
            bold: false,
          });
        });
      }
      row("", {});
    }

    // Running subtotal (book balance + everything added).
    line(colTotalX, y, left + contentWidth, y);
    row("", { total: money(breakdown.subTotal), bold: true });

    // ---------- Deduct ----------
    row("Deduct:", { bold: true });

    const deductSections = ADJUSTMENT_SECTIONS.filter((s) => s.group === "deduct");
    deductSections.forEach((section, sectionIndex) => {
      const lines = reconciliation[section.type] || [];
      const isLastSection = sectionIndex === deductSections.length - 1;
      row(section.label, { bold: true });

      if (lines.length === 0) {
        row("", {
          detail: "-",
          total: isLastSection ? money(breakdown.totalDeduct) : null,
        });
      } else {
        lines.forEach((entry, index) => {
          const isLastLine = index === lines.length - 1;
          row(lineLabel(entry), {
            detail: money(entry.amount),
            // Like the paper form, the Deduct half carries one combined total,
            // printed against its final line.
            total: isLastSection && isLastLine ? money(breakdown.totalDeduct) : null,
          });
        });
      }
      if (!isLastSection) row("", {});
    });

    // ---------- Closing line ----------
    line(left, y, left + contentWidth, y);
    row(`Balance as per Bank Statement, ${periodEndLabel}`, {
      total: money(breakdown.computedClosingBalance),
      bold: true,
      align: "right",
    });

    // Double rule under the final figure, as on the paper statement.
    line(colTotalX, y, left + contentWidth, y);
    line(colTotalX, y + 2, left + contentWidth, y + 2);

    closePageRules();

    // If the computed total does not land on the statement figure, the form
    // must say so — a reconciliation that silently prints a balanced-looking
    // total would be worse than no export at all.
    if (!isReconciled) {
      y += 14;
      doc
        .font("Times-Bold")
        .fontSize(9.5)
        .fillColor("#b91c1c")
        .text(
          `NOT RECONCILED — balance per bank statement entered as ${money(
            reconciliation.statementClosingBalance,
          )}; variance of ${money(Math.abs(variance))}.`,
          left,
          y,
          { width: contentWidth },
        );
      doc.fillColor("#000000");
      y += 16;
    }

    // ---------- Signature ----------
    y = Math.max(y + 55, bottomLimit - 60);
    const directorName = orgInfo.directorName || "";
    const directorTitle = orgInfo.directorTitle || "Director";
    const sigWidth = 220;
    const sigX = left + contentWidth - sigWidth;

    line(sigX + 20, y, sigX + sigWidth - 20, y, "#000000", 0.7);
    doc
      .font("Times-Bold")
      .fontSize(9.5)
      .fillColor("#000000")
      .text("Authorized Signature", sigX, y + 5, { width: sigWidth, align: "center" });
    doc.text(
      directorName ? `${directorName} (${directorTitle})` : `(${directorTitle})`,
      sigX,
      y + 19,
      { width: sigWidth, align: "center" },
    );

    // ---------- Footer on every page ----------
    const tag = this.formatPeriodTag(reconciliation.periodEnd);
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i += 1) {
      doc.switchToPage(range.start + i);
      const footerY = doc.page.height - 45;
      doc.font("Times-Roman").fontSize(8.5).fillColor("#555555");
      doc.text(`Bank Reconciliation Statement/${tag}`, left, footerY, {
        width: contentWidth / 2,
        align: "left",
      });
      doc.text(`Page ${i + 1} of ${range.count}`, left + contentWidth / 2, footerY, {
        width: contentWidth / 2,
        align: "right",
      });
    }

    doc.end();
  }
}

module.exports = BankReconciliationService;
