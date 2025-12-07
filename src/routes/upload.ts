/**
 * Upload endpoint for handling image file uploads
 */

import { Router, Request, Response, NextFunction } from 'express';
import { upload } from '../middleware/fileUpload';
import { validateFile } from '../utils/fileValidation';
import { createStorageService } from '../services/storageService';
import config from '../config';
import multer from 'multer';

const router = Router();

// Initialize storage service
const storageService = createStorageService(config.storage);

/**
 * POST /upload
 * Handles single image file upload
 */
router.post(
  '/',
  (req: Request, res: Response, next: NextFunction) => {
    upload.single('image')(req, res, (err: unknown) => {
      if (err) {
        // Handle multer errors
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            res.status(400).json({
              success: false,
              error: 'File size exceeds the 10MB limit',
            });
            return;
          }
          res.status(400).json({
            success: false,
            error: err.message,
          });
          return;
        }

        // Handle other errors (e.g., file validation errors)
        if (err instanceof Error) {
          res.status(400).json({
            success: false,
            error: err.message,
          });
          return;
        }

        res.status(500).json({
          success: false,
          error: 'Unknown error during file upload',
        });
        return;
      }

      next();
    });
  },
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Check if file was uploaded
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No file uploaded',
        });
        return;
      }

      // Validate the uploaded file
      const validation = validateFile({
        mimetype: req.file.mimetype,
        size: req.file.size,
        originalname: req.file.originalname,
      });

      if (!validation.valid) {
        // Cleanup temporary file
        await storageService.cleanupTempFile(req.file.path);
        res.status(400).json({
          success: false,
          error: validation.error,
        });
        return;
      }

      // Upload to cloud storage
      const shouldOptimize =
        process.env.NODE_ENV === 'production' ||
        process.env.ENABLE_IMAGE_OPTIMIZATION === 'true';
      const uploadResult = await storageService.uploadFile(
        req.file.path,
        req.file.mimetype,
        {
          optimize: shouldOptimize,
          maxWidth: config.imageOptimization.maxWidth,
          maxHeight: config.imageOptimization.maxHeight,
          quality: config.imageOptimization.quality,
        }
      );

      // Cleanup temporary file after successful upload
      await storageService.cleanupTempFile(req.file.path);

      // Generate secure URL with expiration
      const secureUrl = await storageService.getSecureUrl(uploadResult.key, {
        expiresIn: config.secureUrlExpiration,
      });

      // Return success response with file information
      res.status(200).json({
        success: true,
        message: 'File uploaded successfully',
        file: {
          id: uploadResult.key,
          originalName: req.file.originalname,
          mimetype: uploadResult.contentType,
          size: uploadResult.size,
          url: uploadResult.url,
          secureUrl: secureUrl,
          uploadedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      // Cleanup temporary file on error
      if (req.file) {
        await storageService.cleanupTempFile(req.file.path);
      }

      console.error('Upload error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error during file upload',
      });
    }
  }
);

export default router;
