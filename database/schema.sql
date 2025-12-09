-- Product Cache Database Schema
-- This schema defines tables for caching product information
-- to improve enrichment service performance and reduce API calls

-- Product Cache Table
-- Stores known products with their identifiers and attributes
CREATE TABLE IF NOT EXISTS product_cache (
    id SERIAL PRIMARY KEY,
    
    -- Product Identifiers
    upc VARCHAR(13) UNIQUE,                    -- Universal Product Code
    ean VARCHAR(13) UNIQUE,                    -- European Article Number
    isbn VARCHAR(13),                          -- International Standard Book Number
    asin VARCHAR(10),                          -- Amazon Standard Identification Number
    
    -- Product Information
    product_name VARCHAR(255) NOT NULL,
    brand VARCHAR(100),
    category VARCHAR(100),
    manufacturer VARCHAR(100),
    model VARCHAR(100),
    
    -- Product Attributes (JSONB for flexible schema)
    attributes JSONB DEFAULT '{}',
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    access_count INTEGER DEFAULT 0,
    
    -- Indexing for performance
    CONSTRAINT valid_identifier CHECK (
        upc IS NOT NULL OR 
        ean IS NOT NULL OR 
        (brand IS NOT NULL AND model IS NOT NULL)
    )
);

-- Indexes for fast lookups
CREATE INDEX idx_product_cache_upc ON product_cache(upc) WHERE upc IS NOT NULL;
CREATE INDEX idx_product_cache_ean ON product_cache(ean) WHERE ean IS NOT NULL;
CREATE INDEX idx_product_cache_brand_model ON product_cache(brand, model) WHERE brand IS NOT NULL AND model IS NOT NULL;
CREATE INDEX idx_product_cache_category ON product_cache(category);
CREATE INDEX idx_product_cache_updated_at ON product_cache(updated_at);

-- Enrichment Logs Table
-- Tracks enrichment operations for analytics and debugging
CREATE TABLE IF NOT EXISTS enrichment_logs (
    id SERIAL PRIMARY KEY,
    
    -- Analysis Information
    product_type VARCHAR(255),
    brand VARCHAR(100),
    category VARCHAR(100),
    
    -- Confidence Scores
    overall_confidence DECIMAL(5,2),
    product_type_confidence DECIMAL(5,2),
    category_confidence DECIMAL(5,2),
    brand_confidence DECIMAL(5,2),
    condition_confidence DECIMAL(5,2),
    attributes_confidence DECIMAL(5,2),
    visual_quality_confidence DECIMAL(5,2),
    
    -- Completeness
    completeness_score DECIMAL(5,2),
    missing_critical_info JSONB DEFAULT '[]',
    
    -- Database Match
    database_match_found BOOLEAN DEFAULT FALSE,
    matched_product_id INTEGER REFERENCES product_cache(id),
    
    -- Sentiment
    sentiment_score DECIMAL(3,2),  -- -1.00 to 1.00
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Performance Metrics
    processing_time_ms INTEGER
);

-- Index for analytics queries
CREATE INDEX idx_enrichment_logs_created_at ON enrichment_logs(created_at);
CREATE INDEX idx_enrichment_logs_overall_confidence ON enrichment_logs(overall_confidence);
CREATE INDEX idx_enrichment_logs_database_match ON enrichment_logs(database_match_found);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_product_cache_updated_at
    BEFORE UPDATE ON product_cache
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to update access tracking
CREATE OR REPLACE FUNCTION update_product_access()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_accessed = CURRENT_TIMESTAMP;
    NEW.access_count = NEW.access_count + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- View for product cache statistics
CREATE OR REPLACE VIEW product_cache_stats AS
SELECT 
    COUNT(*) as total_products,
    COUNT(DISTINCT brand) as unique_brands,
    COUNT(DISTINCT category) as unique_categories,
    COUNT(*) FILTER (WHERE upc IS NOT NULL) as products_with_upc,
    COUNT(*) FILTER (WHERE ean IS NOT NULL) as products_with_ean,
    AVG(access_count) as avg_access_count,
    MAX(last_accessed) as most_recent_access,
    MIN(created_at) as oldest_entry,
    MAX(created_at) as newest_entry
FROM product_cache;

-- View for enrichment analytics
CREATE OR REPLACE VIEW enrichment_analytics AS
SELECT 
    DATE_TRUNC('day', created_at) as date,
    COUNT(*) as total_enrichments,
    AVG(overall_confidence) as avg_confidence,
    AVG(completeness_score) as avg_completeness,
    COUNT(*) FILTER (WHERE database_match_found = true) as database_matches,
    AVG(sentiment_score) as avg_sentiment,
    AVG(processing_time_ms) as avg_processing_time_ms
FROM enrichment_logs
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- Sample data insertion function
-- Note: Uses test UPC codes (000000000000-099999999999 reserved for testing)
CREATE OR REPLACE FUNCTION insert_sample_products()
RETURNS void AS $$
BEGIN
    INSERT INTO product_cache (upc, product_name, brand, category, model, attributes)
    VALUES 
        ('000000000001', 'iPhone 13 Pro', 'Apple', 'Electronics', 'A2483', '{"color": ["Graphite", "Gold", "Silver"], "storage": ["128GB", "256GB", "512GB", "1TB"]}'),
        ('000000000002', 'Galaxy S21', 'Samsung', 'Electronics', 'SM-G991U', '{"color": ["Phantom Gray", "Phantom White"], "storage": ["128GB", "256GB"]}'),
        ('000000000003', 'AirPods Pro', 'Apple', 'Electronics', 'MWP22AM/A', '{"color": ["White"], "features": ["Active Noise Cancellation", "Spatial Audio"]}')
    ON CONFLICT (upc) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE product_cache IS 'Caches known products with their identifiers and attributes for quick lookup during enrichment';
COMMENT ON TABLE enrichment_logs IS 'Logs all product enrichment operations for analytics and debugging';
COMMENT ON COLUMN product_cache.upc IS 'Universal Product Code (12-13 digits)';
COMMENT ON COLUMN product_cache.ean IS 'European Article Number (13 digits)';
COMMENT ON COLUMN product_cache.attributes IS 'Flexible JSON storage for product-specific attributes';
COMMENT ON COLUMN enrichment_logs.sentiment_score IS 'Sentiment analysis score from -1 (very poor condition) to 1 (excellent condition)';
