// src/seed/seed.js

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

import User from "../modules/users/user.model.js"
import Account from "../modules/chartOfAccounts/coa.model.js";

dotenv.config();

// ========================================
// DEFAULT CHART OF ACCOUNTS
// ========================================

const defaultAccounts = [
  // =========================
  // ASSETS
  // =========================
  {
    accountCode: "1001",
    accountName: "Cash on Hand",
    accountType: "asset",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "1002",
    accountName: "Bank Accounts",
    accountType: "asset",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "1101",
    accountName: "Accounts Receivable",
    accountType: "asset",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "1201",
    accountName: "Inventory",
    accountType: "asset",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "1301",
    accountName: "Prepaid Expenses",
    accountType: "asset",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "1401",
    accountName: "Fixed Assets",
    accountType: "asset",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "1402",
    accountName: "Accumulated Depreciation",
    accountType: "asset",
    openingBalanceType: "credit",
    currentBalanceType: "credit",
  },

  // =========================
  // LIABILITIES
  // =========================
  {
    accountCode: "2001",
    accountName: "Accounts Payable",
    accountType: "liability",
    openingBalanceType: "credit",
    currentBalanceType: "credit",
  },
  {
    accountCode: "2101",
    accountName: "Loans Payable",
    accountType: "liability",
    openingBalanceType: "credit",
    currentBalanceType: "credit",
  },
  {
    accountCode: "2201",
    accountName: "Salaries Payable",
    accountType: "liability",
    openingBalanceType: "credit",
    currentBalanceType: "credit",
  },
  {
    accountCode: "2301",
    accountName: "Taxes Payable",
    accountType: "liability",
    openingBalanceType: "credit",
    currentBalanceType: "credit",
  },

  // =========================
  // EQUITY
  // =========================
  {
    accountCode: "3001",
    accountName: "Owner’s Capital",
    accountType: "equity",
    openingBalanceType: "credit",
    currentBalanceType: "credit",
  },
  {
    accountCode: "3101",
    accountName: "Retained Earnings",
    accountType: "equity",
    openingBalanceType: "credit",
    currentBalanceType: "credit",
  },
  {
    accountCode: "3201",
    accountName: "Opening Balance Equity",
    accountType: "equity",
    openingBalanceType: "credit",
    currentBalanceType: "credit",
  },

  // =========================
  // INCOME
  // =========================
  {
    accountCode: "4001",
    accountName: "Sales Revenue",
    accountType: "income",
    openingBalanceType: "credit",
    currentBalanceType: "credit",
  },
  {
    accountCode: "4101",
    accountName: "Service Revenue",
    accountType: "income",
    openingBalanceType: "credit",
    currentBalanceType: "credit",
  },
  {
    accountCode: "4201",
    accountName: "Other Income",
    accountType: "income",
    openingBalanceType: "credit",
    currentBalanceType: "credit",
  },

  // =========================
  // EXPENSES
  // =========================
  {
    accountCode: "5001",
    accountName: "Rent Expense",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "5101",
    accountName: "Salary Expense",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "5201",
    accountName: "Utilities Expense",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "5301",
    accountName: "Office Supplies Expense",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "5401",
    accountName: "Transport Expense",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "5501",
    accountName: "Marketing Expense",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
];

// ========================================
// SEED FUNCTION
// ========================================

async function seed() {
  try {
    // CONNECT DATABASE
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("✅ Database Connected");

    // ========================================
    // CREATE ADMIN
    // ========================================

    let admin = await User.findOne({
      email: process.env.SEED_ADMIN_EMAIL,
    });

    if (!admin) {
      const hashedPassword = await bcrypt.hash(
        process.env.SEED_ADMIN_PASSWORD,
        10,
      );

      admin = await User.create({
        name: "Director",
        email: process.env.SEED_ADMIN_EMAIL,
        password: hashedPassword,
        role: "director",
      });

      console.log("✅ Admin Created");
    } else {
      console.log("✅ Admin Already Exists");
    }

    // ========================================
    // SEED ACCOUNTS
    // ========================================

    for (const account of defaultAccounts) {
      await Account.updateOne(
        {
          accountCode: account.accountCode,
        },
        {
          $setOnInsert: {
            ...account,

            openingDate: new Date(),

            description: "",

            openingBalance: 0,
            currentBalance: 0,

            parentAccount: null,

            hasTransactions: false,

            status: "active",

            deletedAt: null,
            deletedBy: null,

            createdBy: admin._id,
          },
        },
        {
          upsert: true,
        },
      );
    }

    console.log("✅ Chart Of Accounts Seeded");

    console.log("🎉 Seed Completed Successfully");

    process.exit(0);
  } catch (error) {
    console.error("❌ Seed Error:", error);

    process.exit(1);
  }
}

seed();
