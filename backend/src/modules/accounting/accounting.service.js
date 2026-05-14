const JournalEntry = require("./accounting.model");
const ChartOfAccounts = require("../chartOfAccounts/coa.model");
const COAService = require("../chartOfAccounts/coa.service");
const mongoose = require("mongoose");

class AccountingService {
  static getDebitNatureTypes() {
    return ["asset", "expense"];
  }

  static getCreditNatureTypes() {
    return ["liability", "equity", "income", "revenue"];
  }

  static normalizeAccountType(accountType) {
    return String(accountType || "")
      .trim()
      .toLowerCase();
  }

  static isDebitNature(accountType) {
    return this.getDebitNatureTypes().includes(
      this.normalizeAccountType(accountType),
    );
  }

  static isCreditNature(accountType) {
    return this.getCreditNatureTypes().includes(
      this.normalizeAccountType(accountType),
    );
  }

  static calculateSignedBalance(
    accountType,
    openingBalance,
    openingBalanceType,
  ) {
    const balance = Number(openingBalance || 0);
    const type = String(openingBalanceType || "").toLowerCase();

    if (this.isDebitNature(accountType)) {
      return type === "credit" ? -balance : balance;
    }

    if (this.isCreditNature(accountType)) {
      return type === "debit" ? -balance : balance;
    }

    return type === "credit" ? -balance : balance;
  }

  static applyLineToSignedBalance(
    accountType,
    currentSignedBalance,
    debit,
    credit,
  ) {
    const numericDebit = Number(debit || 0);
    const numericCredit = Number(credit || 0);

    if (this.isDebitNature(accountType)) {
      return currentSignedBalance + numericDebit - numericCredit;
    }

    if (this.isCreditNature(accountType)) {
      return currentSignedBalance + numericCredit - numericDebit;
    }

    return currentSignedBalance + numericDebit - numericCredit;
  }

  static signedToDisplayBalance(accountType, signedBalance) {
    if (this.isDebitNature(accountType)) {
      return {
        balance: Math.abs(signedBalance),
        balanceType: signedBalance >= 0 ? "debit" : "credit",
      };
    }

    if (this.isCreditNature(accountType)) {
      return {
        balance: Math.abs(signedBalance),
        balanceType: signedBalance >= 0 ? "credit" : "debit",
      };
    }

    return {
      balance: Math.abs(signedBalance),
      balanceType: signedBalance >= 0 ? "debit" : "credit",
    };
  }

  static async generateTrialBalance(asOfDate = new Date()) {
    const accounts = await ChartOfAccounts.find({
      deletedAt: null,
      status: "active",
    });

    const balances = [];
    let totalDebits = 0;
    let totalCredits = 0;

    for (const account of accounts) {
      const balanceData = await this.calculateAccountBalance(
        account._id,
        asOfDate,
      );

      if (!balanceData.balance) continue;

      const row = {
        accountCode: balanceData.accountCode,
        accountName: balanceData.accountName,
        accountType: balanceData.accountType,
        debit: balanceData.balanceType === "debit" ? balanceData.balance : 0,
        credit: balanceData.balanceType === "credit" ? balanceData.balance : 0,
      };

      balances.push(row);
      totalDebits += row.debit;
      totalCredits += row.credit;
    }

    return {
      balances,
      totalDebits,
      totalCredits,
      isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
    };
  }

  static async generateIncomeStatement(startDate, endDate) {
    const revenues = await ChartOfAccounts.find({
      accountType: { $in: ["income", "revenue", "Income", "Revenue"] },
      deletedAt: null,
      status: "active",
    });

    const expenses = await ChartOfAccounts.find({
      accountType: { $in: ["expense", "Expense"] },
      deletedAt: null,
      status: "active",
    });

    const revenueList = [];
    let totalRevenue = 0;

    for (const account of revenues) {
      const periodAmount = await this.calculatePeriodAmount(
        account._id,
        startDate,
        endDate,
      );

      if (periodAmount !== 0) {
        revenueList.push({
          accountCode: account.accountCode,
          accountName: account.accountName,
          amount: periodAmount,
        });
        totalRevenue += periodAmount;
      }
    }

    const expenseList = [];
    let totalExpenses = 0;

    for (const account of expenses) {
      const periodAmount = await this.calculatePeriodAmount(
        account._id,
        startDate,
        endDate,
      );

      if (periodAmount !== 0) {
        expenseList.push({
          accountCode: account.accountCode,
          accountName: account.accountName,
          amount: periodAmount,
        });
        totalExpenses += periodAmount;
      }
    }

    return {
      revenues: revenueList,
      totalRevenue,
      expenses: expenseList,
      totalExpenses,
      netIncome: totalRevenue - totalExpenses,
    };
  }

