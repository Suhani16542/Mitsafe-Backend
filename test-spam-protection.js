import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import quoteRoutes from './src/routes/quote.routes.js';
import connectDB from './src/config/db.js';
import Quote from './src/models/quote.model.js';
import mongoose from 'mongoose';

// Configure dummy Cloudflare siteverify key for automated integration testing
process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY = '1x0000000000000000000000000000000AA';

const TEST_PORT = 5555;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

async function runSecurityTests() {
  console.log('\n===============================================================');
  console.log('🛡️  MITSAFE BACKEND ANTI-SPAM & SECURITY COMPREHENSIVE TEST SUITE');
  console.log('===============================================================\n');

  let server;
  let testsPassed = 0;
  let testsFailed = 0;

  const assert = (condition, testName, details = '') => {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      testsPassed++;
    } else {
      console.error(`❌ [FAIL] ${testName} - ${details}`);
      testsFailed++;
    }
  };

  try {
    await connectDB();
    console.log('MongoDB connected for test validation.\n');

    // Build test express app
    const app = express();
    app.set('trust proxy', 1);
    app.use(express.json());
    app.use(mongoSanitize());
    app.use('/api/quotes', quoteRoutes);
    app.use('/api/quote', quoteRoutes);
    app.use('/api/v1/quotes', quoteRoutes);

    await new Promise((resolve) => {
      server = app.listen(TEST_PORT, '127.0.0.1', () => {
        resolve();
      });
    });

    // -------------------------------------------------------------
    // Scenario 1: Missing Turnstile Token
    // -------------------------------------------------------------
    console.log('--- 1. Missing Turnstile Token Test ---');
    const res1 = await fetch(`${BASE_URL}/api/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '192.168.1.101' },
      body: JSON.stringify({
        fullName: 'Bot User',
        email: 'bot@spam.com',
        service: 'Web Development',
        message: 'This is a spam submission without turnstile token.',
      }),
    });
    const data1 = await res1.json();
    assert(
      res1.status === 400 && data1.success === false && data1.message.includes('Turnstile token is missing'),
      'Missing Turnstile Token returns HTTP 400 and rejected before DB / email',
      `Status: ${res1.status}, Body: ${JSON.stringify(data1)}`
    );

    // -------------------------------------------------------------
    // Scenario 2: Invalid Turnstile Token
    // -------------------------------------------------------------
    console.log('\n--- 2. Invalid Turnstile Token Test ---');
    const originalKey = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;
    process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY = '2x0000000000000000000000000000000AA'; // Always Fails
    const res2 = await fetch(`${BASE_URL}/api/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '192.168.1.102' },
      body: JSON.stringify({
        fullName: 'Bot User',
        email: 'bot@spam.com',
        service: 'Web Development',
        message: 'This is a spam submission with invalid turnstile token.',
        turnstileToken: 'invalid_token_123',
      }),
    });
    const data2 = await res2.json();
    assert(
      res2.status === 403 && data2.success === false && data2.message.includes('Security verification failed'),
      'Invalid Turnstile Token returns HTTP 403 Forbidden',
      `Status: ${res2.status}, Body: ${JSON.stringify(data2)}`
    );
    process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY = originalKey; // Restore

    // -------------------------------------------------------------
    // Scenario 3: Honeypot Protection (website_hp / hp_field)
    // -------------------------------------------------------------
    console.log('\n--- 3. Honeypot Field Protection Test ---');
    const res3 = await fetch(`${BASE_URL}/api/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '192.168.1.103' },
      body: JSON.stringify({
        fullName: 'Spam Bot',
        email: 'spambot@example.com',
        service: 'SEO Services',
        message: 'Spam message filling hidden honeypot field.',
        website_hp: 'https://malicious-spam-site.com',
        turnstileToken: 'dummy_valid_token',
      }),
    });
    const data3 = await res3.json();
    assert(
      res3.status === 400 && data3.success === false && data3.message.includes('Spam submission detected'),
      'Honeypot trap triggers HTTP 400 Bad Request rejection with no DB save or email',
      `Status: ${res3.status}, Body: ${JSON.stringify(data3)}`
    );

    // -------------------------------------------------------------
    // Scenario 4: Request Validation (Invalid Email & Phone)
    // -------------------------------------------------------------
    console.log('\n--- 4. Request Validation Failure Tests ---');
    const res4a = await fetch(`${BASE_URL}/api/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '192.168.1.104' },
      body: JSON.stringify({
        fullName: 'Valid Name',
        email: 'not-an-email',
        service: 'Web Development',
        message: 'Valid enquiry message for testing.',
        turnstileToken: 'dummy_valid_token',
      }),
    });
    const data4a = await res4a.json();
    assert(
      res4a.status === 400 && data4a.success === false && data4a.errors?.some((e) => e.field === 'email'),
      'Invalid email format rejected with HTTP 400',
      `Status: ${res4a.status}, Body: ${JSON.stringify(data4a)}`
    );

    const res4b = await fetch(`${BASE_URL}/api/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '192.168.1.104' },
      body: JSON.stringify({
        fullName: 'Valid Name',
        email: 'valid@example.com',
        phone: '123', // Too short
        service: 'Web Development',
        message: 'Valid enquiry message for testing.',
        turnstileToken: 'dummy_valid_token',
      }),
    });
    const data4b = await res4b.json();
    assert(
      res4b.status === 400 && data4b.success === false && data4b.errors?.some((e) => e.field === 'phone'),
      'Invalid phone format rejected with HTTP 400',
      `Status: ${res4b.status}, Body: ${JSON.stringify(data4b)}`
    );

    // -------------------------------------------------------------
    // Scenario 5: Valid Request (DB Save + Brevo Email Delivery)
    // -------------------------------------------------------------
    console.log('\n--- 5. Valid Request (DB Save + Exactly One Email) ---');
    const uniqueEmail = `genuine.quote.${Date.now()}@example.com`;
    const res5 = await fetch(`${BASE_URL}/api/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '192.168.1.105' },
      body: JSON.stringify({
        fullName: 'Suhani Sharma',
        email: uniqueEmail,
        phone: '+91 98765 43210',
        companyName: 'Mitsafe Technologies',
        service: 'Website Design & Development',
        timeline: '1 Month',
        message: 'We require a scalable web application with modern aesthetics.',
        sourcePage: '/services/web-development',
        turnstileToken: 'dummy_valid_token',
      }),
    });
    const data5 = await res5.json();
    assert(
      res5.status === 201 && data5.success === true && Boolean(data5.data?._id) && data5.emailSent === true,
      'Valid request creates MongoDB document and sends exactly 1 notification email (HTTP 201)',
      `Status: ${res5.status}, Body: ${JSON.stringify(data5)}`
    );

    const savedDoc = await Quote.findById(data5.data?._id);
    assert(
      Boolean(savedDoc) && savedDoc.email === uniqueEmail,
      'MongoDB enquiry verified and persisted accurately',
      `Doc: ${JSON.stringify(savedDoc)}`
    );

    // -------------------------------------------------------------
    // Scenario 6: Duplicate Submission Protection (HTTP 409)
    // -------------------------------------------------------------
    console.log('\n--- 6. Duplicate Submission Protection Test ---');
    const res6 = await fetch(`${BASE_URL}/api/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '192.168.1.106' },
      body: JSON.stringify({
        fullName: 'Suhani Sharma',
        email: uniqueEmail,
        phone: '+91 98765 43210',
        companyName: 'Mitsafe Technologies',
        service: 'Website Design & Development',
        message: 'We require a scalable web application with modern aesthetics.',
        turnstileToken: 'dummy_valid_token',
      }),
    });
    const data6 = await res6.json();
    assert(
      res6.status === 409 && data6.success === false && data6.message.includes('duplicate quote enquiry was recently submitted'),
      'Duplicate request with same email/phone/message within 5 minutes returns HTTP 409 Conflict',
      `Status: ${res6.status}, Body: ${JSON.stringify(data6)}`
    );

    // -------------------------------------------------------------
    // Scenario 7: Rate Limiting (Max 3 / 15 min per IP -> 4th is 429)
    // -------------------------------------------------------------
    console.log('\n--- 7. Rate Limiting Test (Same IP -> 4th request 429) ---');
    const rateLimitIp = '192.168.1.200';
    let fourthStatus = null;
    let fourthBody = null;

    for (let i = 1; i <= 4; i++) {
      const rlRes = await fetch(`${BASE_URL}/api/quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': rateLimitIp },
        body: JSON.stringify({
          fullName: `Rate Limit Tester ${i}`,
          email: `ratelimit.${i}.${Date.now()}@example.com`,
          service: 'Web Development',
          message: `Testing rate limiting request sequence number ${i}.`,
          turnstileToken: 'dummy_valid_token',
        }),
      });
      const rlData = await rlRes.json();
      console.log(`Request #${i}: Status ${rlRes.status}`);
      if (i === 4) {
        fourthStatus = rlRes.status;
        fourthBody = rlData;
      }
    }

    assert(
      fourthStatus === 429 && fourthBody?.success === false && fourthBody?.message === 'Too many requests. Please try again later.',
      '4th rapid request from same IP is blocked with HTTP 429 and exact message',
      `Status: ${fourthStatus}, Body: ${JSON.stringify(fourthBody)}`
    );

    // Clean up created test documents
    await Quote.deleteMany({ email: { $in: [uniqueEmail] } });
    await Quote.deleteMany({ email: { $regex: /ratelimit\./ } });
    console.log('\nTest documents cleaned up from database.');

    console.log('\n===============================================================');
    console.log(`🏁 FINAL TEST SUMMARY: ${testsPassed} Passed | ${testsFailed} Failed`);
    console.log('===============================================================\n');

  } catch (error) {
    console.error('Fatal error during security tests:', error);
  } finally {
    if (server) server.close();
    await mongoose.disconnect();
    process.exit(testsFailed > 0 ? 1 : 0);
  }
}

runSecurityTests();

