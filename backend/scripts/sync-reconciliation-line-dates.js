/**
 * One-off: bring posted bank reconciliation lines back in line with their
 * journal entry's voucherDate.
 *
 * Journal edits now carry a date change through to the line
 * (AccountingService.syncReconciliationLineDates), but lines whose voucher
 * was re-dated before that change still hold the old date. Finalized
 * reconciliations are reported, never changed.
 *
 * Run with: npm run sync:reconciliation-dates            (dry run)
 *           npm run sync:reconciliation-dates -- --apply
 */

require("dotenv").config();
const mongoose = require("mongoose");

const BankReconciliation = require("../src/modules/bankBook/bankReconciliation.model");
const JournalEntry = require("../src/modules/accounting/accounting.model");

const POSTABLE_TYPES = ["bankCreditsNotInBooks", "bankCharges"];
const apply = process.argv.includes("--apply");

async function run() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error("MONGODB_URI is not set");

  await mongoose.connect(mongoUri);

  const reconciliations = await BankReconciliation.find({
    $or: POSTABLE_TYPES.map((type) => ({ [`${type}.journalEntryId`]: { $ne: null } })),
  });

  let fixed = 0;
  let skipped = 0;

  for (const reconciliation of reconciliations) {
    let changed = false;

    for (const type of POSTABLE_TYPES) {
      for (const line of reconciliation[type]) {
        if (!line.journalEntryId) continue;

        const entry = await JournalEntry.findById(line.journalEntryId).select("voucherNumber voucherDate");
        if (!entry) continue;

        if (new Date(line.date).getTime() === new Date(entry.voucherDate).getTime()) continue;

        const from = new Date(line.date).toISOString().slice(0, 10);
        const to = new Date(entry.voucherDate).toISOString().slice(0, 10);

        if (reconciliation.status === "finalized") {
          console.log(`SKIP (finalized) ${entry.voucherNumber}: line ${from}, journal ${to}`);
          skipped++;
          continue;
        }

        console.log(`${apply ? "FIX " : "WOULD FIX"} ${entry.voucherNumber}: ${from} -> ${to}`);
        line.date = entry.voucherDate;
        changed = true;
        fixed++;
      }
    }

    if (changed && apply) await reconciliation.save();
  }

  console.log(`\n${fixed} line(s) ${apply ? "updated" : "out of sync"}, ${skipped} skipped (finalized).`);
  if (!apply && fixed) console.log("Re-run with --apply to write the changes.");
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
