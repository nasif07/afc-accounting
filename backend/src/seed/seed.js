// src/seed/seed.js

const mongoose = require("mongoose");
const dotenv = require("dotenv");

const User = require("../modules/users/user.model");
const Account = require("../modules/chartOfAccounts/coa.model");
const logger = require("../utils/logger");

dotenv.config();

// DEFAULT CHART OF ACCOUNTS

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
  // Parent head for Fixed Deposit Receipts. Each FDR is a child account
  // created under this one, the same way individual bank accounts sit under
  // 1002 — balances and transaction counts are read from the journal ledger.
  {
    accountCode: "1100",
    accountName: "FDR",
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

  // =========================
  // INCOME — Academic Income
  // =========================
  {
    accountCode: "4300",
    accountName: "Academic Income",
    accountType: "income",
    openingBalanceType: "credit",
    currentBalanceType: "credit",
  },
  {
    accountCode: "4301",
    accountName: "Course Fee - AFC (Adults, Teenagers +16 & Intensive)",
    accountType: "income",
    openingBalanceType: "credit",
    currentBalanceType: "credit",
  },
  {
    accountCode: "4302",
    accountName: "Course Fee (Outside)",
    accountType: "income",
    openingBalanceType: "credit",
    currentBalanceType: "credit",
  },
  {
    accountCode: "4303",
    accountName: "Examinations Fees",
    accountType: "income",
    openingBalanceType: "credit",
    currentBalanceType: "credit",
  },
  {
    accountCode: "4304",
    accountName: "Course Fee (Private)",
    accountType: "income",
    openingBalanceType: "credit",
    currentBalanceType: "credit",
  },
  {
    accountCode: "4305",
    accountName: "Course Fee (Children & Junior)",
    accountType: "income",
    openingBalanceType: "credit",
    currentBalanceType: "credit",
  },
  {
    accountCode: "4306",
    accountName: "Course Fee (Online)",
    accountType: "income",
    openingBalanceType: "credit",
    currentBalanceType: "credit",
  },

  // =========================
  // INCOME — Sale of Books
  // =========================
  {
    accountCode: "4400",
    accountName: "Sale of Books",
    accountType: "income",
    openingBalanceType: "credit",
    currentBalanceType: "credit",
  },
  {
    accountCode: "4401",
    accountName: "Text Books",
    accountType: "income",
    openingBalanceType: "credit",
    currentBalanceType: "credit",
  },
  {
    accountCode: "4402",
    accountName: "Dictionary",
    accountType: "income",
    openingBalanceType: "credit",
    currentBalanceType: "credit",
  },
  {
    accountCode: "4403",
    accountName: "Grammar Books (Conjugation)",
    accountType: "income",
    openingBalanceType: "credit",
    currentBalanceType: "credit",
  },
  {
    accountCode: "4404",
    accountName: "Photocopies",
    accountType: "income",
    openingBalanceType: "credit",
    currentBalanceType: "credit",
  },

  // =========================
  // INCOME — Association Income
  // =========================
  {
    accountCode: "4500",
    accountName: "Association Income",
    accountType: "income",
    openingBalanceType: "credit",
    currentBalanceType: "credit",
  },
  {
    accountCode: "4501",
    accountName: "Benefactor Membership",
    accountType: "income",
    openingBalanceType: "credit",
    currentBalanceType: "credit",
  },
  {
    accountCode: "4502",
    accountName: "Couple Membership",
    accountType: "income",
    openingBalanceType: "credit",
    currentBalanceType: "credit",
  },
  {
    accountCode: "4503",
    accountName: "Single Membership",
    accountType: "income",
    openingBalanceType: "credit",
    currentBalanceType: "credit",
  },
  {
    accountCode: "4504",
    accountName: "Student Membership",
    accountType: "income",
    openingBalanceType: "credit",
    currentBalanceType: "credit",
  },
  {
    accountCode: "4505",
    accountName: "Foreign Membership / International Volunteer",
    accountType: "income",
    openingBalanceType: "credit",
    currentBalanceType: "credit",
  },
  {
    accountCode: "4506",
    accountName: "Members Group",
    accountType: "income",
    openingBalanceType: "credit",
    currentBalanceType: "credit",
  },
  {
    accountCode: "4507",
    accountName: "Duplicate ID Card",
    accountType: "income",
    openingBalanceType: "credit",
    currentBalanceType: "credit",
  },

  // =========================
  // INCOME — Receipt from Cultural Activities
  // =========================
  {
    accountCode: "4600",
    accountName: "Receipt from Cultural Activities",
    accountType: "income",
    openingBalanceType: "credit",
    currentBalanceType: "credit",
  },
  {
    accountCode: "4601",
    accountName: "Cafe de Paris",
    accountType: "income",
    openingBalanceType: "credit",
    currentBalanceType: "credit",
  },
  {
    accountCode: "4602",
    accountName: "Sponsoring",
    accountType: "income",
    openingBalanceType: "credit",
    currentBalanceType: "credit",
  },

  // =========================
  // INCOME — Subvention / Donation
  // =========================
  {
    accountCode: "4700",
    accountName: "Subvention / Donation",
    accountType: "income",
    openingBalanceType: "credit",
    currentBalanceType: "credit",
  },
  {
    accountCode: "4701",
    accountName: "Subvention",
    accountType: "income",
    openingBalanceType: "credit",
    currentBalanceType: "credit",
  },
  {
    accountCode: "4702",
    accountName: "Donation",
    accountType: "income",
    openingBalanceType: "credit",
    currentBalanceType: "credit",
  },

  // =========================
  // INCOME — Other Income
  // =========================
  {
    accountCode: "4801",
    accountName: "Advertisement",
    accountType: "income",
    openingBalanceType: "credit",
    currentBalanceType: "credit",
  },
  {
    accountCode: "4802",
    accountName: "Translation",
    accountType: "income",
    openingBalanceType: "credit",
    currentBalanceType: "credit",
  },
  {
    accountCode: "4803",
    accountName: "FDR Interest",
    accountType: "income",
    openingBalanceType: "credit",
    currentBalanceType: "credit",
  },
  {
    accountCode: "4804",
    accountName: "Loan",
    accountType: "income",
    openingBalanceType: "credit",
    currentBalanceType: "credit",
  },
  {
    accountCode: "4805",
    accountName: "Sale of Asset",
    accountType: "income",
    openingBalanceType: "credit",
    currentBalanceType: "credit",
  },

  // =========================
  // EXPENDITURE — Purchase of Fixed Assets
  // =========================
  {
    accountCode: "5600",
    accountName: "Purchase of Fixed Assets",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "5601",
    accountName: "Furniture",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "5602",
    accountName: "Office Equipment",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "5603",
    accountName: "Generator",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "5604",
    accountName: "Air Conditioner",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "5605",
    accountName: "Electrical Equipment",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "5606",
    accountName: "CCTV",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },

  // =========================
  // EXPENDITURE — Employee Salary & Others
  // =========================
  {
    accountCode: "5700",
    accountName: "Employee Salary & Others",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "5701",
    accountName: "Teacher - Contractual & Permanent",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "5702",
    accountName: "Teacher (Paid by the Hours)",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "5703",
    accountName: "Administrative & Supportive Staff (Contractual & Permanent)",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "5704",
    accountName: "Private Class",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "5705",
    accountName: "Overtime / Extra Class Hours",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "5706",
    accountName: "13th Month Salary",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },

  // =========================
  // EXPENDITURE — Employee Benefits
  // =========================
  {
    accountCode: "5800",
    accountName: "Employee Benefits",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "5801",
    accountName: "Retirement Benefit / Compensation",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "5802",
    accountName: "Contract Liquidation",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "5803",
    accountName: "Health Fund",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },

  // =========================
  // EXPENDITURE — Structures
  // =========================
  {
    accountCode: "5900",
    accountName: "Structures",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "5901",
    accountName: "Repairing & Maintenance (Building)",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "5902",
    accountName: "Repairing & Maintenance (Material / Equipment)",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },

  // =========================
  // EXPENDITURE — Operating Expenditures from Petty Cash
  // =========================
  {
    accountCode: "6000",
    accountName: "Operating Expenditures from Petty Cash",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "6001",
    accountName: "Café",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "6002",
    accountName: "Cleaning & Toiletries",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "6003",
    accountName: "Postage & Courier",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "6004",
    accountName: "Fuel Cost - Generator",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "6005",
    accountName: "Electricity Cost",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "6006",
    accountName: "House Rent",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "6007",
    accountName: "Legal Expenditure / Advocate's Fee",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "6008",
    accountName: "Newspaper Bill",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "6009",
    accountName: "Refreshment Cost (Snacks / Lunch)",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "6010",
    accountName: "Repair & Maintenance (Building & Equipment)",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "6011",
    accountName: "Safety & Emergency",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "6012",
    accountName: "Stationery",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "6013",
    accountName: "Telephone Bill",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "6014",
    accountName: "Transgender Monthly Allowance & Bonus",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "6015",
    accountName: "Transportation Cost - Course",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "6016",
    accountName: "Transportation Cost - Office",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "6017",
    accountName: "Water Bill",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "6018",
    accountName: "Gas Bill",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "6019",
    accountName: "Miscellaneous Official Expenditure",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },

  // =========================
  // EXPENDITURE — General Expenditure
  // =========================
  {
    accountCode: "6100",
    accountName: "General Expenditure",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "6101",
    accountName: "Internet Bill",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "6102",
    accountName: "Security Services (G4S)",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },

  // =========================
  // EXPENDITURE — Activities
  // =========================
  {
    accountCode: "6200",
    accountName: "Activities",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "6201",
    accountName: "Cultural Activities / Events",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },

  // =========================
  // EXPENDITURE — Teaching Expenditures
  // =========================
  {
    accountCode: "6300",
    accountName: "Teaching Expenditures",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "6301",
    accountName: "Training (Teacher)",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "6302",
    accountName: "Examinations",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "6303",
    accountName: "Miscellaneous",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },

  // =========================
  // EXPENDITURE — Others
  // =========================
  {
    accountCode: "6400",
    accountName: "Others",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "6401",
    accountName: "Translation",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "6402",
    accountName: "Tax Deducted at Source",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "6403",
    accountName: "Renovation - CU IML",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "6404",
    accountName: "Air Ticket",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "6405",
    accountName: "Income Tax Payment through A-Challan",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "6406",
    accountName: "Legal & Professional Fee",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "6407",
    accountName: "Fire Insurance Premium",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "6408",
    accountName: "Bank Charge",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "6409",
    accountName: "Previous Year Audit Fee",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "6410",
    accountName: "Library Expenses (Resource Center)",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "6411",
    accountName: "Trade License / RJSC",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "6412",
    accountName: "Refund (Course Fee & Others)",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "6413",
    accountName: "Accommodation Bill",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },

  // =========================
  // EXPENDITURE — Advance Income Tax
  // =========================
  {
    accountCode: "6500",
    accountName: "Advance Income Tax",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
  {
    accountCode: "6501",
    accountName: "AIT (FDR & Bank)",
    accountType: "expense",
    openingBalanceType: "debit",
    currentBalanceType: "debit",
  },
];

// SEED FUNCTION

async function seed() {
  try {
    // CONNECT DATABASE
    await mongoose.connect(process.env.MONGODB_URI);

    logger.info("Database connected");

    // CREATE ADMIN
    if (!process.env.SEED_ADMIN_EMAIL || !process.env.SEED_ADMIN_PASSWORD) {
      throw new Error(
        "SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required for seeding.",
      );
    }

    let admin = await User.findOne({
      email: process.env.SEED_ADMIN_EMAIL,
    });

    if (!admin) {
      admin = await User.create({
        name: "Director",
        email: process.env.SEED_ADMIN_EMAIL,
        password: process.env.SEED_ADMIN_PASSWORD,
        role: "director",
        status: "approved",
        isActive: true,
      });

      logger.info("Admin created");
    } else {
      logger.info("Admin already exists");
    }

    // SEED ACCOUNTS

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

    logger.info("Chart of accounts seeded");

    logger.info("Seed completed successfully");

    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, "Seed error");

    process.exit(1);
  }
}

seed();
