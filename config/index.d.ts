/**
 * Application configuration
 * This file contains configuration settings for the AuctionAssistant application
 */
import { StorageConfig } from '../src/services/storageService';
export declare const config: {
  server: {
    port: string | number;
    env: string;
  };
  storage: StorageConfig;
  imageOptimization: {
    maxWidth: number;
    maxHeight: number;
    quality: number;
  };
  secureUrlExpiration: number;
};
export default config;
//# sourceMappingURL=index.d.ts.map
