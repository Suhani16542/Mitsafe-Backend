import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Admin from '../models/admin.model.js';
import logger from '../config/logger.js';

dotenv.config();

const seedAdmin = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('Error: MONGODB_URI is not defined in environment variables.');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB for admin seeding...');

    const email = (process.env.ADMIN_EMAIL || 'admin@mitsafe.com').toLowerCase();
    const password = process.env.ADMIN_PASSWORD || 'Admin@mitsafe123!';

    const existingAdmin = await Admin.findOne({ email });

    if (existingAdmin) {
      existingAdmin.password = password;
      await existingAdmin.save();
      console.log(`Admin account (${email}) password updated/reset successfully.`);
    } else {
      await Admin.create({
        email,
        password,
      });
      console.log(`Admin account (${email}) created successfully.`);
    }

    await mongoose.connection.close();
    console.log('Database connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('Failed to seed admin account:', error.message);
    process.exit(1);
  }
};

seedAdmin();
