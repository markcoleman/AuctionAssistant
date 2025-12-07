/**
 * Application configuration
 * This file contains configuration settings for the AuctionAssistant application
 */

export const config = {
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
  },
  // Future configurations can be added here
  // database: { ... },
  // storage: { ... },
  // ai: { ... },
};

export default config;