  static async generateBalanceSheet(asOfDate = new Date()) {
    const assets = await ChartOfAccounts.find({
      accountType: { $in: ["asset", "Asset"] },
      deletedAt: null,
      status: "active",
    });

    const liabilities = await ChartOfAccounts.find({
      accountType: { $in: ["liability", "Liability"] },
      deletedAt: null,
      status: "active",
    });

    const equity = await ChartOfAccounts.find({
      accountType: { $in: ["equity", "Equity"] },
      deletedAt: null,
      status: "active",
    });

    const assetList = [];
    let totalAssets = 0;

    for (const account of assets) {
      const balanceData = await this.calculateAccountBalance(
        account._id,
        asOfDate,
      );

      if (balanceData.balance !== 0) {
        assetList.push({
          accountCode: account.accountCode,
          accountName: account.accountName,
          amount: balanceData.balance,
        });
        totalAssets += balanceData.balance;
      }
    }

    const liabilityList = [];
    let totalLiabilities = 0;

    for (const account of liabilities) {
      const balanceData = await this.calculateAccountBalance(
        account._id,
        asOfDate,
      );

      if (balanceData.balance !== 0) {
        liabilityList.push({
          accountCode: account.accountCode,
          accountName: account.accountName,
          amount: balanceData.balance,
        });
        totalLiabilities += balanceData.balance;
      }
    }

    const equityList = [];
    let totalEquity = 0;

    for (const account of equity) {
      const balanceData = await this.calculateAccountBalance(
        account._id,
        asOfDate,
      );

      if (balanceData.balance !== 0) {
        equityList.push({
          accountCode: account.accountCode,
          accountName: account.accountName,
          amount: balanceData.balance,
        });
        totalEquity += balanceData.balance;
      }
    }

    const retainedEarningsAccount = await ChartOfAccounts.findOne({
      accountName: { $regex: /retained earnings/i },
      deletedAt: null,
      status: "active",
    });

    let retainedEarnings = 0;

    if (retainedEarningsAccount) {
      const reData = await this.calculateAccountBalance(
        retainedEarningsAccount._id,
        asOfDate,
      );
      retainedEarnings = reData.balance;
    } else {
      const fiscalYearStart = new Date(asOfDate.getFullYear(), 0, 1);
      const incomeStatement = await this.generateIncomeStatement(
        fiscalYearStart,
        asOfDate,
      );
      retainedEarnings = incomeStatement.netIncome;
    }

    equityList.push({
      accountCode: "RE",
      accountName: "Retained Earnings",
      amount: retainedEarnings,
    });

    totalEquity += retainedEarnings;

    return {
      assets: assetList,
      totalAssets,
      liabilities: liabilityList,
      totalLiabilities,
      equity: equityList,
      totalEquity,
      isBalanced:
        Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
    };
  }

  static async generateCashFlowStatement(startDate, endDate) {
    const cashAccounts = await ChartOfAccounts.find({
      accountName: { $regex: /cash|bank/i },
      deletedAt: null,
      status: "active",
    });

    const cashAccountIds = cashAccounts.map((a) => a._id);

    const startBalance = await Promise.all(
      cashAccountIds.map((id) =>
        this.calculateAccountBalance(
          id,
          new Date(new Date(startDate).getTime() - 1),
        ),
      ),
    );

    const endBalance = await Promise.all(
      cashAccountIds.map((id) =>
        this.calculateAccountBalance(id, new Date(endDate)),
      ),
    );

    const totalStart = startBalance.reduce(
      (sum, item) => sum + item.balance,
      0,
    );
    const totalEnd = endBalance.reduce((sum, item) => sum + item.balance, 0);

    const entries = await JournalEntry.find({
      "bookEntries.account": { $in: cashAccountIds },
      status: "posted",
      deletedAt: null,
      voucherDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    }).populate("bookEntries.account");

    const inflows = [];
    const outflows = [];
    let totalInflow = 0;
    let totalOutflow = 0;

    for (const entry of entries) {
      const jsonEntry = entry.toJSON();

      const cashLines = (jsonEntry.bookEntries || []).filter((bookEntry) =>
        cashAccountIds.some(
          (id) => id.toString() === bookEntry.account._id.toString(),
        ),
      );

      for (const line of cashLines) {
        if (line.debit > 0) {
          totalInflow += line.debit;
          inflows.push({
            date: jsonEntry.voucherDate,
            description: jsonEntry.description,
            amount: line.debit,
          });
        }

        if (line.credit > 0) {
          totalOutflow += line.credit;
          outflows.push({
            date: jsonEntry.voucherDate,
            description: jsonEntry.description,
            amount: line.credit,
          });
        }
      }
    }

    return {
      openingBalance: totalStart,
      inflows,
      totalInflow,
      outflows,
      totalOutflow,
      netCashFlow: totalInflow - totalOutflow,
      closingBalance: totalEnd,
    };
  }

