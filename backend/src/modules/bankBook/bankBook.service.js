const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const JournalEntry = require("../accounting/accounting.model");
const AccountingService = require("../accounting/accounting.service");
const ChartOfAccounts = require("../chartOfAccounts/coa.model");
const generateVoucherNumber = require("../../utils/generateVoucherNumber");
const { createAuditLog } = require("../../middleware/auditLog");

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const SettingsService = require("../settings/settings.service");

const SOURCE_MODULE = "student_collection";

const PAYMENT_PURPOSES = [
  "Admission Fee",
  "Exam Fee",
  "Book Purchase",
  "Other Fee",
];

const PAYMENT_METHODS = ["cheque", "bank_transfer", "bank_deposit", "card_pos"];

class BankBookService {
  static startOfDhakaDay(value) {
    const iso = String(value || "").slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      return new Date(`${iso}T00:00:00.000+06:00`);
    }

    const date = value ? new Date(value) : new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }

  static endOfDhakaDay(value) {
    const iso = String(value || "").slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      return new Date(`${iso}T23:59:59.999+06:00`);
    }

    const date = value ? new Date(value) : new Date();
    date.setHours(23, 59, 59, 999);
    return date;
  }

  static getUserId(user) {
    return user?.userId || user?.id || user?._id;
  }

  static normalizePaymentMethod(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");
  }

  static accountLabel(account) {
    if (!account) return "";
    return `${account.accountCode || ""} ${account.accountName || ""}`.trim();
  }

  static formatStatementDate(value) {
    if (!value) return "";
    return new Date(value).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Dhaka",
    });
  }

  static formatStatementMoney(value) {
    const number = Number(value || 0);
    return number.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  static formatPeriodLabel(period = {}) {
    const from = period.startDate
      ? this.formatStatementDate(period.startDate)
      : "Beginning";
    const to = period.endDate ? this.formatStatementDate(period.endDate) : "Current";
    return `${from} to ${to}`;
  }

  static getOpeningBalanceLabel(period = {}) {
    if (!period.startDate) return "Current Balance";
    return `Balance as of ${this.formatStatementDate(period.startDate)}`;
  }

  static async validateLeafAccounts(accountIds) {
    const ids = [...new Set(accountIds.filter(Boolean).map(String))];
    if (ids.length !== accountIds.length) {
      throw new Error("Bank Head and Income Head are required");
    }

    const accounts = await ChartOfAccounts.find({
      _id: { $in: ids },
      deletedAt: null,
      status: "active",
    }).lean();

    if (accounts.length !== ids.length) {
      throw new Error("Selected accounts must be active chart of accounts");
    }

    const children = await ChartOfAccounts.countDocuments({
      parentAccount: { $in: ids },
      deletedAt: null,
      status: { $ne: "archived" },
    });

    if (children > 0) {
      throw new Error("Select leaf accounts only. Parent accounts cannot be posted.");
    }

    return accounts;
  }

  static async validateStudentCollectionAccounts(bankHeadId, incomeHeadId) {
    const [bankParent, accounts] = await Promise.all([
      ChartOfAccounts.findOne({
        accountCode: "1002",
        deletedAt: null,
        status: "active",
      }).lean(),
      this.validateLeafAccounts([bankHeadId, incomeHeadId]),
    ]);

    if (!bankParent) {
      throw new Error("Bank Accounts parent account 1002 is not configured");
    }

    const accountMap = new Map(accounts.map((account) => [String(account._id), account]));
    const bankHead = accountMap.get(String(bankHeadId));
    const incomeHead = accountMap.get(String(incomeHeadId));

    if (String(bankHead?.parentAccount || "") !== String(bankParent._id)) {
      throw new Error("Bank Head must be a child account under 1002 - Bank Accounts");
    }

    const incomeType = String(incomeHead?.accountType || "").toLowerCase();
    if (!["income", "revenue"].includes(incomeType)) {
      throw new Error("Income Head must be an income or revenue account");
    }

    return { bankHead, incomeHead };
  }

  static async validateBankHead(bankHeadId) {
    const [bankParent, accounts] = await Promise.all([
      ChartOfAccounts.findOne({
        accountCode: "1002",
        deletedAt: null,
        status: "active",
      }).lean(),
      this.validateLeafAccounts([bankHeadId]),
    ]);

    if (!bankParent) {
      throw new Error("Bank Accounts parent account 1002 is not configured");
    }

    const bankHead = accounts[0];

    if (String(bankHead?.parentAccount || "") !== String(bankParent._id)) {
      throw new Error("Bank Head must be a child account under 1002 - Bank Accounts");
    }

    return bankHead;
  }

  static getAccountLine(entry, accountId) {
    return (entry.bookEntries || []).find((line) => {
      const id =
        typeof line.account === "object" && line.account !== null
          ? line.account._id
          : line.account;
      return String(id) === String(accountId);
    });
  }

  static getDebitLine(entry) {
    return (entry.bookEntries || []).find((line) => Number(line.debit || 0) > 0);
  }

  static getCreditLine(entry) {
    return (entry.bookEntries || []).find((line) => Number(line.credit || 0) > 0);
  }

  static serializeRow(entry) {
    const jsonEntry = typeof entry.toJSON === "function" ? entry.toJSON() : entry;
    const debitLine = this.getDebitLine(jsonEntry);
    const creditLine = this.getCreditLine(jsonEntry);

    return {
      journalEntryId: jsonEntry._id,
      transactionDate: jsonEntry.voucherDate,
      voucherNo: jsonEntry.voucherNumber,
      paymentPurpose: jsonEntry.bankBook?.paymentPurpose || "",
      paymentMethod: jsonEntry.bankBook?.paymentMethod || "",
      amount: Number(jsonEntry.bankBook?.amount || debitLine?.debit || creditLine?.credit || 0),
      bankHead: debitLine?.account || null,
      incomeHead: creditLine?.account || null,
      bankHeadId:
        (typeof debitLine?.account === "object" ? debitLine.account?._id : debitLine?.account),
      incomeHeadId:
        (typeof creditLine?.account === "object" ? creditLine.account?._id : creditLine?.account),
      chequeNumber: jsonEntry.bankBook?.chequeNumber || "",
      chequeDate: jsonEntry.bankBook?.chequeDate || null,
      referenceNo: jsonEntry.referenceNumber || "",
      note: jsonEntry.description || "",
      status: jsonEntry.status,
      journalStatus: jsonEntry.status,
      approvalStatus: jsonEntry.approvalStatus,
      createdBy: jsonEntry.createdBy,
      createdAt: jsonEntry.createdAt,
    };
  }

  static validateInput(input, { partial = false } = {}) {
    const paymentPurpose = String(input.paymentPurpose || "").trim();
    const paymentMethod = this.normalizePaymentMethod(input.paymentMethod);
    const amount = input.amount === undefined ? undefined : AccountingService.normalizeMoney(input.amount);
    const bankHeadId = input.bankHeadId;
    const incomeHeadId = input.incomeHeadId;

    if (!partial || input.paymentPurpose !== undefined) {
      if (!PAYMENT_PURPOSES.includes(paymentPurpose)) {
        throw new Error("Payment purpose is required");
      }
    }

    if (!partial || input.paymentMethod !== undefined) {
      if (!PAYMENT_METHODS.includes(paymentMethod)) {
        throw new Error("Payment method is required");
      }
    }

    if (!partial || input.amount !== undefined) {
      if (!amount || amount <= 0) {
        throw new Error("Amount must be greater than zero");
      }
    }

    if (!partial || input.bankHeadId !== undefined) {
      if (!bankHeadId) throw new Error("Bank Head is required");
    }

    if (!partial || input.incomeHeadId !== undefined) {
      if (!incomeHeadId) throw new Error("Income Head is required");
    }

    if (bankHeadId && incomeHeadId && String(bankHeadId) === String(incomeHeadId)) {
      throw new Error("Bank Head and Income Head cannot be the same");
    }

    if (paymentMethod === "cheque") {
      if (!input.chequeNumber) throw new Error("Cheque number is required");
      if (!input.chequeDate) throw new Error("Cheque date is required");
    }

    return {
      paymentPurpose,
      paymentMethod,
      amount,
      bankHeadId,
      incomeHeadId,
    };
  }

  static async createTransaction(input, user) {
    const userId = this.getUserId(user);
    const { paymentPurpose, paymentMethod, amount, bankHeadId, incomeHeadId } =
      this.validateInput(input);
    const note = String(input.note || "").trim();

    await this.validateStudentCollectionAccounts(bankHeadId, incomeHeadId);

    const voucherNumber = await generateVoucherNumber("SC");
    const transactionDate = this.startOfDhakaDay(input.transactionDate);
    const bookEntries = [
      {
        account: bankHeadId,
        debit: amount,
        credit: 0,
        description: note,
      },
      {
        account: incomeHeadId,
        debit: 0,
        credit: amount,
        description: note,
      },
    ];

    const entry = await AccountingService.createJournalEntry({
      voucherNumber,
      voucherDate: transactionDate,
      transactionType: "receipt",
      description: note,
      referenceNumber: input.referenceNo || input.referenceNumber || "",
      referenceType: SOURCE_MODULE,
      referenceAccount: bankHeadId,
      bookEntries,
      attachments: [],
      createdBy: userId,
      requiresApproval: input.requiresApproval === true,
      sourceModule: SOURCE_MODULE,
      bankBook: {
        paymentPurpose,
        amount,
        paymentMethod,
        chequeNumber: paymentMethod === "cheque" ? input.chequeNumber || "" : "",
        chequeDate:
          paymentMethod === "cheque" && input.chequeDate
            ? this.startOfDhakaDay(input.chequeDate)
            : null,
      },
    });

    await createAuditLog({
      action: "CREATE",
      entityType: "BankBook",
      entityId: entry._id,
      userId,
      userName: user?.name,
      userRole: user?.role,
      changes: { after: input },
      description: `Created student collection voucher ${entry.voucherNumber}`,
    });

    return entry;
  }

  static buildQuery(filters = {}) {
    const query = {
      sourceModule: SOURCE_MODULE,
      deletedAt: null,
    };

    if (filters.paymentPurpose) {
      query["bankBook.paymentPurpose"] = filters.paymentPurpose;
    }

    if (filters.paymentMethod) {
      query["bankBook.paymentMethod"] = this.normalizePaymentMethod(filters.paymentMethod);
    }

    if (filters.bankHeadId) {
      query["bookEntries.account"] = filters.bankHeadId;
    }

    if (filters.incomeHeadId) {
      query["bookEntries.account"] = filters.incomeHeadId;
    }

    if (filters.accountId) {
      query["bookEntries.account"] = filters.accountId;
    }

    if (filters.voucherNo) {
      query.voucherNumber = { $regex: escapeRegex(String(filters.voucherNo).slice(0, 100)), $options: "i" };
    }

    if (filters.referenceNo) {
      query.referenceNumber = { $regex: escapeRegex(String(filters.referenceNo).slice(0, 100)), $options: "i" };
    }

    if (filters.dateFrom || filters.dateTo) {
      query.voucherDate = {};
      if (filters.dateFrom) query.voucherDate.$gte = this.startOfDhakaDay(filters.dateFrom);
      if (filters.dateTo) query.voucherDate.$lte = this.endOfDhakaDay(filters.dateTo);
    }

    return query;
  }

  static async getRows(filters = {}, { paginate = true } = {}) {
    const page = Math.max(1, parseInt(filters.page, 10) || 1);
    const limit = Math.min(500, Math.max(1, parseInt(filters.limit, 10) || 20));
    const skip = (page - 1) * limit;
    const query = this.buildQuery(filters);
    const findQuery = JournalEntry.find(query)
      .populate("createdBy", "name email")
      .populate("bookEntries.account", "accountCode accountName accountType")
      .sort({ voucherDate: -1, createdAt: -1, _id: -1 });

    if (paginate) {
      findQuery.skip(skip).limit(limit);
    }

    const [entries, total] = await Promise.all([
      findQuery,
      JournalEntry.countDocuments(query),
    ]);

    return {
      data: entries.map((entry) => this.serializeRow(entry)),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  static async listTransactions(filters = {}) {
    return this.getRows(filters, { paginate: true });
  }

  static async getTransaction(id) {
    const entry = await JournalEntry.findOne({
      _id: id,
      sourceModule: SOURCE_MODULE,
      deletedAt: null,
    })
      .populate("createdBy", "name email")
      .populate("bookEntries.account", "accountCode accountName accountType");

    if (!entry) return null;

    return {
      ...entry.toJSON(),
      bankBookRow: this.serializeRow(entry),
    };
  }

  static async updateTransaction(id, input, user) {
    const entry = await JournalEntry.findOne({
      _id: id,
      sourceModule: SOURCE_MODULE,
      deletedAt: null,
    });

    if (!entry) throw new Error("Student collection not found");
    if (entry.status === "posted") {
      throw new Error("Posted student collections cannot be edited. Cancel/reverse it instead.");
    }

    const current = {
      paymentPurpose: entry.bankBook.paymentPurpose,
      paymentMethod: entry.bankBook.paymentMethod,
      amount: entry.bankBook.amount,
      bankHeadId: this.getDebitLine(entry.toJSON())?.account,
      incomeHeadId: this.getCreditLine(entry.toJSON())?.account,
      chequeNumber: entry.bankBook.chequeNumber,
      chequeDate: entry.bankBook.chequeDate,
      ...input,
    };
    const { paymentPurpose, paymentMethod, amount, bankHeadId, incomeHeadId } =
      this.validateInput(current, { partial: false });
    const note = String(input.note ?? entry.description ?? "").trim();

    await this.validateStudentCollectionAccounts(bankHeadId, incomeHeadId);

    const updated = await AccountingService.updateEntry(id, {
      voucherDate: input.transactionDate
        ? this.startOfDhakaDay(input.transactionDate)
        : entry.voucherDate,
      transactionType: "receipt",
      description: note,
      referenceNumber: input.referenceNo || input.referenceNumber || entry.referenceNumber,
      referenceAccount: bankHeadId,
      bookEntries: [
        { account: bankHeadId, debit: amount, credit: 0, description: note },
        { account: incomeHeadId, debit: 0, credit: amount, description: note },
      ],
      bankBook: {
        paymentPurpose,
        amount,
        paymentMethod,
        chequeNumber: paymentMethod === "cheque" ? current.chequeNumber || "" : "",
        chequeDate:
          paymentMethod === "cheque" && current.chequeDate
            ? this.startOfDhakaDay(current.chequeDate)
            : null,
      },
    });

    await createAuditLog({
      action: "UPDATE",
      entityType: "BankBook",
      entityId: id,
      userId: this.getUserId(user),
      userName: user?.name,
      userRole: user?.role,
      changes: { before: entry.toJSON(), after: input },
      description: `Updated student collection voucher ${updated.voucherNumber}`,
    });

    return updated;
  }

  static async cancelTransaction(id, user, reason = "") {
    const userId = this.getUserId(user);
    const mongoose = require("mongoose");
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const entry = await JournalEntry.findOne({
        _id: id,
        sourceModule: SOURCE_MODULE,
        deletedAt: null,
      }).session(session);

      if (!entry) throw new Error("Student collection not found");
      if (["deleted", "reversed"].includes(entry.status)) {
        throw new Error("Student collection is already cancelled");
      }

      if (entry.status !== "posted") {
        entry.status = "deleted";
        entry.deletedAt = new Date();
        entry.deletedBy = userId;
        await entry.save({ session });
        await session.commitTransaction();
        return entry.toJSON();
      }

      const reversalBookEntries = entry.bookEntries.map((line) => ({
        account: line.account,
        debit: line.credit,
        credit: line.debit,
        description: `Reversal of ${entry.voucherNumber}. ${reason}`.trim(),
      }));

      // Create reversal draft within the same session (requiresApproval: true so
      // auto-approve does not run inside the open session)
      const reversalData = await AccountingService.createJournalEntry({
        voucherNumber: await generateVoucherNumber("SCR"),
        voucherDate: new Date(),
        transactionType: "receipt",
        description: `Cancellation reversal for ${entry.voucherNumber}. ${reason}`.trim(),
        referenceNumber: entry.voucherNumber,
        referenceType: `${SOURCE_MODULE}_reversal`,
        referenceAccount: entry.referenceAccount,
        bookEntries: reversalBookEntries,
        createdBy: userId,
        requiresApproval: true,
        sourceModule: SOURCE_MODULE,
        bankBook: { ...entry.bankBook.toObject() },
      }, { session });

      entry.status = "reversed";
      await entry.save({ session });

      await session.commitTransaction();

      // Approve the reversal outside the session so COA balances are updated
      const reversal = await AccountingService.approveEntry(reversalData._id, userId);

      // Best-effort audit log — already non-throwing internally
      createAuditLog({
        action: "DELETE",
        entityType: "BankBook",
        entityId: id,
        userId,
        userName: user?.name,
        userRole: user?.role,
        description: `Cancelled student collection voucher ${entry.voucherNumber}`,
      });

      return { original: entry.toJSON(), reversal };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  static async getStatement(filters = {}) {
    const bankHeadId = filters.bankHeadId || filters.accountId;

    if (!bankHeadId) {
      throw new Error("Bank Head is required for bank statement");
    }

    const bankHead = await this.validateBankHead(bankHeadId);
    const startDate = filters.dateFrom || filters.startDate;
    const endDate = filters.dateTo || filters.endDate;

    const baseQuery = {
      "bookEntries.account": bankHeadId,
      status: "posted",
      approvalStatus: "approved",
      deletedAt: null,
    };

    const openingQuery = { ...baseQuery };
    if (startDate) {
      openingQuery.voucherDate = { $lte: this.endOfDhakaDay(startDate) };
    } else {
      openingQuery._id = null;
    }

    const periodQuery = { ...baseQuery };

    if (startDate || endDate) {
      periodQuery.voucherDate = {};
      if (startDate) periodQuery.voucherDate.$gt = this.endOfDhakaDay(startDate);
      if (endDate) periodQuery.voucherDate.$lte = this.endOfDhakaDay(endDate);
    }

    if (filters.paymentPurpose) {
      periodQuery["bankBook.paymentPurpose"] = filters.paymentPurpose;
    }

    if (filters.paymentMethod) {
      periodQuery["bankBook.paymentMethod"] = this.normalizePaymentMethod(filters.paymentMethod);
    }

    if (filters.voucherNo) {
      periodQuery.voucherNumber = { $regex: filters.voucherNo, $options: "i" };
    }

    if (filters.referenceNo) {
      periodQuery.referenceNumber = { $regex: filters.referenceNo, $options: "i" };
    }

    const [openingEntries, periodEntries] = await Promise.all([
      JournalEntry.find(openingQuery).sort({ voucherDate: 1, createdAt: 1, _id: 1 }),
      JournalEntry.find(periodQuery)
        .populate("createdBy", "name email")
        .populate("bookEntries.account", "accountCode accountName accountType")
        .sort({ voucherDate: 1, createdAt: 1, _id: 1 }),
    ]);

    const openingBalance = openingEntries.reduce((balance, entry) => {
      const line = this.getAccountLine(entry.toJSON(), bankHeadId);
      return balance + Number(line?.debit || 0) - Number(line?.credit || 0);
    }, 0);

    let runningBalance = openingBalance;
    let totalDeposits = 0;
    let totalPayments = 0;

    const rows = periodEntries.map((entry) => {
      const jsonEntry = entry.toJSON();
      const bankLine = this.getAccountLine(jsonEntry, bankHeadId);
      const deposit = Number(bankLine?.debit || 0);
      const payment = Number(bankLine?.credit || 0);

      totalDeposits += deposit;
      totalPayments += payment;
      runningBalance += deposit - payment;

      return {
        journalEntryId: jsonEntry._id,
        transactionDate: jsonEntry.voucherDate,
        voucherNo: jsonEntry.voucherNumber,
        transactionDetails:
          jsonEntry.bankBook?.paymentPurpose ||
          jsonEntry.description ||
          jsonEntry.referenceNumber ||
          jsonEntry.transactionType ||
          "Journal transaction",
        paymentPurpose: jsonEntry.bankBook?.paymentPurpose || "",
        paymentMethod: jsonEntry.bankBook?.paymentMethod || "",
        chequeNumber: jsonEntry.bankBook?.chequeNumber || "",
        deposit,
        payment,
        amount: deposit || payment,
        balance: runningBalance,
        runningBalance,
        referenceNo: jsonEntry.referenceNumber || "",
        note: jsonEntry.description || "",
        remarks: jsonEntry.description || jsonEntry.referenceNumber || "",
        status: jsonEntry.bankBook?.status || jsonEntry.status,
        journalStatus: jsonEntry.status,
        approvalStatus: jsonEntry.approvalStatus,
        createdBy: jsonEntry.createdBy,
      };
    });

    return {
      account: {
        _id: bankHead._id,
        accountCode: bankHead.accountCode,
        accountName: bankHead.accountName,
        accountType: bankHead.accountType,
      },
      period: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
      openingBalance,
      totalDeposits,
      totalPayments,
      closingBalance: openingBalance + totalDeposits - totalPayments,
      rows,
    };
  }

  static toCsv(rows) {
    const headers = [
      "Date",
      "Transaction Details",
      "Cheque Number",
      "Deposit",
      "Payment / Withdrawal",
      "Balance",
      "Remarks / Note",
    ];

    const escape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    return [
      headers.map(escape).join(","),
      ...rows.map((row) =>
        [
          row.transactionDate ? new Date(row.transactionDate).toISOString().slice(0, 10) : "",
          row.transactionDetails,
          row.chequeNumber,
          row.deposit || 0,
          row.payment || 0,
          row.balance ?? row.runningBalance ?? 0,
          row.remarks || row.note || "",
        ]
          .map(escape)
          .join(","),
      ),
    ].join("\n");
  }

  static async exportStatementCsv(filters) {
    const result = await this.getStatement(filters);
    return {
      filename: `bank-statement-${Date.now()}.csv`,
      content: this.toCsv(result.rows),
    };
  }

  static toExcelHtml(statement, orgInfo = {}) {
    const escape = (value) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

    const money = (value) => this.formatStatementMoney(value);
    const movementMoney = (value) => (Number(value || 0) ? money(value) : "");
    const rows = statement.rows
      .map(
        (row) => `
          <tr>
            <td>${escape(this.formatStatementDate(row.transactionDate))}</td>
            <td>${escape(row.transactionDetails)}</td>
            <td>${escape(row.chequeNumber)}</td>
            <td style="text-align:right">${movementMoney(row.deposit)}</td>
            <td style="text-align:right">${movementMoney(row.payment)}</td>
            <td style="text-align:right">${money(row.balance ?? row.runningBalance)}</td>
            <td>${escape(row.referenceNo || "")}</td>
            <td>${escape(row.note || "")}</td>
          </tr>`,
      )
      .join("");

    return `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: "Times New Roman", serif; }
            table { border-collapse: collapse; width: 100%; font-size: 11px; }
            th, td { border: 1px solid #777; padding: 5px; vertical-align: top; }
            th { background: #ecf3df; }
            .center { text-align: center; }
          </style>
        </head>
        <body>
          <h2 class="center">${escape(orgInfo.orgName || "Alliance Francaise de Chittagong")}</h2>
          <h3 class="center">Statement of Account</h3>
          <p><strong>Bank Account:</strong> ${escape(this.accountLabel(statement.account))}</p>
          <p><strong>Period:</strong> ${escape(this.formatPeriodLabel(statement.period))}</p>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Transaction Details</th>
                <th>Cheque Number</th>
                <th>Deposit</th>
                <th>Payment / Withdrawal</th>
                <th>Balance</th>
                <th>Remarks</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${escape(this.formatStatementDate(statement.period.startDate))}</td>
                <td><strong>${escape(this.getOpeningBalanceLabel(statement.period))}</strong></td>
                <td></td>
                <td></td>
                <td></td>
                <td style="text-align:right"><strong>${money(statement.openingBalance)}</strong></td>
                <td>As per System</td>
                <td></td>
              </tr>
              ${rows}
              <tr>
                <td>${escape(this.formatStatementDate(statement.period.endDate))}</td>
                <td><strong>CLOSING BALANCE</strong></td>
                <td></td>
                <td></td>
                <td></td>
                <td style="text-align:right"><strong>${money(statement.closingBalance)}</strong></td>
                <td></td>
                <td></td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <th colspan="3">Total</th>
                <th style="text-align:right">${money(statement.totalDeposits)}</th>
                <th style="text-align:right">${money(statement.totalPayments)}</th>
                <th style="text-align:right">${money(statement.closingBalance)}</th>
                <th colspan="2"></th>
              </tr>
            </tfoot>
          </table>
          <br />
          <table style="width:45%; margin-left:70px;">
            <tr>
              <td><strong>Total Deposits</strong></td>
              <td style="text-align:right"><strong>${money(statement.totalDeposits)}</strong></td>
            </tr>
            <tr>
              <td><strong>Total Payments</strong></td>
              <td style="text-align:right"><strong>${money(statement.totalPayments)}</strong></td>
            </tr>
          </table>
          <br />
          <table>
            <tr>
              <td style="border:0">Checked By: ____________________</td>
              <td style="border:0">Approved By: ____________________</td>
            </tr>
          </table>
        </body>
      </html>`;
  }

  static async exportStatementExcel(filters) {
    const [statement, orgInfo] = await Promise.all([
      this.getStatement(filters),
      SettingsService.getOrgInfo(),
    ]);
    return {
      filename: `bank-statement-${Date.now()}.xls`,
      content: this.toExcelHtml(statement, orgInfo),
    };
  }

  static async exportStatementPdf(filters, stream) {
    const [statement, orgInfo] = await Promise.all([
      this.getStatement(filters),
      SettingsService.getOrgInfo(),
    ]);
    const doc = new PDFDocument({
      margin: 42,
      size: "A4",
      layout: "landscape",
      bufferPages: true,
    });
    doc.pipe(stream);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const left = 50;
    const top = 42;
    const bottom = 48;
    const tableWidth = pageWidth - left * 2;
    const columns = [
      { key: "date", label: "Date", x: left, width: 70, align: "left" },
      { key: "details", label: "Transaction Details", x: left + 70, width: 150, align: "left" },
      { key: "cheque", label: "Cheque\nNumber", x: left + 220, width: 70, align: "center" },
      { key: "deposit", label: "Deposit", x: left + 290, width: 80, align: "right" },
      { key: "payment", label: "Payment/\nWithdrawal", x: left + 370, width: 86, align: "right" },
      { key: "balance", label: "Balance", x: left + 456, width: 92, align: "right" },
      { key: "remarks", label: "Remarks", x: left + 548, width: 118, align: "left" },
      { key: "note", label: "Note", x: left + 666, width: tableWidth - 666, align: "left" },
    ];
    const rowHeight = 20;
    const headerHeight = 30;
    const money = (value) => this.formatStatementMoney(value);
    const movementMoney = (value) => (Number(value || 0) ? money(value) : "");

    const drawHeader = () => {
      const defaultLogoPath = path.resolve(__dirname, "../../../../frontend/public/afc-logo.jpg");
      const logoPath = (orgInfo.orgLogo && fs.existsSync(orgInfo.orgLogo))
        ? orgInfo.orgLogo
        : defaultLogoPath;
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, left, top - 8, { width: 88 });
      }

      doc
        .font("Times-Bold")
        .fontSize(16)
        .text(orgInfo.orgName || "Alliance Francaise de Chittagong", left, top + 4, {
          width: tableWidth,
          align: "center",
        });
      doc
        .fontSize(13)
        .text("Statement of Account", left, top + 27, {
          width: tableWidth,
          align: "center",
        });
      doc
        .font("Times-Roman")
        .fontSize(10)
        .text(`Period: ${this.formatPeriodLabel(statement.period)}`, left, top + 52, {
          width: tableWidth,
          align: "center",
        });
      doc
        .font("Times-Bold")
        .fontSize(10)
        .text(`A/C Number: ${statement.account.accountNumber || statement.account.accountCode || ""}`, left, top + 78);
      doc
        .font("Times-Bold")
        .fontSize(10)
        .text(statement.account.accountName || "Bank Account", left, top + 94);
    };

    const drawTableHeader = (y) => {
      doc.save();
      doc.rect(left, y, tableWidth, headerHeight).fill("#ecf3df");
      doc.restore();
      doc.rect(left, y, tableWidth, headerHeight).stroke("#9ca3af");
      columns.forEach((column) => {
        doc.rect(column.x, y, column.width, headerHeight).stroke("#9ca3af");
        doc
          .font("Times-Bold")
          .fontSize(9)
          .fillColor("#111827")
          .text(column.label, column.x + 4, y + 8, {
            width: column.width - 8,
            align: column.align,
          });
      });
    };

    const drawRow = (y, values, { bold = false } = {}) => {
      columns.forEach((column) => {
        doc.rect(column.x, y, column.width, rowHeight).stroke("#d1d5db");
        doc
          .font(bold ? "Times-Bold" : "Times-Roman")
          .fontSize(8.5)
          .fillColor("#111827")
          .text(values[column.key] ?? "", column.x + 4, y + 5, {
            width: column.width - 8,
            align: column.align,
            lineBreak: false,
          });
      });
    };

    drawHeader();
    let y = top + 124;
    drawTableHeader(y);
    y += headerHeight;
    drawRow(
      y,
      {
        date: this.formatStatementDate(statement.period.startDate),
        details: this.getOpeningBalanceLabel(statement.period),
        balance: money(statement.openingBalance),
        remarks: "As per System",
      },
      { bold: true },
    );
    y += rowHeight;

    const addPage = () => {
      doc.addPage();
      drawHeader();
      y = top + 124;
      drawTableHeader(y);
      y += headerHeight;
    };

    statement.rows.forEach((row) => {
      if (y + rowHeight > pageHeight - bottom) {
        addPage();
      }

      drawRow(y, {
        date: this.formatStatementDate(row.transactionDate),
        details: row.transactionDetails || "",
        cheque: row.chequeNumber || "",
        deposit: movementMoney(row.deposit),
        payment: movementMoney(row.payment),
        balance: money(row.balance ?? row.runningBalance),
        remarks: row.referenceNo || "",
        note: row.note || "",
      });
      y += rowHeight;
    });

    if (y + rowHeight * 6 > pageHeight - bottom) {
      addPage();
    }

    drawRow(
      y,
      {
        date: this.formatStatementDate(statement.period.endDate),
        details: "CLOSING BALANCE",
        balance: money(statement.closingBalance),
      },
      { bold: true },
    );
    y += rowHeight + 10;

    const totalBoxX = left + 70;
    const totalBoxW = 320;
    const totalLabelW = 210;
    const totalValueW = totalBoxW - totalLabelW;
    [
      ["Total Deposits", money(statement.totalDeposits)],
      ["Total Payments", money(statement.totalPayments)],
    ].forEach(([label, value], index) => {
      const rowY = y + index * rowHeight;
      doc.rect(totalBoxX, rowY, totalLabelW, rowHeight).stroke("#9ca3af");
      doc.rect(totalBoxX + totalLabelW, rowY, totalValueW, rowHeight).stroke("#9ca3af");
      doc.font("Times-Bold").fontSize(10).text(label, totalBoxX + 6, rowY + 6, {
        width: totalLabelW - 12,
      });
      doc.text(value, totalBoxX + totalLabelW + 6, rowY + 6, {
        width: totalValueW - 12,
        align: "right",
      });
    });
    y += rowHeight * 2 + 18;
    doc.text("Checked & Approved", left + 540, y);
    y += 54;
    doc.font("Times-Roman").text("Signature", left + 560, y);

    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i += 1) {
      doc.switchToPage(i);
      const footerY = pageHeight - 60;
      doc
        .font("Times-Roman")
        .fontSize(8)
        .fillColor("#111827")
        .text("AFC/Statement_of_Account", left, footerY, { lineBreak: false });
      doc.text(`Page ${i + 1} of ${range.count}`, pageWidth - 120, footerY, {
        width: 70,
        align: "right",
        lineBreak: false,
      });
    }

    doc.end();
  }
}

module.exports = BankBookService;
