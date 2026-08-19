import multer from 'multer';
import path from 'path';
import ApiError from '../utils/apiError.js';

// In-memory buffer storage so files are streamed directly to Cloudinary without writing to ephemeral server disk
const storage = multer.memoryStorage();

// File filter to restrict file types to valid image formats
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|gif|svg\+xml|svg/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname || mimetype) {
    return cb(null, true);
  }
  cb(new ApiError(400, 'Invalid file type. Only JPG, JPEG, PNG, WEBP, and GIF image files are allowed.'));
};

// Base multer instance
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

/**
 * Flexible single image upload middleware that accepts any field name ('image', 'file', 'featuredImage', etc.)
 */
export const uploadSingleImage = (req, res, next) => {
  upload.any()(req, res, (err) => {
    if (err) return next(err);
    if (req.files && req.files.length > 0) {
      req.file = req.files[0];
    }
    next();
  });
};
