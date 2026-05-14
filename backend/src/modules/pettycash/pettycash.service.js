const PettyCash = require("./pettycash.model");
const AccountingService = require("../accounting/accounting.service");
const ValidationService = require("../../services/validationService");
const ChartOfAccounts = require("../chartOfAccounts/coa.model");

class PettyCashService {
  /**
   * Validate petty cash data
   */
  static validatePettyCashData(pettyCashData) {
    const errors = [];
    console.log(pettyCashData);

    if (!pettyCashData.date) {
      errors.push("Date is required");
    }

    if (
      !pettyCashData.description ||
      pettyCashData.description.trim().length === 0
    ) {
      errors.push("Description is required");
    }

    if (!pettyCashData.amount || Number(pettyCashData.amount) <= 0) {
      errors.push("Amount must be greater than 0");
    }

    // if (!pettyCashData.paidTo || pettyCashData.paidTo.trim().length === 0) {
    //   errors.push("Paid to is required");
    // }

    if (!pettyCashData.expenseAccount) {
      errors.push("Expense account is required");
    }

    // if (!pettyCashData.pettyCashAccount) {
    //   errors.push("Petty cash account is required");
    // }

    if (
      pettyCashData.expenseAccount &&
      pettyCashData.pettyCashAccount &&
      pettyCashData.expenseAccount.toString() ===
        pettyCashData.pettyCashAccount.toString()
    ) {
      errors.push("Expense account and petty cash account cannot be the same");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Create journal entry for petty cash
   * Debit  = Expense Account
   * Credit = Petty Cash Account
   */
static async createJournalEntryForPettyCash(pettyCash) {
  const pettyCashAccount = await ChartOfAccounts.findOne({
    accountCode: 1001,
    deletedAt: null,
  });
  console.log(pettyCashAccount);
  if (!pettyCashAccount) {
    throw new Error("Petty cash account is not configured");
  }

  const bookEntries = [
    {
      account: pettyCash.expenseAccount,
      debit: Number(pettyCash.amount),
      credit: 0,
      description: pettyCash.description,
    },
    {
      account: pettyCashAccount._id,
      debit: 0,
      credit: Number(pettyCash.amount),
      description: `Petty cash paid to ${pettyCash.paidTo}`,
    },
  ];

  const accountValidation =
    await ValidationService.validateAccounts(bookEntries);

  if (!accountValidation.isValid) {
    throw new Error(
      `Account validation failed: ${accountValidation.errors.join(", ")}`
    );
  }

  return await AccountingService.createJournalEntry({
    voucherDate: pettyCash.date,
    transactionType: "payment",
    sourceModule: "petty_cash",
    requiresApproval: false,
    description: `Petty Cash: ${pettyCash.description} (${pettyCash.pettyCashNumber})`,
    bookEntries,
    referenceNumber: pettyCash.pettyCashNumber,
    createdBy: pettyCash.createdBy,
  });
}
  /**
   * Create a new petty cash disbursement
   */
  static async createPettyCash(pettyCashData) {
    const validation = this.validatePettyCashData(pettyCashData);

    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
    }

    if (pettyCashData.pettyCashNumber) {
      const existingPettyCash = await PettyCash.findOne({
        pettyCashNumber: pettyCashData.pettyCashNumber.toUpperCase(),
        deletedAt: null,
      });

      if (existingPettyCash) {
        throw new Error(
          `Petty cash number ${pettyCashData.pettyCashNumber} already exists`,
        );
      }
    }

    const pettyCash = new PettyCash({
      ...pettyCashData,
      pettyCashNumber: pettyCashData.pettyCashNumber
        ? pettyCashData.pettyCashNumber.toUpperCase()
        : undefined,
      amount: Number(pettyCashData.amount),
      accountingStatus: "pending",
    });

    await pettyCash.save();

    try {
      const journalEntry = await this.createJournalEntryForPettyCash(pettyCash);

      pettyCash.journalEntryId = journalEntry._id;
      pettyCash.accountingStatus = "posted";

      await pettyCash.save();
    } catch (error) {
      pettyCash.accountingStatus = "pending";
      await pettyCash.save();

      throw new Error(
        `Petty cash saved but journal entry failed: ${error.message}`,
      );
    }

    return await this.getPettyCashById(pettyCash._id);
  }

  /**
   * Get all petty cash records with filters
   */
  static async getAllPettyCash(filters = {}) {
    const query = { deletedAt: null };

    if (filters.createdBy) query.createdBy = filters.createdBy;
    if (filters.expenseAccount) query.expenseAccount = filters.expenseAccount;
    if (filters.pettyCashAccount)
      query.pettyCashAccount = filters.pettyCashAccount;
    if (filters.accountingStatus)
      query.accountingStatus = filters.accountingStatus;

    if (filters.dateFrom || filters.dateTo) {
      query.date = {};

      if (filters.dateFrom) {
        query.date.$gte = new Date(filters.dateFrom);
      }

      if (filters.dateTo) {
        query.date.$lte = new Date(filters.dateTo);
      }
    }

    return await PettyCash.find(query)
      .populate("expenseAccount", "accountCode accountName accountType")
      // .populate("pettyCashAccount", "accountCode accountName accountType")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .populate("journalEntryId")
      .sort({ date: -1 });
  }

  /**
   * Get petty cash by ID
   */
  static async getPettyCashById(pettyCashId) {
    const pettyCash = await PettyCash.findOne({
      _id: pettyCashId,
      deletedAt: null,
    })
      .populate("expenseAccount", "accountCode accountName accountType")
      // .populate("pettyCashAccount", "accountCode accountName accountType")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .populate("deletedBy", "name email")
      .populate("journalEntryId");

    if (!pettyCash) {
      throw new Error("Petty cash record not found");
    }

    return pettyCash;
  }

  /**
   * Update petty cash record
   *
   * Important:
   * If accountingStatus is posted, we do not allow direct update
   * because journal entry is already created.
   */
  static async updatePettyCash(pettyCashId, updateData, userId) {
    const pettyCash = await PettyCash.findOne({
      _id: pettyCashId,
      deletedAt: null,
    });

    if (!pettyCash) {
      throw new Error("Petty cash record not found");
    }

    if (pettyCash.accountingStatus === "posted") {
      throw new Error(
        "Cannot update posted petty cash entry. Reverse the journal entry first.",
      );
    }

    const immutableFields = [
      "pettyCashNumber",
      "createdBy",
      "createdAt",
      "journalEntryId",
      "accountingStatus",
    ];

    const attemptedImmutableUpdate = immutableFields.some(
      (field) => field in updateData,
    );

    if (attemptedImmutableUpdate) {
      throw new Error(
        `Cannot update immutable fields: ${immutableFields.join(", ")}`,
      );
    }

    const validation = this.validatePettyCashData({
      ...pettyCash.toObject(),
      ...updateData,
    });

    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
    }

    updateData.updatedBy = userId;

    const updatedPettyCash = await PettyCash.findByIdAndUpdate(
      pettyCashId,
      updateData,
      { new: true, runValidators: true },
    )
      .populate("expenseAccount", "accountCode accountName accountType")
      // .populate("pettyCashAccount", "accountCode accountName accountType")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    return updatedPettyCash;
  }

