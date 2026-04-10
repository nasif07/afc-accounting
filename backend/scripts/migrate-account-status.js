/**
 * Migration Script: Fix Account Status
 * 
 * This script updates all existing accounts that have null/undefined status
 * to status='active' so they can be used in journal entries.
 * 
 * Run with: node backend/scripts/migrate-account-status.js
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const ChartOfAccounts = require('../src/modules/chartOfAccounts/coa.model');

async function migrateAccountStatus() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL;
    if (!mongoUri) {
      throw new Error('MONGODB_URI or DATABASE_URL not set in environment variables');
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find all accounts with null or undefined status
    console.log('\n📊 Checking accounts with missing status...');
    const accountsWithoutStatus = await ChartOfAccounts.find({
      $or: [
        { status: null },
        { status: undefined },
        { status: { $exists: false } }
      ]
    });

    console.log(`Found ${accountsWithoutStatus.length} accounts without status`);

    if (accountsWithoutStatus.length === 0) {
      console.log('✅ All accounts already have status field');
      await mongoose.connection.close();
      process.exit(0);
    }

    // Update all accounts to status='active'
    console.log('\n🔄 Updating accounts to status="active"...');
    const result = await ChartOfAccounts.updateMany(
      {
        $or: [
          { status: null },
          { status: undefined },
          { status: { $exists: false } }
        ]
      },
      { $set: { status: 'active' } }
    );

    console.log(`✅ Updated ${result.modifiedCount} accounts`);

    // Verify the update
    console.log('\n✓ Verifying update...');
    const accountsStillWithoutStatus = await ChartOfAccounts.find({
      $or: [
        { status: null },
        { status: undefined },
        { status: { $exists: false } }
      ]
    });

    if (accountsStillWithoutStatus.length === 0) {
      console.log('✅ All accounts now have status="active"');
    } else {
      console.log(`⚠️  ${accountsStillWithoutStatus.length} accounts still without status`);
    }

    // Show summary
    console.log('\n📈 Account Status Summary:');
    const statusCounts = await ChartOfAccounts.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    statusCounts.forEach(item => {
      console.log(`  ${item._id || 'undefined'}: ${item.count}`);
    });

    console.log('\n✅ Migration completed successfully!');
    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run migration
migrateAccountStatus();
