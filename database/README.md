# Product Cache Database Schema

This directory contains the database schema for the Product Enrichment Service's product cache functionality.

## Overview

The database schema supports:
- **Product Caching**: Store known products with UPC/barcode identifiers for fast lookup
- **Enrichment Logging**: Track enrichment operations for analytics and debugging
- **Performance Optimization**: Indexes for fast lookups by various identifiers

## Schema Files

- `schema.sql` - Complete PostgreSQL schema with tables, indexes, views, and functions

## Database Tables

### `product_cache`
Stores known products with their identifiers and attributes for quick lookup during enrichment.

**Key Columns:**
- `upc` - Universal Product Code (12-13 digits)
- `ean` - European Article Number (13 digits)
- `isbn` - International Standard Book Number
- `asin` - Amazon Standard Identification Number
- `product_name` - Product name
- `brand` - Brand name
- `category` - Product category
- `model` - Model identifier
- `attributes` - JSONB field for flexible product-specific attributes

**Indexes:**
- Fast lookup by UPC, EAN, brand+model combination
- Category and updated_at indexes for filtering

### `enrichment_logs`
Tracks all product enrichment operations for analytics and debugging.

**Key Columns:**
- Confidence scores (overall, product type, category, brand, condition, attributes, visual quality)
- Completeness score and missing critical info
- Database match tracking
- Sentiment analysis score
- Processing time metrics

## Setup Instructions

### Prerequisites
- PostgreSQL 12 or higher
- Database connection configured in `.env` file

### Installation

1. Create the database:
```bash
createdb auctionassistant
```

2. Run the schema:
```bash
psql -d auctionassistant -f database/schema.sql
```

3. (Optional) Insert sample data:
```sql
SELECT insert_sample_products();
```

### Configuration

Add the database URL to your `.env` file:
```
DATABASE_URL=postgresql://user:password@localhost:5432/auctionassistant
```

## Usage

### Adding Products to Cache

```typescript
import { createProductEnrichmentService } from './src/services/productEnrichment';

const enrichmentService = createProductEnrichmentService();

enrichmentService.addProductToCache({
  upc: '123456789012',
  productName: 'iPhone 13 Pro',
  brand: 'Apple',
  category: 'Electronics',
  model: 'A2483',
  attributes: {
    color: ['Graphite', 'Gold', 'Silver'],
    storage: ['128GB', '256GB', '512GB', '1TB']
  },
  lastUpdated: new Date()
});
```

### Querying Cache Statistics

```sql
-- View cache statistics
SELECT * FROM product_cache_stats;

-- View enrichment analytics
SELECT * FROM enrichment_analytics;
```

## Views

### `product_cache_stats`
Provides statistics about cached products:
- Total products count
- Unique brands and categories
- Products with UPC/EAN
- Average access count
- Date ranges

### `enrichment_analytics`
Provides daily analytics on enrichment operations:
- Total enrichments per day
- Average confidence scores
- Average completeness
- Database match rate
- Average sentiment
- Processing time metrics

## Maintenance

### Cleanup Old Entries

```sql
-- Delete products not accessed in 90 days
DELETE FROM product_cache 
WHERE last_accessed < NOW() - INTERVAL '90 days';

-- Archive old enrichment logs
DELETE FROM enrichment_logs 
WHERE created_at < NOW() - INTERVAL '180 days';
```

### Performance Monitoring

```sql
-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Future Enhancements

- **Product Images**: Store product image URLs in cache
- **Price History**: Track historical prices for products
- **User Favorites**: Cache frequently analyzed products per user
- **API Integration**: Integrate with external product databases (UPC Database, Open Product Data)
- **Full-Text Search**: Add full-text search capabilities for product lookup

## Migration Guide

When the project is ready to implement database persistence:

1. Install PostgreSQL dependencies:
```bash
npm install pg @types/pg
# or with Prisma
npm install @prisma/client
npm install -D prisma
```

2. Initialize database connection in your application
3. Update `ProductEnrichmentService` to use database queries instead of in-memory cache
4. Set up migrations for schema versioning

## Support

For issues or questions about the database schema, please refer to:
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Product Enrichment Service Documentation](../src/services/productEnrichment.ts)
