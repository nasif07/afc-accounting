const ChartOfAccounts = require("./coa.model");
const JournalEntry = require("../accounting/accounting.model");

const OPENING_BALANCE_EQUITY_CODE = "3201";
const OPENING_BALANCE_SOURCE = "OPENING_BALANCE";

class COAService {
  static async hasRealChildren(accountId) {
    return !!(await ChartOfAccounts.exists({
      parentAccount: accountId,
      deletedAt: null,
    }));
  }

  static async hasRealTransactions(accountId) {
    return !!(await JournalEntry.exists({
      "bookEntries.account": accountId,
      deletedAt: null,
      status: "posted",
      approvalStatus: "approved",
    }));
  }

  // Like hasRealTransactions, but excludes the account's own system-managed
  // opening-balance journal. Used to gate opening-balance edits specifically:
  // an account's own opening entry shouldn't lock out further corrections to
  // that same opening balance, only genuine business activity should.
  static async hasNonOpeningTransactions(accountId) {
    return !!(await JournalEntry.exists({
      "bookEntries.account": accountId,
      deletedAt: null,
      status: "posted",
      approvalStatus: "approved",
      sourceModule: { $ne: OPENING_BALANCE_SOURCE },
    }));
  }

  static isDebitOpeningAccount(accountType) {
    return ["asset", "expense"].includes(String(accountType).toLowerCase());
  }

  static async getOrCreateOpeningBalanceEquity(createdBy) {
    let account = await ChartOfAccounts.findOne({
      accountCode: OPENING_BALANCE_EQUITY_CODE,
      deletedAt: null,
    });

    if (account) return account;

    account = new ChartOfAccounts({
      accountCode: OPENING_BALANCE_EQUITY_CODE,
      accountName: "Opening Balance Equity",
      accountType: "equity",
      description: "System account for opening balance journals",
      openingBalance: 0,
      openingBalanceType: "credit",
      normalBalance: "credit",
      currentBalance: 0,
      currentBalanceType: "credit",
      status: "active",
      isSystem: true,
      isSystemAccount: true,
      createdBy: createdBy || null,
    });

    await account.save();
    return account;
  }

  static getOpeningBalanceJournalQuery(accountId) {
    return {
      deletedAt: null,
      status: "posted",
      approvalStatus: "approved",
      $or: [
        {
          sourceModule: OPENING_BALANCE_SOURCE,
          referenceType: OPENING_BALANCE_SOURCE,
          referenceAccount: accountId,
        },
        {
          sourceModule: OPENING_BALANCE_SOURCE,
          referenceNumber: `OB-${accountId}`,
        },
      ],
    };
  }

  static async getOpeningBalanceJournals(accountId) {
    return await JournalEntry.find(this.getOpeningBalanceJournalQuery(accountId))
      .sort({ voucherDate: 1, createdAt: 1, _id: 1 });
  }

  static async hasOpeningBalanceJournal(accountId) {
    return !!(await JournalEntry.exists(
      this.getOpeningBalanceJournalQuery(accountId),
    ));
  }

  static async deduplicateOpeningBalanceJournals(accountId, userId) {
    const journals = await this.getOpeningBalanceJournals(accountId);

    if (journals.length <= 1) {
      return journals[0] || null;
    }

    const [keeper, ...duplicates] = journals;
    const duplicateIds = duplicates.map((journal) => journal._id);
    const affectedAccountIds = [
      ...new Set(
        journals.flatMap((journal) =>
          (journal.bookEntries || []).map((line) => line.account.toString()),
        ),
      ),
    ];

    await JournalEntry.updateMany(
      { _id: { $in: duplicateIds } },
      {
        $set: {
          status: "deleted",
          deletedAt: new Date(),
          deletedBy: userId || null,
        },
      },
    );

    for (const affectedAccountId of affectedAccountIds) {
      await this.recalculateCurrentBalanceFromJournals(affectedAccountId);
    }

    return keeper;
  }

