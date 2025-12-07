/**
 * Analyze endpoint for product photo analysis
 * Combines AI vision analysis with optional user-provided details
 */

import { Router, Request, Response, NextFunction } from 'express';
import { upload } from '../middleware/fileUpload';
import { validateFile } from '../utils/fileValidation';
import { createStorageService } from '../services/storageService';
import { createAIVisionService } from '../services/aiVisionService';
import {
  mergeProductData,
  validateUserInput,
} from '../services/descriptionMerger';
import { UserProvidedDetails } from '../types/productAnalysis';
import config from '../config';
import multer from 'multer';

const router = Router();

// Initialize services
const storageService = createStorageService(config.storage);
let aiVisionService: ReturnType<typeof createAIVisionService> | null = null;

// Initialize AI Vision Service if API key is available
try {
  if (config.ai.openai.apiKey) {
    aiVisionService = createAIVisionService(config.ai.openai.apiKey);
  }
} catch (error) {
  console.warn('AI Vision Service not initialized:', error);
}

/**
 * POST /analyze
 * Analyzes product photo and merges with optional user-provided details
 *
 * Request body (multipart/form-data):
 * - image (file): Product image to analyze
 * - userDetails (JSON string, optional): User-provided product details
 *
 * User details can include:
 * - condition: Product condition
 * - brand: Brand name
 * - model: Model name/number
 * - productType: Product type/name
 * - description: Product description
 * - color: Array of colors
 * - material: Array of materials
 * - size: Size information
 * - year: Year/vintage
 * - categorySpecificDetails: Object with category-specific attributes
 * - customTitle: Custom listing title
 * - customKeywords: Array of additional keywords
 * - notes: Internal notes (not for listing)
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

        // Handle other errors
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
          error: 'No image file uploaded',
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

      // Parse user-provided details if present
      let userDetails: UserProvidedDetails = {};
      if (req.body.userDetails) {
        try {
          userDetails =
            typeof req.body.userDetails === 'string'
              ? JSON.parse(req.body.userDetails)
              : req.body.userDetails;

          // Validate user input
          const userValidation = validateUserInput(userDetails);
          if (!userValidation.valid) {
            await storageService.cleanupTempFile(req.file.path);
            res.status(400).json({
              success: false,
              error: 'Invalid user details',
              validationErrors: userValidation.errors,
            });
            return;
          }
        } catch {
          await storageService.cleanupTempFile(req.file.path);
          res.status(400).json({
            success: false,
            error: 'Invalid JSON format for userDetails',
          });
          return;
        }
      }

      // Check if AI Vision Service is available (after file validation)
      if (!aiVisionService) {
        await storageService.cleanupTempFile(req.file.path);
        res.status(503).json({
          success: false,
          error:
            'AI Vision Service is not available. Please configure OPENAI_API_KEY.',
        });
        return;
      }

      // Analyze the product image with AI
      const analysisResult = await aiVisionService.analyzeProduct(
        req.file.path,
        {
          includeOCR: true,
          detailedAnalysis: true,
          generateTitle: true,
          generateKeywords: true,
        }
      );

      // Cleanup temporary file after analysis
      await storageService.cleanupTempFile(req.file.path);

      // Check if AI analysis was successful
      if (!analysisResult.success || !analysisResult.data) {
        res.status(500).json({
          success: false,
          error: 'AI analysis failed',
          details: analysisResult.error,
        });
        return;
      }

      // Merge AI analysis with user-provided details
      const mergedData = mergeProductData(analysisResult.data, userDetails, {
        prioritizeUser: true,
        validateCompleteness: true,
        enhanceDescription: true,
      });

      // Return the merged analysis result
      res.status(200).json({
        success: true,
        message: 'Product analyzed successfully',
        data: mergedData,
        tokensUsed: analysisResult.tokensUsed,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      // Cleanup temporary file on error
      if (req.file) {
        await storageService.cleanupTempFile(req.file.path);
      }

      console.error('Analysis error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error during analysis',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /analyze/health
 * Check if the analyze service is available
 */
router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    aiVisionAvailable: aiVisionService !== null,
    timestamp: new Date().toISOString(),
  });
});

export default router;
