import jwt from 'jsonwebtoken';
import asyncWrapper from '../utils/asyncWrapper.js';
import ApiError from '../utils/apiError.js';
import Blog, { generateSlug } from '../models/blog.model.js';
import { processBlogImageUpload, deleteFromCloudinary } from '../services/upload.service.js';
import logger from '../config/logger.js';

// Helper to check if request has valid admin credentials (Cookie, Bearer token, or API key)
export const isRequestAdmin = (req) => {
  try {
    let token;
    if (req.cookies && (req.cookies.admin_token || req.cookies.token || req.cookies.jwt)) {
      token = req.cookies.admin_token || req.cookies.token || req.cookies.jwt;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    const clientAdminKey = req.headers['x-blog-admin-key'] || req.headers['x-admin-key'];
    const configuredAdminKey = process.env.BLOG_ADMIN_API_KEY;

    if (
      !token &&
      clientAdminKey &&
      configuredAdminKey &&
      clientAdminKey.trim() !== '' &&
      clientAdminKey.trim() === configuredAdminKey.trim()
    ) {
      return true;
    }

    if (!token) return false;
    const jwtSecret = process.env.JWT_SECRET || 'mitsafe_admin_jwt_secret_default_key_2026';
    jwt.verify(token, jwtSecret);
    return true;
  } catch {
    return false;
  }
};

/**
 * Parse and normalize string or array of strings into a clean array
 * - Trims whitespace
 * - Removes empty values
 * - Avoids duplicate keywords while preserving original casing of first occurrence
 */
export const normalizeStringArray = (input) => {
  if (!input) return [];

  let items = [];
  if (Array.isArray(input)) {
    items = input;
  } else if (typeof input === 'string') {
    items = input.split(',');
  } else {
    return [];
  }

  const cleaned = [];
  const seen = new Set();

  for (const item of items) {
    if (typeof item === 'string') {
      const trimmed = item.trim();
      if (trimmed.length > 0) {
        const lower = trimmed.toLowerCase();
        if (!seen.has(lower)) {
          seen.add(lower);
          cleaned.push(trimmed);
        }
      }
    }
  }

  return cleaned;
};

/**
 * @desc    Get public published blogs with pagination, filtering & search (Admin can view drafts / all)
 * @route   GET /api/v1/blogs (or /api/blogs)
 * @access  Public (Restricted to published for non-admins)
 */
export const getBlogs = asyncWrapper(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 9;
  const skip = (page - 1) * limit;

  const isAdmin = isRequestAdmin(req);

  // Build filter criteria
  const queryObj = {};
  if (isAdmin && req.query.status) {
    if (req.query.status !== 'all') {
      queryObj.status = req.query.status;
    }
  } else {
    // Non-admins and public callers can ONLY see published blogs
    queryObj.status = 'published';
  }

  // Filter by category
  if (req.query.category && req.query.category !== 'all') {
    queryObj.category = { $regex: new RegExp(`^${req.query.category.trim()}$`, 'i') };
  }

  // Filter by featured flag
  if (req.query.featured !== undefined) {
    queryObj.featured = req.query.featured === 'true';
  }

  // Search keyword across title, excerpt, content, category, tags, keywords
  if (req.query.search && req.query.search.trim()) {
    const searchRegex = new RegExp(req.query.search.trim(), 'i');
    queryObj.$or = [
      { title: searchRegex },
      { excerpt: searchRegex },
      { content: searchRegex },
      { category: searchRegex },
      { tags: searchRegex },
      { keywords: searchRegex },
    ];
  }

  // Determine sort order
  let sortOption = '-publishedAt -createdAt';
  if (req.query.sort) {
    sortOption = req.query.sort.split(',').join(' ');
  }

  // Execute query with pagination
  const [blogs, total] = await Promise.all([
    Blog.find(queryObj).sort(sortOption).skip(skip).limit(limit).lean(),
    Blog.countDocuments(queryObj),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  res.status(200).json({
    success: true,
    data: blogs,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  });
});

/**
 * @desc    Get single blog by slug (Published for public, draft accessible to admin)
 * @route   GET /api/v1/blogs/:slug
 * @access  Public (Published) / Admin (Any status)
 */
export const getBlogBySlug = asyncWrapper(async (req, res, next) => {
  const { slug } = req.params;
  const isAdmin = isRequestAdmin(req);

  const query = {
    slug: slug.toLowerCase(),
  };

  // If not admin, only published blogs can be retrieved
  if (!isAdmin) {
    query.status = 'published';
  }

  const blog = await Blog.findOne(query).lean();

  if (!blog) {
    return next(new ApiError(404, `Blog article with slug '${slug}' not found`));
  }

  res.status(200).json({
    success: true,
    data: blog,
  });
});

/**
 * @desc    Get list of unique categories from published blogs
 * @route   GET /api/v1/blogs/categories
 * @access  Public
 */
export const getCategories = asyncWrapper(async (req, res) => {
  const categories = await Blog.distinct('category', { status: 'published' });
  res.status(200).json({
    success: true,
    data: categories,
  });
});

/**
 * @desc    Create a new blog article
 * @route   POST /api/v1/blogs
 * @access  Protected (Admin Key Required)
 */
export const createBlog = asyncWrapper(async (req, res, next) => {
  const {
    title,
    slug,
    excerpt,
    content,
    category,
    keywords,
    tags,
    author,
    featuredImage,
    readTime,
    status,
    featured,
    publishedAt,
  } = req.body;

  // Determine target slug
  const targetSlug = slug ? generateSlug(slug) : generateSlug(title);

  // Check slug uniqueness
  const existingBlog = await Blog.findOne({ slug: targetSlug });
  if (existingBlog) {
    return next(
      new ApiError(400, `A blog with the title/slug '${targetSlug}' already exists. Please use a unique title or slug.`)
    );
  }

  const blogData = {
    title,
    slug: targetSlug,
    excerpt: excerpt || '',
    content,
    category,
    keywords: normalizeStringArray(keywords),
    tags: normalizeStringArray(tags),
    author: author || 'Mitsafe Team',
    featuredImage: featuredImage || req.body.imageUrl || '',
    featuredImagePublicId: req.body.featuredImagePublicId || req.body.publicId || '',
    readTime: readTime || '5 Min Read',
    status: status || 'draft',
    featured: Boolean(featured),
    publishedAt: status === 'published' ? publishedAt || new Date() : null,
  };

  const blog = await Blog.create(blogData);

  res.status(201).json({
    success: true,
    message: 'Blog article created successfully',
    data: blog,
  });
});

/**
 * @desc    Update an existing blog article
 * @route   PUT /api/v1/blogs/:id
 * @access  Protected (Admin Key Required)
 */
export const updateBlog = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;

  const blog = await Blog.findById(id);
  if (!blog) {
    return next(new ApiError(404, `Blog not found with ID: ${id}`));
  }

  // Handle slug change uniqueness check
  if (req.body.slug || req.body.title) {
    const newSlug = req.body.slug
      ? generateSlug(req.body.slug)
      : generateSlug(req.body.title);

    if (newSlug !== blog.slug) {
      const slugConflict = await Blog.findOne({ slug: newSlug, _id: { $ne: id } });
      if (slugConflict) {
        return next(
          new ApiError(400, `Cannot update slug to '${newSlug}'. Another blog post already uses this slug.`)
        );
      }
      req.body.slug = newSlug;
    }
  }

  // Handle keywords format conversion & sanitization if provided
  if (req.body.keywords !== undefined) {
    req.body.keywords = normalizeStringArray(req.body.keywords);
  }

  // Handle tags format conversion & sanitization if provided
  if (req.body.tags !== undefined) {
    req.body.tags = normalizeStringArray(req.body.tags);
  }

  // Handle publishedAt date when transitioning to published
  if (req.body.status === 'published' && !blog.publishedAt && !req.body.publishedAt) {
    req.body.publishedAt = new Date();
  }

  Object.assign(blog, req.body);
  await blog.save();

  res.status(200).json({
    success: true,
    message: 'Blog article updated successfully',
    data: blog,
  });
});

