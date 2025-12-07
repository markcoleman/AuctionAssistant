"use strict";
/**
 * Application configuration
 * This file contains configuration settings for the AuctionAssistant application
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const path_1 = __importDefault(require("path"));
exports.config = {
    server: {
        port: process.env.PORT || 3000,
        env: process.env.NODE_ENV || 'development',
    },
    storage: {
        provider: (process.env.STORAGE_PROVIDER || 'local'),
        aws: process.env.STORAGE_PROVIDER === 'aws'
            ? {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
                region: process.env.AWS_REGION || 'us-east-1',
                bucket: process.env.AWS_S3_BUCKET || '',
            }
            : undefined,
        azure: process.env.STORAGE_PROVIDER === 'azure'
            ? {
                accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME || '',
                accountKey: process.env.AZURE_STORAGE_ACCOUNT_KEY || '',
                containerName: process.env.AZURE_STORAGE_CONTAINER_NAME || '',
            }
            : undefined,
        local: {
            uploadDir: path_1.default.join(__dirname, '../uploads'),
        },
    },
    imageOptimization: {
        maxWidth: parseInt(process.env.IMAGE_MAX_WIDTH || '2048', 10),
        maxHeight: parseInt(process.env.IMAGE_MAX_HEIGHT || '2048', 10),
        quality: parseInt(process.env.IMAGE_QUALITY || '85', 10),
    },
    secureUrlExpiration: parseInt(process.env.SECURE_URL_EXPIRATION || '3600', 10),
    // Future configurations can be added here
    // database: { ... },
    // ai: { ... },
};
exports.default = exports.config;
//# sourceMappingURL=index.js.map