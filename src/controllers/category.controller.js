import mongoose from 'mongoose';
import asyncWrapper from '../utils/asyncWrapper.js';
import ApiError from '../utils/apiError.js';
import Category from '../models/category.model.js';
import logger from '../config/logger.js';

// Helper function to generate clean URL slug
export const generateCategorySlug = (text) => {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * @desc    Get all categories with optional filtering
 * @route   GET /api/v1/categories or /api/categories
 * @access  Public / Admin
 */
export const getCategories = asyncWrapper(async (req, res) => {
  const { status, search, sort } = req.query;

  const queryObj = {};

  // Filter by status if provided (e.g. status=active, status=inactive). If status=all or omitted, returns all.
  if (status && status !== 'all') {
    queryObj.status = status;
  }

  // Optional search query
  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim(), 'i');
    queryObj.$or = [
      { name: searchRegex },
      { slug: searchRegex },
      { description: searchRegex },
    ];
  }

  // Sort order (default to ascending name for clean dropdown listing)
  let sortOption = { name: 1 };
  if (sort) {
    sortOption = sort.split(',').join(' ');
  }

  const categories = await Category.find(queryObj).sort(sortOption).lean();

  // If format=names is requested, return simple array of strings
  if (req.query.format === 'names') {
    return res.status(200).json({
      success: true,
      count: categories.length,
      data: categories.map((c) => c.name),
    });
  }

  res.status(200).json({
    success: true,
    count: categories.length,
    data: categories,
  });
});

/**
 * @desc    Get single category by MongoDB ID or slug
 * @route   GET /api/v1/categories/:id
 * @access  Public
 */
export const getCategoryByIdOrSlug = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const isObjectId = mongoose.Types.ObjectId.isValid(id);

  const query = isObjectId ? { _id: id } : { slug: id.toLowerCase() };
  const category = await Category.findOne(query).lean();

  if (!category) {
    return next(new ApiError(404, `Category '${id}' not found`));
  }

  res.status(200).json({
    success: true,
    data: category,
  });
});

/**
 * @desc    Create a new category
 * @route   POST /api/v1/categories or /api/categories
 * @access  Protected (Admin Auth Required)
 */
export const createCategory = asyncWrapper(async (req, res, next) => {
  const { name, slug, description, status } = req.body;

  const targetSlug = slug ? generateCategorySlug(slug) : generateCategorySlug(name);

  // Check if category already exists with either identical name or slug (case-insensitive)
  const existingCategory = await Category.findOne({
    $or: [
      { name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } },
      { slug: targetSlug },
    ],
  });

  if (existingCategory) {
    return next(
      new ApiError(400, `A category with the name '${name}' or slug '${targetSlug}' already exists.`)
    );
  }

  const newCategory = new Category({
    name: name.trim(),
    slug: targetSlug,
    description: description ? description.trim() : '',
    status: status || 'active',
  });

  await newCategory.save();

  logger.info(`Category created: "${newCategory.name}" (${newCategory.slug}) by admin`);

  res.status(201).json({
    success: true,
    message: 'Category created successfully',
    data: newCategory,
  });
});

/**
 * @desc    Update an existing category
 * @route   PUT/PATCH /api/v1/categories/:id or /api/categories/:id
 * @access  Protected (Admin Auth Required)
 */
export const updateCategory = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const { name, slug, description, status } = req.body;

  const isObjectId = mongoose.Types.ObjectId.isValid(id);
  const query = isObjectId ? { _id: id } : { slug: id.toLowerCase() };

  const category = await Category.findOne(query);

  if (!category) {
    return next(new ApiError(404, `Category '${id}' not found`));
  }

  // Determine updated slug if name or slug provided
  let targetSlug = category.slug;
  if (slug) {
    targetSlug = generateCategorySlug(slug);
  } else if (name && name.trim() !== category.name) {
    targetSlug = generateCategorySlug(name);
  }

  // Check uniqueness conflict against other category documents
  if (name || slug) {
    const conflictQuery = {
      _id: { $ne: category._id },
      $or: [],
    };
    if (name) {
      conflictQuery.$or.push({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } });
    }
    if (targetSlug) {
      conflictQuery.$or.push({ slug: targetSlug });
    }

    if (conflictQuery.$or.length > 0) {
      const conflictingCategory = await Category.findOne(conflictQuery);
      if (conflictingCategory) {
        return next(
          new ApiError(400, `Another category with this name or slug already exists.`)
        );
      }
    }
  }

  if (name) category.name = name.trim();
  category.slug = targetSlug;
  if (description !== undefined) category.description = description.trim();
  if (status) category.status = status;

  await category.save();

  logger.info(`Category updated: "${category.name}" (${category.slug}) by admin`);

  res.status(200).json({
    success: true,
    message: 'Category updated successfully',
    data: category,
  });
});

/**
 * @desc    Delete a category
 * @route   DELETE /api/v1/categories/:id or /api/categories/:id
 * @access  Protected (Admin Auth Required)
 */
export const deleteCategory = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;

  const isObjectId = mongoose.Types.ObjectId.isValid(id);
  const query = isObjectId ? { _id: id } : { slug: id.toLowerCase() };

  const category = await Category.findOneAndDelete(query);

  if (!category) {
    return next(new ApiError(404, `Category '${id}' not found`));
  }

  logger.info(`Category deleted: "${category.name}" (${category.slug}) by admin`);

  res.status(200).json({
    success: true,
    message: 'Category deleted successfully',
    data: category,
  });
});