/**
 * @desc    Toggle blog publish/draft status
 * @route   PATCH /api/v1/blogs/:id/status
 * @access  Protected (Admin Key Required)
 */
export const toggleBlogStatus = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;

  const blog = await Blog.findById(id);
  if (!blog) {
    return next(new ApiError(404, `Blog not found with ID: ${id}`));
  }

  blog.status = status;
  if (status === 'published' && !blog.publishedAt) {
    blog.publishedAt = new Date();
  }

  await blog.save();

  res.status(200).json({
    success: true,
    message: `Blog status updated to '${status}' successfully`,
    data: blog,
  });
});

/**
 * @desc    Delete a blog article
 * @route   DELETE /api/v1/blogs/:id
 * @access  Protected (Admin Key Required)
 */
export const deleteBlog = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;

  const blog = await Blog.findByIdAndDelete(id);
  if (!blog) {
    return next(new ApiError(404, `Blog not found with ID: ${id}`));
  }

  // Cleanup Cloudinary image if present
  if (blog.featuredImagePublicId) {
    deleteFromCloudinary(blog.featuredImagePublicId).catch((err) => {
      logger.warn(`Failed to delete blog image from Cloudinary: ${err.message}`);
    });
  }

  res.status(200).json({
    success: true,
    message: 'Blog article deleted successfully',
    data: { id },
  });
});

/**
 * @desc    Upload blog featured image directly to permanent Cloudinary storage
 * @route   POST /api/v1/blogs/upload-image
 * @access  Protected (Admin Key Required)
 */
export const uploadBlogImage = asyncWrapper(async (req, res, next) => {
  if (!req.file) {
    return next(new ApiError(400, 'Please select an image file to upload'));
  }

  const { imageUrl, publicId } = await processBlogImageUpload(req.file, req);

  res.status(200).json({
    success: true,
    message: 'Image uploaded successfully to Cloudinary',
    imageUrl,
    url: imageUrl,
    publicId,
    data: {
      imageUrl,
      url: imageUrl,
      publicId,
    },
  });
});

