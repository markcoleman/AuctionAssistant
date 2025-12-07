/**
 * Upload endpoint for handling image file uploads
 */

import { Router, Request, Response, NextFunction } from 'express';
import { upload } from '../middleware/fileUpload';
import { validateFile } from '../utils/fileValidation';
import multer from 'multer';

const router = Router();

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
  (req: Request, res: Response): void => {
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
        res.status(400).json({
          success: false,
          error: validation.error,
        });
        return;
      }

      // Return success response with file information
      res.status(200).json({
        success: true,
        message: 'File uploaded successfully',
        file: {
          id: req.file.filename,
          originalName: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          uploadedAt: new Date().toISOString(),
        },
      });
    } catch {
      res.status(500).json({
        success: false,
        error: 'Internal server error during file upload',
      });
    }
  }
);

export default router;