  static async resetCurrentBalanceForOpeningJournal(account) {
    account.currentBalance = 0;
    account.currentBalanceType = this.isDebitOpeningAccount(account.accountType)
      ? "debit"
      : "credit";
    account.hasTransactions = false;
    await account.save();
  }

  static async recalculateCurrentBalanceFromJournals(accountId, session = null) {
    const accountQuery = ChartOfAccounts.findById(accountId);
    if (session) accountQuery.session(session);

    const account = await accountQuery;

    if (!account) {
      throw new Error("Account not found");
    }

    const openingJournalQuery = JournalEntry.exists({
      "bookEntries.account": accountId,
      sourceModule: OPENING_BALANCE_SOURCE,
      status: "posted",
      approvalStatus: "approved",
      deletedAt: null,
    });

    if (session) openingJournalQuery.session(session);

    const hasApprovedOpeningJournal = !!(await openingJournalQuery);

    const baseBalance = hasApprovedOpeningJournal
      ? 0
      : Number(account.openingBalance || 0);
    const openingType = account.openingBalanceType || "debit";
    const isDebitNature = this.isDebitOpeningAccount(account.accountType);
    let signedBalance =
      openingType === "credit" ? -baseBalance : baseBalance;

    if (!isDebitNature) {
      signedBalance = openingType === "debit" ? -baseBalance : baseBalance;
    }

    const entriesQuery = JournalEntry.find({
      "bookEntries.account": accountId,
      status: "posted",
      approvalStatus: "approved",
      deletedAt: null,
    });

    if (session) entriesQuery.session(session);

    const entries = await entriesQuery;

    for (const entry of entries) {
      const jsonEntry = entry.toJSON();

      for (const line of jsonEntry.bookEntries || []) {
        const lineAccountId =
          typeof line.account === "object" && line.account !== null
            ? line.account._id?.toString()
            : line.account?.toString();

        if (lineAccountId !== accountId.toString()) continue;

        const debit = Number(line.debit || 0);
        const credit = Number(line.credit || 0);
        signedBalance += isDebitNature ? debit - credit : credit - debit;
      }
    }

    account.currentBalance = Math.abs(signedBalance);
    account.currentBalanceType = isDebitNature
      ? signedBalance >= 0
        ? "debit"
        : "credit"
      : signedBalance >= 0
        ? "credit"
        : "debit";
    account.hasTransactions = entries.length > 0;

    await account.save({ session });

    return account;
  }

  static async createOpeningBalanceJournal(account, createdBy) {
    const amount = Number(account.openingBalance || 0);

    if (!amount || amount <= 0) return null;

    const existingOpeningJournal = await this.deduplicateOpeningBalanceJournals(
      account._id,
      createdBy,
    );

    if (existingOpeningJournal) {
      return existingOpeningJournal.toJSON
        ? existingOpeningJournal.toJSON()
        : existingOpeningJournal;
    }

    const openingBalanceEquity =
      await this.getOrCreateOpeningBalanceEquity(createdBy);

    if (String(openingBalanceEquity._id) === String(account._id)) {
      return null;
    }

    await this.resetCurrentBalanceForOpeningJournal(account);

    const debitCreatedAccount = this.isDebitOpeningAccount(account.accountType);
    const bookEntries = debitCreatedAccount
      ? [
          {
            account: account._id,
            debit: amount,
            credit: 0,
            description: "Opening balance",
          },
          {
            account: openingBalanceEquity._id,
            debit: 0,
            credit: amount,
            description: `Opening balance for ${account.accountCode} - ${account.accountName}`,
          },
        ]
      : [
          {
            account: openingBalanceEquity._id,
            debit: amount,
            credit: 0,
            description: `Opening balance for ${account.accountCode} - ${account.accountName}`,
          },
          {
            account: account._id,
            debit: 0,
            credit: amount,
            description: "Opening balance",
          },
        ];

    const [journal] = await JournalEntry.create([
      {
        voucherDate: account.openingDate || new Date(),
        transactionType: "journal-entry",
        sourceModule: OPENING_BALANCE_SOURCE,
        referenceType: OPENING_BALANCE_SOURCE,
        referenceAccount: account._id,
        requiresApproval: false,
        approvalStatus: "approved",
        status: "posted",
        isLocked: true,
        approvedBy: createdBy || null,
        approvalDate: new Date(),
        description: `Opening Balance: ${account.accountCode} - ${account.accountName}`,
        referenceNumber: `OB-${account._id}`,
        bookEntries,
        createdBy: createdBy || account.createdBy,
      },
    ]);

    const affectedAccountIds = [
      ...new Set(bookEntries.map((line) => line.account.toString())),
    ];

    for (const affectedAccountId of affectedAccountIds) {
      await this.recalculateCurrentBalanceFromJournals(affectedAccountId);
    }

    return journal.toJSON();
  }

