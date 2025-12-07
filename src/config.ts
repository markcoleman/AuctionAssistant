/**
 * Application configuration
 * This file contains configuration settings for the AuctionAssistant application
 */

import { StorageConfig, StorageProvider } from './services/storageService';
import path from 'path';

export const config = {
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
  },
  storage: {
    provider: (process.env.STORAGE_PROVIDER || 'local') as StorageProvider,
    aws:
      process.env.STORAGE_PROVIDER === 'aws'
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
            region: process.env.AWS_REGION || 'us-east-1',
            bucket: process.env.AWS_S3_BUCKET || '',
          }
        : undefined,
    azure:
      process.env.STORAGE_PROVIDER === 'azure'
        ? {
            accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME || '',
            accountKey: process.env.AZURE_STORAGE_ACCOUNT_KEY || '',
            containerName: process.env.AZURE_STORAGE_CONTAINER_NAME || '',
          }
        : undefined,
    local: {
      uploadDir: path.join(__dirname, '../uploads'),
    },
  } as StorageConfig,
  imageOptimization: {
    maxWidth: parseInt(process.env.IMAGE_MAX_WIDTH || '2048', 10),
    maxHeight: parseInt(process.env.IMAGE_MAX_HEIGHT || '2048', 10),
    quality: parseInt(process.env.IMAGE_QUALITY || '85', 10),
  },
  secureUrlExpiration: parseInt(
    process.env.SECURE_URL_EXPIRATION || '3600',
    10
  ),
  // AI Vision Configuration
  ai: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.OPENAI_VISION_MODEL || 'gpt-4o',
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '1500', 10),
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.3'),
    },
  },
  // Future configurations can be added here
  // database: { ... },
};

export default config;
