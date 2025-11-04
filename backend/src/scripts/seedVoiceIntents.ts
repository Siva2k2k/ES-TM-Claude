import 'module-alias/register';
import dotenv from 'dotenv';
import { connectDB } from '../config/database';
import { seedIntentDefinitions } from '../seeds/intentDefinitions';
import IntentDefinition from '../models/IntentDefinition';
import logger from '../config/logger';

dotenv.config();

/**
 * Seed Voice Intent Definitions Only
 * Run: npm run seed:voice
 */
async function seedVoiceIntents() {
  try {
    // Connect to MongoDB
    await connectDB();
    logger.info('MongoDB connected successfully');

    // Seed intent definitions
    logger.info('Seeding voice intent definitions...');
    await seedIntentDefinitions();

    // Display summary
    const count = await IntentDefinition.countDocuments();
    const categories = await IntentDefinition.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    logger.info('✅ Voice intent seeding completed successfully!');
    logger.info('Intent Summary:', {
      totalIntents: count,
      byCategory: categories.reduce((acc, cat) => {
        acc[cat._id] = cat.count;
        return acc;
      }, {} as Record<string, number>)
    });

    console.log('\n✅ Voice intents seeded successfully!');
    console.log(`📊 Total Intents: ${count}`);
    console.log('📂 By Category:');
    categories.forEach(cat => {
      console.log(`   - ${cat._id}: ${cat.count} intents`);
    });

  } catch (error) {
    logger.error('Failed to seed voice intents', { error });
    console.error('❌ Error seeding voice intents:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run if called directly
seedVoiceIntents();
