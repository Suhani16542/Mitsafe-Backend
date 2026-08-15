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

    const targetEmail = (process.env.ADMIN_EMAIL || 'modern@mitsafe.com').trim().toLowerCase();
    const newPassword = process.env.ADMIN_PASSWORD || 'modern123';

    // Find admin by target email or find existing admin record
    let admin = await Admin.findOne({ email: targetEmail });
    if (!admin) {
      admin = await Admin.findOne();
    }

    if (admin) {
      admin.email = targetEmail;
      admin.password = newPassword;
      await admin.save();
      console.log(`Admin account updated successfully with email: ${admin.email}`);
    } else {
      await Admin.create({
        email: targetEmail,
        password: newPassword,
      });
      console.log(`Admin account created successfully with email: ${targetEmail}`);
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
