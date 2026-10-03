/**
 * One-off: store every bank reconciliation period as whole Dhaka days.
 *
 * Periods used to be saved as bare dates (midnight UTC = 06:00 Dhaka), so the
 * ledger cutoff dropped any voucher timestamped later on the period's last
 * day, and the statement's book balance disagreed with the Bank Book's
 * closing balance. New periods are normalized on create
 * (BankReconciliationService.normalizePeriod); this brings old ones in line.
 *
 * Finalized periods are included — the boundary was wrong, not the sign-off —
 * and the report prints each one's book balance before and after so any
 * statement whose figure moves is visible. It also lists overlapping periods
 * and adjustment lines dated outside their period, which it does not change.
 *
 * Run with: npm run normalize:reconciliation-periods            (dry run)
 *           npm run normalize:reconciliation-periods -- --apply
 */

require("dotenv").config();
const mongoose = require("mongoose");

const BankReconciliation = require("../src/modules/bankBook/bankReconciliation.model");
const BankReconciliationService = require("../src/modules/bankBook/bankReconciliation.service");
const BankService = require("../src/modules/bank/bank.service");
const JournalEntry = require("../src/modules/accounting/accounting.model");

const ADJUSTMENT_TYPES = [
  "bankCreditsNotInBooks",
  "outstandingCheques",
  "previousDepositsInTransit",
  "previousOutstandingCheques",
  "depositsInTransit",
  "bankCharges",
];
const apply = process.argv.includes("--apply");
const day = (value) => BankReconciliationService.dhakaISODate(value);

// Same sum calculateCoaLedgerBalance does, without its opening-balance
// dedupe side effect — this script only writes period dates.
async function ledgerBalance(accountId, asOf) {
  const entries = await JournalEntry.find({
    "bookEntries.account": accountId,
    status: "posted",
    approvalStatus: "approved",
    deletedAt: null,
    voucherDate: { $lte: asOf },
  });

  return entries.reduce((balance, entry) => {
    const line = BankService.getBankLine(entry.toJSON(), accountId);
    return balance + Number(line?.debit || 0) - Number(line?.credit || 0);
  }, 0);
}

async function run() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error("MONGODB_URI is not set");

  await mongoose.connect(mongoUri);

  const reconciliations = await BankReconciliation.find({}).sort({ bankAccount: 1, periodStart: 1 });
  let changed = 0;

  for (const rec of reconciliations) {
    const { start, end } = BankReconciliationService.normalizePeriod(rec.periodStart, rec.periodEnd);
    const label = `${rec._id} (${rec.status}) ${day(rec.periodStart)} to ${day(rec.periodEnd)}`;

    for (const type of ADJUSTMENT_TYPES) {
      for (const line of rec[type] || []) {
        if (day(line.date) > day(rec.periodEnd)) {
          console.log(`  NOTE ${label}: ${type} "${line.description}" is dated ${day(line.date)}, after the period ends`);
        }
      }
    }

    if (
      new Date(rec.periodStart).getTime() === start.getTime() &&
      new Date(rec.periodEnd).getTime() === end.getTime()
    ) {
      continue;
    }

    const before = await ledgerBalance(rec.bankAccount, rec.periodEnd);
    const after = await ledgerBalance(rec.bankAccount, end);
    const moved = before === after ? "" : `  <-- book balance ${before} -> ${after}`;

    console.log(`${apply ? "FIX " : "WOULD FIX"} ${label}${moved}`);
    changed++;

    if (apply) {
      // updateOne, not save/findOneAndUpdate: the model blocks query edits to
      // finalized periods, and this is a storage fix, not an edit.
      await BankReconciliation.updateOne(
        { _id: rec._id },
        { $set: { periodStart: start, periodEnd: end } },
      );
    }
  }

  // Overlaps are reported only — which period to keep is a judgement call.
  const byAccount = new Map();
  for (const rec of reconciliations.filter((r) => !r.deletedAt)) {
    const key = String(rec.bankAccount);
    byAccount.set(key, [...(byAccount.get(key) || []), rec]);
  }
  for (const recs of byAccount.values()) {
    for (let i = 0; i < recs.length; i++) {
      for (let j = i + 1; j < recs.length; j++) {
        const [a, b] = [recs[i], recs[j]];
        if (day(a.periodStart) <= day(b.periodEnd) && day(b.periodStart) <= day(a.periodEnd)) {
          console.log(
            `  OVERLAP ${a._id} (${a.status}) ${day(a.periodStart)}..${day(a.periodEnd)} ` +
              `and ${b._id} (${b.status}) ${day(b.periodStart)}..${day(b.periodEnd)}`,
          );
        }
      }
    }
  }

  console.log(`\n${changed} period(s) ${apply ? "updated" : "to normalize"}.`);
  if (!apply && changed) console.log("Re-run with --apply to write the changes.");
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
