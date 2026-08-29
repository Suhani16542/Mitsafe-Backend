import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Category from '../models/category.model.js';

dotenv.config();

const categoriesToSeed = [
  {
    name: 'Case Studies',
    slug: 'case-studies',
    description: 'In-depth client success stories and project architectural breakdowns.',
    status: 'active',
  },
  {
    name: 'Web Development & Design',
    slug: 'web-development-design',
    description: 'Modern frontend, backend architecture, Next.js, and visual UI/UX systems.',
    status: 'active',
  },
  {
    name: 'Digital Marketing',
    slug: 'digital-marketing',
    description: 'Growth marketing, search engine optimization (SEO), and content strategies.',
    status: 'active',
  },
  {
    name: 'Performance Marketing',
    slug: 'performance-marketing',
    description: 'Paid ad campaigns, conversion rate optimization, and ROI-driven marketing.',
    status: 'active',
  },
  {
    name: 'Business & Technology',
    slug: 'business-technology',
    description: 'Enterprise automation, business agility, SaaS platforms, and cloud adoption.',
    status: 'active',
  },
  {
    name: 'Website Tips & Guides',
    slug: 'website-tips-guides',
    description: 'Practical actionable tutorials, website performance benchmarks, and best practices.',
    status: 'active',
  },
  {
    name: 'Local Business',
    slug: 'local-business',
    description: 'Hyper-local SEO strategies, digital presence, and local lead generation.',
    status: 'active',
  },
];

const seedCategories = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('Error: MONGODB_URI is not defined in environment variables.');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB for categories seeding...');

    for (const cat of categoriesToSeed) {
      await Category.findOneAndUpdate(
        { name: cat.name },
        { $set: cat },
        { upsert: true, new: true }
      );
      console.log(`Upserted category: ${cat.name}`);
    }

    const activeCount = await Category.countDocuments({ status: 'active' });
    console.log(`Successfully verified ${activeCount} active categories in database.`);

    await mongoose.connection.close();
    console.log('Database connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('Failed to seed categories:', error.message);
    process.exit(1);
  }
};

seedCategories();
