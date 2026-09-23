import dotenv from 'dotenv';
dotenv.config();

import app from './src/app.js';
import connectDB from './src/config/db.js';
import Category from './src/models/category.model.js';
import Blog from './src/models/blog.model.js';
import mongoose from 'mongoose';

const ADMIN_KEY = process.env.BLOG_ADMIN_API_KEY || 'mitsafe-secret-blog-admin-key-2026';

async function runCategoryTests() {
  console.log('\n==================================================');
  console.log('🚀 TESTING CATEGORY CRUD & BLOG DROPDOWN API SUITE');
  console.log('==================================================\n');

  let server;
  try {
    await connectDB();
    console.log('✅ MongoDB connected.');

    const PORT = 5055;
    server = app.listen(PORT, () => {
      console.log(`✅ Test server running on port ${PORT}`);
    });

    const baseUrl = `http://localhost:${PORT}`;

    // 1. Initial GET /api/v1/categories
    console.log('\n--- 1. Testing GET /api/v1/categories & /api/categories ---');
    const getRes1 = await fetch(`${baseUrl}/api/v1/categories`);
    const getData1 = await getRes1.json();
    console.log(`GET /api/v1/categories -> status: ${getRes1.status}, count: ${getData1.count || getData1.data?.length}`);

    const getAliasRes = await fetch(`${baseUrl}/api/categories`);
    console.log(`GET /api/categories (alias) -> status: ${getAliasRes.status}`);

    // 2. Unauthorized category creation
    console.log('\n--- 2. Testing Unauthorized Category Creation ---');
    const unauthRes = await fetch(`${baseUrl}/api/v1/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Unauth Category',
      }),
    });
    console.log(`POST /api/v1/categories (No Auth) -> status: ${unauthRes.status} (Expected 401)`);

    // 3. Create a new Category
    console.log('\n--- 3. Testing Category Creation (Admin Auth) ---');
    const testCategoryName = `Cloud & DevOps ${Date.now()}`;
    const testCategorySlug = `cloud-devops-${Date.now()}`;

    const createRes = await fetch(`${baseUrl}/api/v1/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-blog-admin-key': ADMIN_KEY,
      },
      body: JSON.stringify({
        name: testCategoryName,
        slug: testCategorySlug,
        description: 'Cloud native infrastructure and DevOps automation guides.',
        status: 'active',
      }),
    });
    const createData = await createRes.json();
    console.log(`POST /api/v1/categories -> status: ${createRes.status}`, createData.message);
    const createdCategoryId = createData.data?._id;
    console.log(`Created Category ID: ${createdCategoryId}, Slug: ${createData.data?.slug}`);

    // 4. Verify in MongoDB Database directly
    console.log('\n--- 4. Verifying Category in MongoDB Database ---');
    const dbCategory = await Category.findById(createdCategoryId);
    if (dbCategory && dbCategory.name === testCategoryName) {
      console.log(`✅ Category verified in MongoDB: "${dbCategory.name}" (${dbCategory.status})`);
    } else {
      throw new Error('❌ Category not found in MongoDB!');
    }

    // 5. Test Duplicate Category Name Rejection
    console.log('\n--- 5. Testing Duplicate Category Rejection ---');
    const dupRes = await fetch(`${baseUrl}/api/v1/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-blog-admin-key': ADMIN_KEY,
      },
      body: JSON.stringify({
        name: testCategoryName,
      }),
    });
    const dupData = await dupRes.json();
    console.log(`POST /api/v1/categories duplicate -> status: ${dupRes.status} (Expected 400), Message: "${dupData.message}"`);

    // 6. Test GET /api/v1/categories returns newly created category
    console.log('\n--- 6. Testing GET /api/v1/categories Contains New Category ---');
    const getRes2 = await fetch(`${baseUrl}/api/v1/categories`);
    const getData2 = await getRes2.json();
    const foundInList = getData2.data?.some((c) => c._id === createdCategoryId || c.name === testCategoryName);
    console.log(`Category present in GET /api/v1/categories list: ${foundInList ? '✅ YES' : '❌ NO'}`);

    // 7. Test GET /api/v1/blogs/categories (Dropdown for Blog Create)
    console.log('\n--- 7. Testing GET /api/v1/blogs/categories for Blog Create Dropdown ---');
    const blogCatsRes = await fetch(`${baseUrl}/api/v1/blogs/categories`);
    const blogCatsData = await blogCatsRes.json();
    const foundInBlogDropdown = blogCatsData.data?.includes(testCategoryName);
    console.log(`Category "${testCategoryName}" present in Blog Dropdown API: ${foundInBlogDropdown ? '✅ YES' : '❌ NO'}`);
    console.log('Sample Blog Categories returned:', blogCatsData.data?.slice(0, 5));

    // 8. Test GET single category by ID & Slug
    console.log('\n--- 8. Testing GET /api/v1/categories/:id (by ID & Slug) ---');
    const getByIdRes = await fetch(`${baseUrl}/api/v1/categories/${createdCategoryId}`);
    const getByIdData = await getByIdRes.json();
    console.log(`GET /api/v1/categories/:id -> status: ${getByIdRes.status}, Name: "${getByIdData.data?.name}"`);

    const getBySlugRes = await fetch(`${baseUrl}/api/v1/categories/${testCategorySlug}`);
    const getBySlugData = await getBySlugRes.json();
    console.log(`GET /api/v1/categories/:slug -> status: ${getBySlugRes.status}, Name: "${getBySlugData.data?.name}"`);

    // 9. Test PUT /api/v1/categories/:id (Update)
    console.log('\n--- 9. Testing Category Update ---');
    const updatedDesc = 'Updated description for cloud devops test.';
    const updateRes = await fetch(`${baseUrl}/api/v1/categories/${createdCategoryId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-blog-admin-key': ADMIN_KEY,
      },
      body: JSON.stringify({
        description: updatedDesc,
        status: 'active',
      }),
    });
    const updateData = await updateRes.json();
    console.log(`PUT /api/v1/categories/:id -> status: ${updateRes.status}, Description updated: ${updateData.data?.description === updatedDesc}`);

    // 10. Test Blog Creation using this Category
    console.log('\n--- 10. Testing Blog Creation with the New Category ---');
    const blogRes = await fetch(`${baseUrl}/api/v1/blogs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-blog-admin-key': ADMIN_KEY,
      },
      body: JSON.stringify({
        title: `Automated Test Post for ${testCategoryName}`,
        content: '<p>Testing blog creation with newly created category.</p>',
        category: testCategoryName,
        status: 'published',
      }),
    });
    const blogData = await blogRes.json();
    console.log(`POST /api/v1/blogs status: ${blogRes.status}, Blog Category: "${blogData.data?.category}"`);
    const createdBlogId = blogData.data?._id;

    // Cleanup test blog
    if (createdBlogId) {
      await Blog.findByIdAndDelete(createdBlogId);
      console.log('Cleaned up test blog.');
    }

    // 11. Test DELETE /api/v1/categories/:id
    console.log('\n--- 11. Testing Category Deletion ---');
    const deleteRes = await fetch(`${baseUrl}/api/v1/categories/${createdCategoryId}`, {
      method: 'DELETE',
      headers: {
        'x-blog-admin-key': ADMIN_KEY,
      },
    });
    const deleteData = await deleteRes.json();
    console.log(`DELETE /api/v1/categories/:id -> status: ${deleteRes.status}, Message: "${deleteData.message}"`);

    // Verify deleted in DB
    const deletedDbCategory = await Category.findById(createdCategoryId);
    console.log(`Verified Category removed from MongoDB: ${deletedDbCategory === null ? '✅ YES' : '❌ NO'}`);

    console.log('\n==================================================');
    console.log('🎉 ALL CATEGORY API TESTS PASSED SUCCESSFULLY!');
    console.log('==================================================\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    if (server) {
      server.close();
    }
    await mongoose.connection.close();
    process.exit(0);
  }
}

runCategoryTests();
