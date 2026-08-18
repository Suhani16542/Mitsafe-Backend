import mongoose from 'mongoose';

// Helper function to generate slug from title
export const generateSlug = (title) => {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // remove non-word chars
    .replace(/[\s_-]+/g, '-') // replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // trim leading/trailing hyphens
};

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Blog title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Blog slug is required'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    excerpt: {
      type: String,
      trim: true,
      maxlength: [500, 'Excerpt cannot exceed 500 characters'],
      default: '',
    },
    content: {
      type: String,
      required: [true, 'Blog content is required'],
    },
    category: {
      type: String,
      required: [true, 'Blog category is required'],
      trim: true,
      index: true,
    },
    keywords: {
      type: [String],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
    author: {
      type: String,
      trim: true,
      default: 'Mitsafe Team',
    },
    featuredImage: {
      type: String,
      trim: true,
      default: '',
    },
    featuredImagePublicId: {
      type: String,
      trim: true,
      default: '',
    },
    readTime: {
      type: String,
      trim: true,
      default: '5 Min Read',
    },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
      index: true,
    },
    featured: {
      type: Boolean,
      default: false,
      index: true,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-validate hook: auto-generate slug if missing and set publishedAt when published
blogSchema.pre('validate', function (next) {
  if (this.title && !this.slug) {
    this.slug = generateSlug(this.title);
  } else if (this.slug) {
    this.slug = generateSlug(this.slug);
  }

  if (this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }

  // Auto-calculate read time if missing
  if (this.content && (!this.readTime || this.readTime === '5 Min Read')) {
    const wordCount = this.content.replace(/<[^>]*>/g, '').split(/\s+/).length;
    const minutes = Math.ceil(wordCount / 200);
    this.readTime = `${minutes} Min Read`;
  }

  next();
});

const Blog = mongoose.model('Blog', blogSchema);

export default Blog;
