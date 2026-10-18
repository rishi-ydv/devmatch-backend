import mongoose from 'mongoose';
import config from './enviroment.config.js';

const connectDB = async () => {
  try {
    await mongoose.connect(config.mongoURI);
    console.log(`MongoDB connected successfully`);
  } catch (error) {
    console.error(`MongoDB connection failed: ❌ ${error.message}`);
    throw error;
  }
};

export default connectDB;