  /**
   * Soft delete petty cash record
   */
  static async deletePettyCash(pettyCashId, userId) {
    const pettyCash = await PettyCash.findOne({
      _id: pettyCashId,
      deletedAt: null,
    });

    if (!pettyCash) {
      throw new Error("Petty cash record not found");
    }

    if (pettyCash.accountingStatus === "posted") {
      throw new Error(
        "Cannot delete posted petty cash entry. Reverse the journal entry first.",
      );
    }

    pettyCash.deletedAt = new Date();
    pettyCash.deletedBy = userId;

    await pettyCash.save();

    return pettyCash;
  }

  /**
   * Get petty cash statistics
   */
  static async getPettyCashStats(filters = {}) {
    const query = {
      deletedAt: null,
      accountingStatus: "posted",
    };

    if (filters.expenseAccount) {
      query.expenseAccount = filters.expenseAccount;
    }

    if (filters.pettyCashAccount) {
      query.pettyCashAccount = filters.pettyCashAccount;
    }

    if (filters.dateFrom || filters.dateTo) {
      query.date = {};

      if (filters.dateFrom) {
        query.date.$gte = new Date(filters.dateFrom);
      }

      if (filters.dateTo) {
        query.date.$lte = new Date(filters.dateTo);
      }
    }

    const stats = await PettyCash.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
          averageAmount: { $avg: "$amount" },
        },
      },
    ]);

    return (
      stats[0] || {
        totalAmount: 0,
        count: 0,
        averageAmount: 0,
      }
    );
  }

  /**
   * Get petty cash by expense account
   */
  static async getPettyCashByExpenseAccount(expenseAccountId) {
    return await PettyCash.find({
      expenseAccount: expenseAccountId,
      accountingStatus: "posted",
      deletedAt: null,
    })
      .populate("expenseAccount", "accountCode accountName accountType")
      // .populate("pettyCashAccount", "accountCode accountName accountType")
      .populate("createdBy", "name email")
      .populate("journalEntryId")
      .sort({ date: -1 });
  }

  /**
   * Generate petty cash report - Monthly format
   * Format: Date, Expenditures, Cash Received & Paid from, Cash Received (BDT), 
   *         Cash Payment (BDT), Balance (BDT), Remarks
   */
  static async generatePettyCashReport(filters = {}) {
    const query = { deletedAt: null };

    if (filters.dateFrom || filters.dateTo) {
      query.date = {};
      if (filters.dateFrom) {
        query.date.$gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        query.date.$lte = new Date(filters.dateTo);
      }
    }

    if (filters.accountingStatus) {
      query.accountingStatus = filters.accountingStatus;
    }

    if (filters.expenseAccount) {
      query.expenseAccount = filters.expenseAccount;
    }

    // Fetch all petty cash records sorted by date
    const records = await PettyCash.find(query)
      .populate("expenseAccount", "accountCode accountName accountType")
      // .populate("pettyCashAccount", "accountCode accountName accountType")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .sort({ date: 1 }); // Sort ascending by date

    // Format records for the report
    const reportData = [];
    let runningBalance = 0;
    let totalCashReceived = 0;
    let totalCashPayment = 0;

    records.forEach((record) => {
      const amount = Number(record.amount);
      
      // In the format: negative for payment, positive for receipt
      const isCashReceived = record.paymentMode === "receipt" || 
                              record.description.toLowerCase().includes("received");
      
      const cashReceived = isCashReceived ? amount : 0;
      const cashPayment = !isCashReceived ? amount : 0;

      runningBalance += (cashReceived - cashPayment);
      totalCashReceived += cashReceived;
      totalCashPayment += cashPayment;

      reportData.push({
        date: new Date(record.date).toLocaleDateString("en-GB"),
        expenditures: record.description,
        cashReceivedPaidFrom: record.pettyCashAccount?.accountName || "Cash Account",
        cashReceived: cashReceived,
        cashPayment: cashPayment,
        balance: runningBalance,
        remarks: record.referenceNumber || "",
        fullRecord: record, // Keep for CSV export
      });
    });

    // Extract date range for report title
    const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : null;
    const dateTo = filters.dateTo ? new Date(filters.dateTo) : null;
    
    let monthYear = "";
    if (dateFrom && dateTo) {
      const month = dateFrom.toLocaleString("en-US", { month: "long" });
      const year = dateFrom.getFullYear();
      monthYear = `${month}-${year}`;
    }

    return {
      reportData,
      summary: {
        totalCashReceived,
        totalCashPayment,
        totalRecords: records.length,
        closingBalance: runningBalance,
      },
      dateRange: {
        from: filters.dateFrom || null,
        to: filters.dateTo || null,
        monthYear,
      },
    };
  }
}

module.exports = PettyCashService;
