import mongoose from 'mongoose';
import dotenv from 'dotenv';
import logger from './logger';

// Ensure environment variables are loaded
dotenv.config();

const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/timesheet-management';
    
    logger.info('🔄 Connecting to MongoDB...');
    logger.info(`📡 Connection URI: ${mongoURI.replace(/\/\/.*@/, '//***:***@')}`); // Hide credentials in logs
    
    const conn = await mongoose.connect(mongoURI, {
      // Connection options for better reliability
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      bufferCommands: false // Disable mongoose buffering
    });

    logger.info(`✅ MongoDB Connected Successfully!`);
    logger.info(`🏢 Host: ${conn.connection.host}`);
    logger.info(`📁 Database: ${conn.connection.name}`);
    logger.info(`⚡ Ready State: ${conn.connection.readyState === 1 ? 'Connected' : 'Not Connected'}`);
    
    // Set up connection event listeners for monitoring
    mongoose.connection.on('error', (err) => {
      logger.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('🔄 MongoDB reconnected successfully');
    });

    mongoose.connection.on('connecting', () => {
      logger.info('🔄 Attempting to connect to MongoDB...');
    });

    mongoose.connection.on('connected', () => {
      logger.info('✅ MongoDB connection established');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('📴 MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    logger.error('❌ Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

export { connectDB, connectDB as connectToDatabase };