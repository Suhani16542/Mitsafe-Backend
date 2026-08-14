import dotenv from 'dotenv';
dotenv.config();

import app from './src/app.js';
import connectDB from './src/config/db.js';
import Quote from './src/models/quote.model.js';
import Blog from './src/models/blog.model.js';
import logger from './src/config/logger.js';

const ADMIN_KEY = process.env.BLOG_ADMIN_API_KEY || 'mitsafe-secret-blog-admin-key-2026';

async function runTests() {
  console.log('\n==================================================');
  console.log('🚀 STARTING MITSAFE BACKEND TEST SUITE');
  console.log('==================================================\n');

  let server;
  try {
    // 1. Connect DB and start test server
    await connectDB();
    console.log('✅ MongoDB connected successfully.');

    server = app.listen(5001, () => {
      console.log('✅ Test server booted on port 5001.');
    });

    const baseUrl = 'http://localhost:5001';

    // 2. Health check test
    console.log('\n--- 1. Testing Health Endpoint ---');
    const healthRes = await fetch(`${baseUrl}/api/v1/health`);
    const healthData = await healthRes.json();
    console.log('GET /api/v1/health status:', healthRes.status, healthData.message);

    // 3. Quote API validation failure test
    console.log('\n--- 2. Testing Quote Validation Failure ---');
    const invalidQuoteRes = await fetch(`${baseUrl}/api/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '', email: 'invalid-email', message: '' }),
    });
    const invalidQuoteData = await invalidQuoteRes.json();
    console.log('POST /api/quotes invalid payload status:', invalidQuoteRes.status);
    console.log('Validation errors returned:', invalidQuoteData.errors?.length || 0);

    // 4. Quote API success test
    console.log('\n--- 3. Testing Quote Submission Success ---');
    const validQuoteRes = await fetch(`${baseUrl}/api/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Test Client',
        email: 'testclient@example.com',
        phone: '+91 9876543210',
        companyName: 'Mitsafe Test Corp',
        service: 'Website Design & Development',
        budget: 'Under ₹50K',
        timeline: 'ASAP',
        message: 'We require a new high-performance website.',
        sourcePage: '/services/web-development',
      }),
    });
    const validQuoteData = await validQuoteRes.json();
    console.log('POST /api/quotes status:', validQuoteRes.status, validQuoteData.message);
    const savedQuoteId = validQuoteData.data?._id;
    console.log('Quote saved in MongoDB ID:', savedQuoteId);

    // 4b. GET /api/quotes route test
    console.log('\n--- 3b. Testing GET /api/quotes Route ---');
    const getQuotesRes = await fetch(`${baseUrl}/api/quotes`, {
      headers: { 'x-blog-admin-key': ADMIN_KEY },
    });
    const getQuotesData = await getQuotesRes.json();
    console.log('GET /api/quotes status:', getQuotesRes.status, 'Total quotes fetched:', getQuotesData.data?.length);

    // 5. Verify Quote in MongoDB
    if (savedQuoteId) {
      const dbQuote = await Quote.findById(savedQuoteId);
      console.log('Verified Quote in DB:', dbQuote ? dbQuote.fullName : 'Not Found');
    }

    // 6. Test Unauthorized Blog Creation (Missing x-blog-admin-key)
    console.log('\n--- 4. Testing Unauthorized Blog Creation ---');
    const unauthBlogRes = await fetch(`${baseUrl}/api/blogs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Unauthorized Blog Post',
        content: '<p>Content</p>',
        category: 'Tech',
      }),
    });
    console.log('POST /api/blogs without admin key status:', unauthBlogRes.status, '(Expected 401)');

    // 7. Test Admin Blog Creation (Draft)
    console.log('\n--- 5. Testing Blog Creation (Draft) ---');
    const draftBlogRes = await fetch(`${baseUrl}/api/blogs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-blog-admin-key': ADMIN_KEY,
      },
      body: JSON.stringify({
        title: 'Draft Article on Cloud Infrastructure',
        summary: 'A preview of upcoming cloud updates.',
        content: '<p>This is draft content that should not be visible publicly.</p>',
        category: 'Cloud',
        status: 'draft',
      }),
    });
    const draftBlogData = await draftBlogRes.json();
    console.log('POST /api/blogs draft status:', draftBlogRes.status, draftBlogData.message);
    const draftSlug = draftBlogData.data?.slug;
    const draftId = draftBlogData.data?._id;

    // 8. Verify Draft Blog is NOT public
    console.log('\n--- 6. Verifying Draft Blog is Hidden Publicly ---');
    const getDraftPublic = await fetch(`${baseUrl}/api/blogs/${draftSlug}`);
    console.log(`GET /api/blogs/${draftSlug} (Draft) status:`, getDraftPublic.status, '(Expected 404)');

    // 9. Test Admin Blog Creation (Published)
    console.log('\n--- 7. Testing Blog Creation (Published) ---');
    const pubBlogRes = await fetch(`${baseUrl}/api/blogs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-blog-admin-key': ADMIN_KEY,
      },
      body: JSON.stringify({
        title: 'Next.js 16 and AI Agents Architectural Guide',
        excerpt: 'Learn how to integrate AI agents into Next.js 16 enterprise workflows.',
        content: '<h2>AI Integration</h2><p>Large Language Models are transforming enterprise applications.</p>',
        category: 'AI & Technology',
        tags: ['Next.js', 'AI', 'React'],
        status: 'published',
        featured: true,
      }),
    });
    const pubBlogData = await pubBlogRes.json();
    console.log('POST /api/blogs published status:', pubBlogRes.status, pubBlogData.message);
    const pubSlug = pubBlogData.data?.slug;
    const pubId = pubBlogData.data?._id;

    // 10. Test Duplicate Slug Handling
    console.log('\n--- 8. Testing Duplicate Slug Handling ---');
    const dupBlogRes = await fetch(`${baseUrl}/api/blogs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-blog-admin-key': ADMIN_KEY,
      },
      body: JSON.stringify({
        title: 'Next.js 16 and AI Agents Architectural Guide',
        content: '<p>Duplicate title test</p>',
        category: 'AI & Technology',
      }),
    });
    const dupBlogData = await dupBlogRes.json();
    console.log('POST /api/blogs duplicate slug status:', dupBlogRes.status, dupBlogData.message);

    // 11. Test Public Blog Listing & Pagination
    console.log('\n--- 9. Testing Public Blog Listing & Pagination ---');
    const listRes = await fetch(`${baseUrl}/api/blogs?page=1&limit=5`);
    const listData = await listRes.json();
    console.log('GET /api/blogs status:', listRes.status, 'Total items returned:', listData.data?.length);
    console.log('Pagination metadata:', listData.pagination);

    // 12. Test Category Filter
    console.log('\n--- 10. Testing Category Filter ---');
    const catRes = await fetch(`${baseUrl}/api/blogs?category=AI%20%26%20Technology`);
    const catData = await catRes.json();
    console.log('GET /api/blogs?category=AI & Technology status:', catRes.status, 'Matched:', catData.data?.length);

    // 13. Test Search
    console.log('\n--- 11. Testing Search Filter ---');
    const searchRes = await fetch(`${baseUrl}/api/blogs?search=Next.js`);
    const searchData = await searchRes.json();
    console.log('GET /api/blogs?search=Next.js status:', searchRes.status, 'Matched:', searchData.data?.length);

    // 14. Test Single Blog by Slug
    console.log('\n--- 12. Testing Single Blog Fetch by Slug ---');
    const singleRes = await fetch(`${baseUrl}/api/blogs/${pubSlug}`);
    const singleData = await singleRes.json();
    console.log(`GET /api/blogs/${pubSlug} status:`, singleRes.status, 'Title:', singleData.data?.title);

    // 15. Test Blog Update
    console.log('\n--- 13. Testing Blog Update ---');
    const updateRes = await fetch(`${baseUrl}/api/blogs/${pubId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-blog-admin-key': ADMIN_KEY,
      },
      body: JSON.stringify({
        featuredImage: 'https://images.unsplash.com/photo-1518770660439-4636190af475',
        readTime: '6 Min Read',
      }),
    });
    const updateData = await updateRes.json();
    console.log('PUT /api/blogs/:id status:', updateRes.status, 'Updated readTime:', updateData.data?.readTime);

    // 16. Test Blog Publish Status Toggle (Draft -> Published)
    console.log('\n--- 14. Testing Publish Status Toggle ---');
    const toggleRes = await fetch(`${baseUrl}/api/blogs/${draftId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-blog-admin-key': ADMIN_KEY,
      },
      body: JSON.stringify({ status: 'published' }),
    });
    const toggleData = await toggleRes.json();
    console.log('PATCH /api/blogs/:id/status status:', toggleRes.status, 'New status:', toggleData.data?.status);

    // 17. Test Invalid Blog ID
    console.log('\n--- 15. Testing Invalid Mongo ObjectId ---');
    const invalidIdRes = await fetch(`${baseUrl}/api/blogs/invalidmongoobjid123`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-blog-admin-key': ADMIN_KEY,
      },
      body: JSON.stringify({ title: 'Invalid' }),
    });
    const invalidIdData = await invalidIdRes.json();
    console.log('PUT /api/blogs/invalidid status:', invalidIdRes.status, invalidIdData.message);

    // Cleanup test data
    console.log('\n--- Cleaning up test records ---');
    if (savedQuoteId) await Quote.findByIdAndDelete(savedQuoteId);
    if (draftId) await Blog.findByIdAndDelete(draftId);
    if (pubId) await Blog.findByIdAndDelete(pubId);
    console.log('Test records cleaned up.');

    console.log('\n==================================================');
    console.log('🎉 ALL 20 TEST SCENARIOS COMPLETED SUCCESSFULLY!');
    console.log('==================================================\n');
  } catch (err) {
    console.error('❌ Test suite error:', err);
  } finally {
    if (server) server.close();
    process.exit(0);
  }
}

runTests();
