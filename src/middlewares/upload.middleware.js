import multer from 'multer';
import path from 'path';
import ApiError from '../utils/apiError.js';

// In-memory buffer storage so files are streamed directly to Cloudinary without writing to ephemeral server disk
const storage = multer.memoryStorage();

const MAX_IMAGE_SIZE_MB = parseInt(process.env.MAX_IMAGE_SIZE_MB, 10) || 10;
const MAX_VIDEO_SIZE_MB = parseInt(process.env.MAX_VIDEO_SIZE_MB, 10) || 50;

// File filter to restrict file types to valid image formats
const imageFileFilter = (req, file, cb) => {
  const allowedExts = /\.(jpeg|jpg|png|webp|gif|svg)$/i;
  const allowedMimes = /^image\/(jpeg|jpg|png|webp|gif|svg\+xml)$/i;
  const extValid = allowedExts.test(path.extname(file.originalname).toLowerCase());
  const mimeValid = allowedMimes.test(file.mimetype);

  if (extValid && mimeValid) {
    return cb(null, true);
  }
  cb(new ApiError(400, 'Invalid file type. Only JPG, JPEG, PNG, WEBP, GIF, and SVG image files are allowed.'));
};

// File filter to restrict file types to valid video formats
const videoFileFilter = (req, file, cb) => {
  const allowedExts = /\.(mp4|webm|mov|ogv|mkv)$/i;
  const allowedMimes = /^video\/(mp4|webm|quicktime|ogg|x-matroska)$/i;
  const extValid = allowedExts.test(path.extname(file.originalname).toLowerCase());
  const mimeValid = allowedMimes.test(file.mimetype);

  if (extValid && mimeValid) {
    return cb(null, true);
  }
  cb(new ApiError(400, 'Invalid file type. Only MP4, WebM, and MOV video files are allowed.'));
};

// Combined media file filter (images + videos)
const mediaFileFilter = (req, file, cb) => {
  const isImage = imageFileFilter(req, file, (err, pass) => pass);
  const isVideo = videoFileFilter(req, file, (err, pass) => pass);

  const allowedExts = /\.(jpeg|jpg|png|webp|gif|svg|mp4|webm|mov|ogv|mkv)$/i;
  const allowedMimes = /^(image\/(jpeg|jpg|png|webp|gif|svg\+xml)|video\/(mp4|webm|quicktime|ogg|x-matroska))$/i;
  const extValid = allowedExts.test(path.extname(file.originalname).toLowerCase());
  const mimeValid = allowedMimes.test(file.mimetype);

  if (extValid && mimeValid) {
    return cb(null, true);
  }
  cb(new ApiError(400, 'Invalid file type. Supported formats include images (JPG, PNG, WEBP, GIF, SVG) and videos (MP4, WebM, MOV).'));
};

// Base multer instance for images (backward-compatible)
export const upload = multer({
  storage: storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: MAX_IMAGE_SIZE_MB * 1024 * 1024,
  },
});

// Dedicated multer instance for videos
export const uploadVideo = multer({
  storage: storage,
  fileFilter: videoFileFilter,
  limits: {
    fileSize: MAX_VIDEO_SIZE_MB * 1024 * 1024,
  },
});

// Flexible multer instance for any blog media (image or video)
export const uploadMedia = multer({
  storage: storage,
  fileFilter: mediaFileFilter,
  limits: {
    fileSize: MAX_VIDEO_SIZE_MB * 1024 * 1024,
  },
});

/**
 * Flexible single image upload middleware that accepts any field name ('image', 'file', 'featuredImage', etc.)
 */
export const uploadSingleImage = (req, res, next) => {
  upload.any()(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new ApiError(400, `Image file too large. Maximum allowed size is ${MAX_IMAGE_SIZE_MB}MB.`));
      }
      return next(err);
    }
    if (req.files && req.files.length > 0) {
      req.file = req.files[0];
    }
    next();
  });
};

/**
 * Dedicated single video upload middleware
 */
export const uploadSingleVideo = (req, res, next) => {
  uploadVideo.any()(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new ApiError(400, `Video file too large. Maximum allowed size is ${MAX_VIDEO_SIZE_MB}MB.`));
      }
      return next(err);
    }
    if (req.files && req.files.length > 0) {
      req.file = req.files[0];
    }
    next();
  });
};

/**
 * Flexible single media upload middleware (image or video)
 */
export const uploadSingleMedia = (req, res, next) => {
  uploadMedia.any()(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new ApiError(400, `Media file too large. Maximum allowed size is ${MAX_VIDEO_SIZE_MB}MB.`));
      }
      return next(err);
    }
    if (req.files && req.files.length > 0) {
      req.file = req.files[0];
    }
    next();
  });
};
