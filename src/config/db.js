import mongoose from 'mongoose';
import logger from './logger.js';

const connectDB = async () => {
  try {
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB connection lost/disconnected. Mongoose will attempt auto-reconnect.');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB connection re-established.');
    });

    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB runtime connection error: ${err.message}`);
    });

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000, // 10 second server selection timeout
    });

    logger.info(`MongoDB Connected: ${conn.connection.host} | DB: ${conn.connection.name} | ReadyState: ${conn.connection.readyState}`);
  } catch (error) {
    logger.error(`Error connecting to MongoDB: ${error.message}`);
    throw error;
  }
};

export default connectDB;
