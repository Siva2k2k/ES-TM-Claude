/**
 * Database Backup Script
 * Creates a JSON backup of all collections before schema cleanup
 *
 * Usage: node scripts/backup-database.js
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://Admin:1234@localhost:27017/timesheet-management?authSource=admin';
const BACKUP_DIR = path.join(__dirname, '..', 'backups');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const BACKUP_FILE = path.join(BACKUP_DIR, `backup-${timestamp}.json`);

async function createBackup() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const backup = {
      timestamp: new Date().toISOString(),
      database: 'timesheet-management',
      collections: {}
    };

    // Create backup directory if it doesn't exist
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
      console.log('📁 Created backup directory');
    }

    // Get all collections
    const collections = await db.listCollections().toArray();
    console.log(`\n📊 Found ${collections.length} collections to backup\n`);

    // Backup each collection
    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      const collection = db.collection(collectionName);
      const documents = await collection.find({}).toArray();

      backup.collections[collectionName] = {
        count: documents.length,
        documents: documents
      };

      console.log(`  ✓ ${collectionName}: ${documents.length} documents`);
    }

    // Write backup to file
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(backup, null, 2));

    const stats = fs.statSync(BACKUP_FILE);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log(`\n✅ Backup completed successfully!`);
    console.log(`📄 Backup file: ${BACKUP_FILE}`);
    console.log(`📦 File size: ${fileSizeMB} MB`);
    console.log(`\n💡 To restore, use: node scripts/restore-database.js ${BACKUP_FILE}`);

    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run backup
createBackup();