  /**
   * Replace an account's opening-balance journal with one reflecting its
   * current openingBalance/openingBalanceType/openingDate fields, instead
   * of overwriting currentBalance directly on the account document.
   *
   * A bare field overwrite (the old behavior) was only ever visible to COA
   * itself — Petty Cash, trial balance, the general ledger view, and every
   * other consumer that derives its numbers from JournalEntry never saw the
   * change, and the Opening Balance Equity account was left unbalanced
   * against it. Routing edits through the same journal-write path account
   * creation already uses means every one of those readers picks up the
   * change automatically, with no special-casing.
   *
   * `account` must already have the new openingBalance/openingBalanceType/
   * openingDate values assigned (and saved) — this only handles retiring
   * the old journal and posting the new one.
   */
  static async setOpeningBalance(account, updatedBy) {
    const existingJournals = await this.getOpeningBalanceJournals(account._id);
    const affectedAccountIds = new Set([account._id.toString()]);

    existingJournals.forEach((journal) => {
      (journal.bookEntries || []).forEach((line) =>
        affectedAccountIds.add(line.account.toString()),
      );
    });

    if (existingJournals.length > 0) {
      await JournalEntry.updateMany(
        { _id: { $in: existingJournals.map((journal) => journal._id) } },
        {
          $set: {
            status: "deleted",
            deletedAt: new Date(),
            deletedBy: updatedBy || null,
          },
        },
      );
    }

    // createOpeningBalanceJournal re-checks for an existing journal first
    // (deduplicateOpeningBalanceJournals) — since we just retired every one
    // above, it will always proceed to post a fresh entry when amount > 0,
    // or do nothing when the opening balance was cleared to 0.
    const newJournal = await this.createOpeningBalanceJournal(account, updatedBy);

    if (newJournal) {
      (newJournal.bookEntries || []).forEach((line) =>
        affectedAccountIds.add(String(line.account?._id || line.account)),
      );
    }

    for (const accountId of affectedAccountIds) {
      await this.recalculateCurrentBalanceFromJournals(accountId);
    }
  }

  /**
   * Check if setting parentAccount would create a circular reference
   * @param {ObjectId|string} accountId
   * @param {ObjectId|string|null} newParentId
   * @returns {Promise<boolean>}
   */
  static async wouldCreateCircularReference(accountId, newParentId) {
    if (!newParentId) return false;
    if (accountId.toString() === newParentId.toString()) return true;

    let currentParent = newParentId;
    const visited = new Set();

    while (currentParent) {
      const currentParentId = currentParent.toString();

      if (visited.has(currentParentId)) {
        return true;
      }

      if (currentParentId === accountId.toString()) {
        return true;
      }

      visited.add(currentParentId);

      const parent = await ChartOfAccounts.findById(currentParent, {
        parentAccount: 1,
      }).lean();

      currentParent = parent?.parentAccount || null;
    }

    return false;
  }

