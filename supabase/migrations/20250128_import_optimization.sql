-- ================================================
-- Metadata Cache & Document Fingerprinting
-- Migration: 20250128_import_optimization.sql
-- ================================================

-- 1. Metadata cache table for AI extraction results
CREATE TABLE IF NOT EXISTS metadata_cache (
  document_hash TEXT PRIMARY KEY,
  name TEXT,
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT,
  category TEXT,
  description TEXT,
  confidence DECIMAL(3,2),
  extraction_method TEXT DEFAULT 'ai', -- 'regex', 'ai', 'hybrid'
  cached_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for cache expiration queries
CREATE INDEX IF NOT EXISTS idx_metadata_cache_cached_at 
ON metadata_cache(cached_at);

-- 2. Add fingerprint column to asset_documents
ALTER TABLE asset_documents 
ADD COLUMN IF NOT EXISTS file_fingerprint TEXT;

-- Index for duplicate detection
CREATE INDEX IF NOT EXISTS idx_documents_fingerprint 
ON asset_documents(file_fingerprint);

-- 3. Function to check for duplicates
CREATE OR REPLACE FUNCTION check_duplicate_document(
  p_fingerprint TEXT,
  p_organization_id UUID
)
RETURNS TABLE(
  is_duplicate BOOLEAN,
  existing_doc_id UUID,
  existing_file_name TEXT,
  existing_asset_id UUID,
  existing_asset_name TEXT,
  uploaded_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TRUE as is_duplicate,
    d.id as existing_doc_id,
    d.file_name as existing_file_name,
    a.id as existing_asset_id,
    a.name as existing_asset_name,
    d.created_at as uploaded_at
  FROM asset_documents d
  JOIN assets a ON d.asset_id = a.id
  WHERE d.file_fingerprint = p_fingerprint
    AND a.organization_id = p_organization_id
  LIMIT 1;
  
  -- If no rows returned, return false
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::UUID, NULL::TEXT, NULL::TIMESTAMPTZ;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 4. Comments
COMMENT ON TABLE metadata_cache IS 
  'Caches AI-extracted metadata to avoid redundant API calls. Hash is based on first 5000 chars.';

COMMENT ON COLUMN asset_documents.file_fingerprint IS 
  'SHA-256 hash of file content for duplicate detection.';