  static async getGeneralLedgerForAccount(accountId, startDate, endDate) {
    const account = await ChartOfAccounts.findById(accountId);
    if (!account) throw new Error("Account not found");

    const openingBalanceDate = startDate ? new Date(startDate) : new Date(0);

    const openingBalanceData = await this.calculateAccountBalance(
      accountId,
      new Date(openingBalanceDate.getTime() - 1),
    );

    const query = {
      "bookEntries.account": accountId,
      status: "posted",
      deletedAt: null,
    };

    if (startDate || endDate) {
      query.voucherDate = {};
      if (startDate) query.voucherDate.$gte = new Date(startDate);
      if (endDate) query.voucherDate.$lte = new Date(endDate);
    }

    const entries = await JournalEntry.find(query)
      .populate("createdBy", "name email")
      .populate("bookEntries.account", "accountName accountCode accountType")
      .sort({ voucherDate: 1, createdAt: 1 });

    let runningSignedBalance = this.calculateSignedBalance(
      account.accountType,
      openingBalanceData.balance,
      openingBalanceData.balanceType,
    );

    let totalDebit = 0;
    let totalCredit = 0;

    const transactions = entries.map((entry) => {
      const jsonEntry = entry.toJSON();

      const relevantBookEntry = (jsonEntry.bookEntries || []).find(
        (bookEntry) =>
          bookEntry.account._id.toString() === accountId.toString(),
      );

      const debit = Number(relevantBookEntry?.debit || 0);
      const credit = Number(relevantBookEntry?.credit || 0);

      totalDebit += debit;
      totalCredit += credit;

      runningSignedBalance = this.applyLineToSignedBalance(
        account.accountType,
        runningSignedBalance,
        debit,
        credit,
      );

      const runningDisplay = this.signedToDisplayBalance(
        account.accountType,
        runningSignedBalance,
      );

      return {
        date: jsonEntry.voucherDate,
        voucherNumber: jsonEntry.voucherNumber,
        transactionType: jsonEntry.transactionType,
        description: relevantBookEntry?.description || jsonEntry.description,
        reference: jsonEntry.referenceNumber,
        debit,
        credit,
        runningBalance: runningDisplay.balance,
        runningBalanceType: runningDisplay.balanceType,
        journalEntryId: jsonEntry._id,
      };
    });

    const closingDisplay = this.signedToDisplayBalance(
      account.accountType,
      runningSignedBalance,
    );

    return {
      accountName: account.accountName,
      accountCode: account.accountCode,
      accountType: account.accountType,
      openingBalance: openingBalanceData.balance,
      openingBalanceType: openingBalanceData.balanceType,
      totalDebit,
      totalCredit,
      closingBalance: closingDisplay.balance,
      closingBalanceType: closingDisplay.balanceType,
      transactions,
    };
  }

  static async calculatePeriodAmount(accountId, startDate, endDate) {
    const account = await ChartOfAccounts.findOne({
      _id: accountId,
      deletedAt: null,
    });

    if (!account) {
      throw new Error("Account not found");
    }

    const entries = await JournalEntry.find({
      "bookEntries.account": accountId,
      status: "posted",
      deletedAt: null,
      voucherDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    });

    let signedAmount = 0;

    for (const entry of entries) {
      const jsonEntry = entry.toJSON();

      for (const line of jsonEntry.bookEntries || []) {
        const lineAccountId =
          typeof line.account === "object" && line.account !== null
            ? line.account._id?.toString()
            : line.account?.toString();

        if (lineAccountId === accountId.toString()) {
          signedAmount = this.applyLineToSignedBalance(
            account.accountType,
            signedAmount,
            line.debit || 0,
            line.credit || 0,
          );
        }
      }
    }

    return Math.abs(signedAmount);
  }