  static async createAccount(accountData) {
    const normalizedOpeningBalance = Number(accountData.openingBalance || 0);
    const normalizedOpeningBalanceType =
      accountData.openingBalanceType || "debit";

    const account = new ChartOfAccounts({
      ...accountData,
      openingBalance: normalizedOpeningBalance,
      openingBalanceType: normalizedOpeningBalanceType,
      currentBalance: normalizedOpeningBalance,
      currentBalanceType: normalizedOpeningBalanceType,
      openingDate: accountData.openingDate || new Date(),
    });

    await account.save();

    await this.createOpeningBalanceJournal(account, accountData.createdBy);

    return await ChartOfAccounts.findById(account._id)
      .populate("createdBy", "name email")
      .populate("parentAccount", "accountCode accountName accountType status");
  }

  /**
   * Get all accounts with optional filtering
   */
  static async getAllAccounts(filters = {}) {
    const query = {};

    if (filters.includeDeleted) {
      query.includeDeleted = true;
    }

    if (filters.status && filters.status !== "all") {
      query.status = filters.status;
    }

    if (filters.accountType) {
      query.accountType = filters.accountType;
    }

    let accounts = await ChartOfAccounts.find(query)
      .populate("createdBy", "name email")
      .populate("parentAccount", "accountCode accountName accountType status")
      .sort({ accountCode: 1 });

    if (filters.leafNodesOnly) {
      const parentAccounts = await ChartOfAccounts.distinct("parentAccount", {
        parentAccount: { $ne: null },
        deletedAt: null,
      });

      accounts = accounts.filter(
        (account) =>
          !parentAccounts.some(
            (parentId) => parentId.toString() === account._id.toString(),
          ),
      );
    }

    return accounts;
  }

  static async getAccountById(accountId) {
    return await ChartOfAccounts.findById(accountId)
      .populate("createdBy", "name email")
      .populate("deletedBy", "name email")
      .populate("parentAccount", "accountCode accountName accountType status");
  }

  /**
   * Update account with validation for circular references
   */
  static async updateAccount(accountId, updateData, userId) {
    const account = await ChartOfAccounts.findById(accountId);

    if (!account) {
      throw new Error("Account not found");
    }

    if (account.status === "archived") {
      throw new Error("Archived account cannot be updated");
    }

    const hasTransactions = await this.hasRealTransactions(accountId);
    const hasChildren = await this.hasRealChildren(accountId);

    if (
      updateData.accountType &&
      updateData.accountType !== account.accountType
    ) {
      if (hasTransactions) {
        throw new Error(
          "Cannot change account type of an account with transactions",
        );
      }

      if (hasChildren) {
        throw new Error("Cannot change account type of a parent account");
      }
    }

    if (
      updateData.parentAccount !== undefined &&
      String(updateData.parentAccount || "") !==
        String(account.parentAccount || "")
    ) {
      if (hasTransactions) {
        throw new Error("Cannot change parent of an account with transactions");
      }

      const wouldBeCircular = await this.wouldCreateCircularReference(
        accountId,
        updateData.parentAccount,
      );

      if (wouldBeCircular) {
        throw new Error(
          "Cannot set parent account: would create a circular reference in the account hierarchy",
        );
      }

      if (updateData.parentAccount) {
        const parent = await ChartOfAccounts.findById(updateData.parentAccount);

        if (!parent) {
          throw new Error("Parent account not found");
        }

        if (parent.deletedAt) {
          throw new Error("Deleted account cannot be used as parent");
        }

        if (parent.status !== "active") {
          throw new Error(
            "Only active accounts can be used as parent accounts",
          );
        }

        if (
          parent.accountType !== (updateData.accountType || account.accountType)
        ) {
          throw new Error("Parent account type must match child account type");
        }

        if (await this.hasRealTransactions(parent._id)) {
          throw new Error(
            "An account with transactions cannot be used as a parent account",
          );
        }
      }
    }

    // Opening balance/type/date are backed by the account's own
    // system-managed opening journal (see setOpeningBalance), not by real
    // business activity — so editing them should only be blocked once the
    // account has *other* transactions, not merely its own opening entry.
    const editingOpeningFields =
      updateData.openingBalance !== undefined ||
      updateData.openingBalanceType !== undefined ||
      updateData.openingDate !== undefined;

    if (editingOpeningFields) {
      const hasNonOpeningTransactions =
        await this.hasNonOpeningTransactions(accountId);

      if (hasNonOpeningTransactions) {
        throw new Error(
          "Opening balance cannot be updated after transactions exist",
        );
      }
    }

    const {
      openingBalance,
      openingBalanceType,
      openingDate,
      ...restUpdateData
    } = updateData;

    Object.assign(account, restUpdateData);
    account.updatedBy = userId;

    if (editingOpeningFields) {
      if (openingBalance !== undefined) {
        account.openingBalance = Number(openingBalance);
      }
      if (openingBalanceType !== undefined) {
        account.openingBalanceType = openingBalanceType;
      }
      if (openingDate !== undefined) {
        account.openingDate = openingDate;
      }
    }

    await account.save();

    if (editingOpeningFields) {
      await this.setOpeningBalance(account, userId);
    }

    return await ChartOfAccounts.findById(account._id)
      .populate("createdBy", "name email")
      .populate("deletedBy", "name email")
      .populate("parentAccount", "accountCode accountName accountType status");
  }

