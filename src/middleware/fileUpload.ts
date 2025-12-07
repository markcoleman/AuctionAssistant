/**
 * Multer middleware configuration for file uploads
 */

import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
import path from 'path';
import crypto from 'crypto';
import {
  isAllowedFileType,
  hasAllowedExtension,
  MAX_FILE_SIZE,
} from '../utils/fileValidation';

// Configure storage with unique filenames
const storage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb) => {
    // Store files in a temporary uploads directory
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (_req: Request, file: Express.Multer.File, cb) => {
    // Generate unique filename with original extension
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

// File filter to validate file types
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  // Check MIME type
  if (!isAllowedFileType(file.mimetype)) {
    cb(
      new Error(
        'Invalid file type. Only JPEG, PNG, and WebP images are allowed.'
      )
    );
    return;
  }

  // Check file extension
  if (!hasAllowedExtension(file.originalname)) {
    cb(
      new Error(
        'Invalid file extension. Only .jpg, .jpeg, .png, and .webp files are allowed.'
      )
    );
    return;
  }

  cb(null, true);
};

// Configure multer with storage, file filter, and size limits
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1, // Accept single file upload
  },
});