  static async calculateAccountBalance(accountId, asOfDate = new Date()) {
    const account = await ChartOfAccounts.findOne({
      _id: accountId,
      deletedAt: null,
    });

    if (!account) {
      throw new Error("Account not found");
    }

    let signedBalance = this.calculateSignedBalance(
      account.accountType,
      account.openingBalance || 0,
      account.openingBalanceType || "debit",
    );

    const entries = await JournalEntry.find({
      "bookEntries.account": accountId,
      status: "posted",
      deletedAt: null,
      voucherDate: { $lte: asOfDate },
    });

    for (const entry of entries) {
      const jsonEntry = entry.toJSON();

      for (const line of jsonEntry.bookEntries || []) {
        const lineAccountId =
          typeof line.account === "object" && line.account !== null
            ? line.account._id?.toString()
            : line.account?.toString();

        if (lineAccountId === accountId.toString()) {
          signedBalance = this.applyLineToSignedBalance(
            account.accountType,
            signedBalance,
            line.debit || 0,
            line.credit || 0,
          );
        }
      }
    }

    const display = this.signedToDisplayBalance(
      account.accountType,
      signedBalance,
    );

    return {
      accountId: account._id,
      accountCode: account.accountCode,
      accountName: account.accountName,
      accountType: account.accountType,
      balance: display.balance,
      balanceType: display.balanceType,
      naturalBalanceType: this.isDebitNature(account.accountType)
        ? "debit"
        : "credit",
    };
  }

  static validateDoubleEntry(bookEntries) {
    if (!Array.isArray(bookEntries) || bookEntries.length < 2) {
      throw new Error("Journal entry must have at least 2 line items");
    }

    let totalDebits = 0;
    let totalCredits = 0;

    for (const entry of bookEntries) {
      const debit = Number(entry.debit || 0);
      const credit = Number(entry.credit || 0);

      if (debit > 0 && credit > 0) {
        throw new Error("A line cannot contain both debit and credit");
      }

      if (debit === 0 && credit === 0) {
        throw new Error("Each line must contain either debit or credit");
      }

      totalDebits += debit;
      totalCredits += credit;
    }

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      throw new Error(
        `Double-entry validation failed. Debits: ${totalDebits}, Credits: ${totalCredits}`,
      );
    }
  }

  static async validateAccounts(bookEntries) {
    const errors = [];
    const accountIds = [
      ...new Set(
        bookEntries
          .map((entry) => (entry.account || entry.accountId)?.toString())
          .filter(Boolean),
      ),
    ];

    if (accountIds.length === 0) {
      return ["Account is required for each line item"];
    }

    const accounts = await ChartOfAccounts.find({
      _id: { $in: accountIds },
      deletedAt: null,
    }).lean();

    const accountMap = new Map(
      accounts.map((account) => [account._id.toString(), account]),
    );

    const childRows = await ChartOfAccounts.aggregate([
      {
        $match: {
          parentAccount: {
            $in: accountIds.map((id) => new mongoose.Types.ObjectId(id)),
          },
          deletedAt: null,
          status: { $ne: "archived" },
        },
      },
      {
        $group: {
          _id: "$parentAccount",
          count: { $sum: 1 },
        },
      },
    ]);

    const parentSet = new Set(childRows.map((row) => row._id.toString()));

    for (const entry of bookEntries) {
      const accountId = (entry.account || entry.accountId)?.toString();

      if (!accountId) {
        errors.push("Account ID is required");
        continue;
      }

      const account = accountMap.get(accountId);

      if (!account) {
        errors.push(`Account ${accountId} not found`);
        continue;
      }

      if (account.deletedAt) {
        errors.push(`Account ${account.accountCode} is deleted`);
      }

      if (account.status !== "active") {
        errors.push(`Account ${account.accountCode} is not active`);
      }

      const isCurrentlyLeaf = !parentSet.has(accountId);
      entry.wasLeafAtCreation = isCurrentlyLeaf;

      if (!isCurrentlyLeaf) {
        errors.push(
          `Account ${account.accountCode} is a parent account and cannot be used in transactions.`,
        );
      }
    }

    return [...new Set(errors)];
  }