  static async updateAccountStatus(accountId, status, userId) {
    const account = await ChartOfAccounts.findById(accountId);

    if (!account) {
      throw new Error("Account not found");
    }

    if (!["active", "inactive", "archived"].includes(status)) {
      throw new Error("Invalid account status");
    }

    if (status === "archived") {
      return await this.archiveAccount(accountId, userId);
    }

    const hasChildren = await this.hasRealChildren(accountId);

    if (status === "inactive" && hasChildren) {
      throw new Error("Cannot inactivate a parent account with child accounts");
    }

    account.status = status;
    account.updatedBy = userId;
    await account.save();

    return account;
  }

  static async archiveAccount(accountId, userId) {
    const account = await ChartOfAccounts.findById(accountId);

    if (!account) {
      throw new Error("Account not found");
    }

    if (account.status === "archived") {
      return account;
    }

    const hasChildren = await this.hasRealChildren(accountId);
    if (hasChildren) {
      throw new Error("Cannot archive account with child accounts");
    }

    const hasTransactions = await this.hasRealTransactions(accountId);
    if (hasTransactions) {
      throw new Error("Cannot archive account with existing transactions");
    }

    account.status = "archived";
    account.deletedAt = new Date();
    account.deletedBy = userId;
    account.updatedBy = userId;

    await account.save();
    return account;
  }

  static async restoreAccount(accountId, userId) {
    const account = await ChartOfAccounts.findOne({
      _id: accountId,
      status: "archived",
      includeDeleted: true,
    });

    if (!account) {
      throw new Error("Archived account not found");
    }

    if (account.parentAccount) {
      const parent = await ChartOfAccounts.findOne({
        _id: account.parentAccount,
        deletedAt: null,
        status: "active",
      });

      if (!parent) {
        throw new Error(
          "Cannot restore account because parent is missing or inactive",
        );
      }
    }

    account.status = "active";
    account.deletedAt = null;
    account.deletedBy = null;
    account.updatedBy = userId;

    await account.save();
    return account;
  }