static async createJournalEntry(entryData) {
  if (!entryData?.bookEntries || !Array.isArray(entryData.bookEntries)) {
    throw new Error("Book entries are required");
  }

  this.validateDoubleEntry(entryData.bookEntries);

  const accountErrors = await this.validateAccounts(entryData.bookEntries);

  if (accountErrors.length > 0) {
    throw new Error(`Invalid accounts: ${accountErrors.join(", ")}`);
  }

  const requiresApproval = entryData.requiresApproval !== false;

  entryData.sourceModule = entryData.sourceModule || "manual";

  // Do NOT mark auto journal as approved here.
  // Balance update happens inside approveEntry().
  entryData.approvalStatus = "pending";
  entryData.status = "draft";

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const [entry] = await JournalEntry.create([entryData], { session });

    await session.commitTransaction();

    // Auto approve + post system generated journals
    // This will also update COA balance.
    if (!requiresApproval) {
      return await this.approveEntry(entry._id, entryData.createdBy);
    }

    const createdEntry = await JournalEntry.findById(entry._id)
      .populate("createdBy", "name email")
      .populate("approvedBy", "name email")
      .populate("bookEntries.account", "accountName accountCode accountType");

    return createdEntry.toJSON();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
}

  static async getAllEntries(filters = {}) {
    const query = { deletedAt: null };

    if (filters.transactionType)
      query.transactionType = filters.transactionType;
    if (filters.approvalStatus) query.approvalStatus = filters.approvalStatus;
    if (filters.status) query.status = filters.status;

    if (filters.dateFrom || filters.dateTo) {
      query.voucherDate = {};
      if (filters.dateFrom) query.voucherDate.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) query.voucherDate.$lte = new Date(filters.dateTo);
    }

    const page = Math.max(1, parseInt(filters.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const sortField = filters.sortBy || "voucherDate";
    const sortOrder = filters.sortOrder === "asc" ? 1 : -1;
    const sort = { [sortField]: sortOrder, _id: -1 };

    const total = await JournalEntry.countDocuments(query);

    const entries = await JournalEntry.find(query)
      .populate("createdBy", "name email")
      .populate("bookEntries.account", "accountName accountCode accountType")
      .sort(sort)
      .skip(skip)
      .limit(limit);

    return {
      data: entries.map((entry) => entry.toJSON()),
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  static async getEntryById(entryId) {
    const entry = await JournalEntry.findOne({
      _id: entryId,
      deletedAt: null,
    })
      .populate("createdBy", "name email")
      .populate("approvedBy", "name email")
      .populate("rejectedBy", "name email")
      .populate("bookEntries.account", "accountName accountCode accountType");

    if (!entry) return null;

    return entry.toJSON();
  }

  static async updateEntry(entryId, updateData) {
    const existingEntry = await JournalEntry.findOne({
      _id: entryId,
      deletedAt: null,
    });

    if (!existingEntry) throw new Error("Entry not found");
    if (existingEntry.status === "posted") {
      throw new Error("Cannot edit posted journal entry");
    }

    if (updateData.bookEntries) {
      this.validateDoubleEntry(updateData.bookEntries);
      const errors = await this.validateAccounts(updateData.bookEntries);
      if (errors.length > 0) {
        throw new Error(`Invalid accounts: ${errors.join(", ")}`);
      }
    }

    const updatedEntry = await JournalEntry.findByIdAndUpdate(
      entryId,
      updateData,
      {
        new: true,
        runValidators: true,
      },
    )
      .populate("createdBy", "name email")
      .populate("bookEntries.account", "accountName accountCode accountType");

    return updatedEntry.toJSON();
  }

  static async deleteEntry(entryId, userId) {
    const entry = await JournalEntry.findOne({
      _id: entryId,
      deletedAt: null,
    });

    if (!entry) throw new Error("Entry not found");
    if (entry.status === "posted") {
      throw new Error("Cannot delete a posted journal entry");
    }

    const deletedEntry = await JournalEntry.findByIdAndUpdate(
      entryId,
      {
        status: "deleted",
        deletedAt: new Date(),
        deletedBy: userId,
      },
      { new: true },
    );

    return deletedEntry ? deletedEntry.toJSON() : null;
  }

  static async approveEntry(entryId, approvedBy) {
    const entry = await JournalEntry.findOne({
      _id: entryId,
      deletedAt: null,
    });

    if (!entry) throw new Error("Entry not found");
    if (entry.status === "posted") throw new Error("Already posted");
    if (entry.approvalStatus === "rejected") {
      throw new Error("Rejected entry cannot be approved");
    }

    const accountIds = entry.bookEntries
      .map((entryLine) => entryLine.account)
      .filter(Boolean);

    if (accountIds.length > 0) {
      const childRows = await ChartOfAccounts.aggregate([
        {
          $match: {
            parentAccount: {
              $in: accountIds.map((id) => new mongoose.Types.ObjectId(id)),
            },
            deletedAt: null,
            status: { $ne: "archived" },
          },
        },
        {
          $group: {
            _id: "$parentAccount",
            count: { $sum: 1 },
          },
        },
      ]);

      const currentParentSet = new Set(
        childRows.map((row) => row._id.toString()),
      );

      for (const bookEntry of entry.bookEntries) {
        const accountId = bookEntry.account?.toString();
        if (!accountId) continue;

        const wasLeafAtCreation = bookEntry.wasLeafAtCreation !== false;
        const isCurrentlyLeaf = !currentParentSet.has(accountId);

        if (!wasLeafAtCreation && !isCurrentlyLeaf) {
          const account = await ChartOfAccounts.findById(accountId);
          throw new Error(
            `Cannot approve: Account ${account?.accountCode} was not a leaf account at creation time and is still not a leaf account now.`,
          );
        }
      }
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      for (const line of entry.bookEntries) {
        const debit = Number(line.debit || 0);
        const credit = Number(line.credit || 0);

        if (debit > 0) {
          await COAService.applyBalanceChange(line.account, "debit", debit);
        }

        if (credit > 0) {
          await COAService.applyBalanceChange(line.account, "credit", credit);
        }

        await COAService.markAccountAsTransactional(line.account);
      }

      entry.approvalStatus = "approved";
      entry.status = "posted";
      entry.isLocked = true;
      entry.approvedBy = approvedBy;
      entry.approvalDate = new Date();

      await entry.save({ session });

      await session.commitTransaction();

      const populatedEntry = await JournalEntry.findById(entry._id)
        .populate("createdBy", "name email")
        .populate("approvedBy", "name email")
        .populate("bookEntries.account", "accountCode accountName accountType");

      return populatedEntry.toJSON();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  static async rejectEntry(entryId, rejectedBy, rejectionReason) {
    const entry = await JournalEntry.findOne({
      _id: entryId,
      deletedAt: null,
    });

    if (!entry) throw new Error("Entry not found");
    if (entry.status === "posted") {
      throw new Error("Cannot reject already posted entry");
    }
    if (entry.approvalStatus !== "pending") {
      throw new Error("Entry is not pending approval");
    }

    entry.approvalStatus = "rejected";
    entry.rejectionReason = rejectionReason;
    entry.isLocked = true;
    entry.rejectedBy = rejectedBy;
    entry.rejectionDate = new Date();

    await entry.save();

    const populatedEntry = await JournalEntry.findById(entry._id)
      .populate("createdBy", "name email")
      .populate("approvedBy", "name email")
      .populate("rejectedBy", "name email")
      .populate("bookEntries.account", "accountCode accountName accountType");

    return populatedEntry ? populatedEntry.toJSON() : null;
  }

  static async getPendingApprovals() {
    const entries = await JournalEntry.find({
      approvalStatus: "pending",
      deletedAt: null,
    })
      .populate("createdBy", "name email")
      .populate("bookEntries.account", "accountCode accountName accountType")
      .sort({ voucherDate: -1 });

    return entries.map((entry) => entry.toJSON());
  }

  static async getEntriesByAccount(accountId) {
    const entries = await JournalEntry.find({
      "bookEntries.account": accountId,
      deletedAt: null,
    })
      .populate("createdBy", "name email")
      .populate("bookEntries.account", "accountCode accountName accountType")
      .sort({ voucherDate: -1, createdAt: -1 });

    return entries.map((entry) => entry.toJSON());
  }

  static async getTrialBalance() {
    return this.generateTrialBalance(new Date());
  }
}

module.exports = AccountingService;