  /**
   * Get only leaf accounts
   * Used for journal entry account selection
   *
   * `parentAccountCode` is an opt-in narrowing for callers that can only
   * accept children of one specific head — the bank-account form passes
   * "1002", mirroring the check bank.service.createBankAccount already
   * enforces at submit (parent resolved by accountCode among non-deleted
   * accounts, child's parentAccount must equal it). Callers that omit it
   * (journal entry, ledger) keep getting every leaf account.
   */
  static async getLeafNodes(filters = {}) {
    const query = {
      deletedAt: null,
      status: "active",
    };

    if (filters.accountType) {
      query.accountType = filters.accountType;
    }

    if (filters.parentAccountCode) {
      const parentAccount = await ChartOfAccounts.findOne({
        accountCode: String(filters.parentAccountCode),
        deletedAt: null,
      }).select("_id");

      // No such head account means no account can legally be a child of it.
      // Return nothing rather than falling back to the unfiltered list.
      if (!parentAccount) return [];

      query.parentAccount = parentAccount._id;
    }

    const parentAccountIds = await ChartOfAccounts.distinct("parentAccount", {
      parentAccount: { $ne: null },
      deletedAt: null,
    });

    query._id = { $nin: parentAccountIds };

    const leafAccounts = await ChartOfAccounts.find(query)
      .select(
        "_id accountCode accountName accountType status currentBalance currentBalanceType openingBalance openingBalanceType openingDate hasTransactions",
      )
      .populate("parentAccount", "accountCode accountName")
      .sort({ accountCode: 1 });

    return leafAccounts;
  }

  /**
   * Fast balance read from stored account balance
   */
  static async getAccountBalance(accountId) {
    const account = await ChartOfAccounts.findById(accountId).select(
      "_id accountCode accountName accountType currentBalance currentBalanceType openingBalance openingBalanceType hasTransactions",
    );

    if (!account) {
      throw new Error("Account not found");
    }

    return {
      accountId: account._id,
      accountCode: account.accountCode,
      accountName: account.accountName,
      accountType: account.accountType,
      balance: Number(account.currentBalance || 0),
      balanceType: account.currentBalanceType || "debit",
      openingBalance: Number(account.openingBalance || 0),
      openingBalanceType: account.openingBalanceType || "debit",
      hasTransactions: Boolean(account.hasTransactions),
    };
  }

  static async buildAccountTree(filters = {}) {
    const query = {};

    if (filters.includeDeleted) {
      query.includeDeleted = true;
    }

    if (filters.status && filters.status !== "all") {
      query.status = filters.status;
    }

    const accounts = await ChartOfAccounts.find(query)
      .sort({ accountCode: 1 })
      .lean();

    const accountMap = {};

    accounts.forEach((account) => {
      accountMap[account._id] = {
        ...account,
        children: [],
      };
    });

    const roots = [];

    accounts.forEach((account) => {
      if (account.parentAccount && accountMap[account.parentAccount]) {
        accountMap[account.parentAccount].children.push(
          accountMap[account._id],
        );
      } else {
        roots.push(accountMap[account._id]);
      }
    });

    return roots;
  }

  /**
   * Helper method for journal approval logic
   * Marks account as having transactions
   */
  static async markAccountAsTransactional(accountId) {
    await ChartOfAccounts.findByIdAndUpdate(accountId, {
      hasTransactions: true,
    });
  }

  /**
   * Helper method for journal approval logic
   * Updates current balance incrementally
   * amount should be absolute amount in major unit
   */
  static async applyBalanceChange(accountId, entryType, amount) {
    const account = await ChartOfAccounts.findById(accountId);

    if (!account) {
      throw new Error("Account not found");
    }

    const numericAmount = Number(amount || 0);

    if (Number.isNaN(numericAmount) || numericAmount < 0) {
      throw new Error("Invalid balance change amount");
    }

    const currentSigned =
      (account.currentBalanceType === "credit" ? -1 : 1) *
      Number(account.currentBalance || 0);

    const delta = entryType === "credit" ? -numericAmount : numericAmount;
    const nextSigned = currentSigned + delta;

    account.currentBalance = Math.abs(nextSigned);
    account.currentBalanceType = nextSigned < 0 ? "credit" : "debit";
    account.hasTransactions = true;

    await account.save();

    return account;
  }
}

module.exports = COAService;
