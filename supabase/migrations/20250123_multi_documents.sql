-- Migration: Multi-Document Support per Equipment
-- Date: 2025-01-23
-- Purpose: Enable multiple documents per equipment with proper FK constraints

-- ============================================
-- STEP 1: Add document_id FK to document_chunks
-- ============================================

-- Add column (nullable first for backfill)
ALTER TABLE document_chunks
ADD COLUMN IF NOT EXISTS document_id UUID;

-- Add FK constraint AFTER backfill
-- (done in STEP 3)

-- ============================================
-- STEP 2: Backfill existing chunks
-- ============================================

-- Link existing chunks to their documents
-- Assumes: Currently 1 document per equipment
UPDATE document_chunks dc
SET document_id = (
  SELECT ad.id  
  FROM asset_documents ad
  WHERE ad.asset_id = dc.asset_id
  ORDER BY ad.created_at DESC
  LIMIT 1
)
WHERE document_id IS NULL;

-- ============================================
-- STEP 3: Add constraints and indexes
-- ============================================

-- Add FK constraint
ALTER TABLE document_chunks
ADD CONSTRAINT fk_document_chunks_document
FOREIGN KEY (document_id) 
REFERENCES asset_documents(id) 
ON DELETE CASCADE;

-- Make document_id NOT NULL
ALTER TABLE document_chunks
ALTER COLUMN document_id SET NOT NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id 
ON document_chunks(document_id);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_document_chunks_asset_document
ON document_chunks(asset_id, document_id);

-- ============================================
-- STEP 4: Update document type enum
-- ============================================

-- Ensure document_type has all needed values
DO $$ 
BEGIN
    -- Add constraint if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'valid_document_type'
        AND table_name = 'asset_documents'
    ) THEN
        ALTER TABLE asset_documents
        ADD CONSTRAINT valid_document_type 
        CHECK (document_type IN (
          'manual', 'installation', 'maintenance', 
          'troubleshooting', 'parts', 'electrical', 
          'mechanical', 'safety', 'catalogue', 
          'schematic', 'datasheet', 'other'
        ));
    END IF;
END $$;

COMMENT ON COLUMN asset_documents.document_type IS 
'Document type: manual, installation, maintenance, troubleshooting, parts, electrical, mechanical, safety, catalogue, schematic, datasheet, other';

-- ============================================
-- STEP 5: Helper function to list documents
-- ============================================

CREATE OR REPLACE FUNCTION get_asset_documents(target_asset_id UUID)
RETURNS TABLE (
  document_id UUID,
  file_name TEXT,
  document_type TEXT,
  file_size BIGINT,
  total_chunks INTEGER,
  created_at TIMESTAMPTZ
)
LANGUAGE SQL AS $$
  SELECT 
    ad.id,
    ad.file_name,
    ad.document_type,
    ad.file_size,
    ad.total_chunks,
    ad.created_at
  FROM asset_documents ad
  WHERE ad.asset_id = target_asset_id
  ORDER BY ad.created_at DESC;
$$;

COMMENT ON FUNCTION get_asset_documents IS 
'Returns all documents for a given equipment';

-- ============================================
-- Verification queries
-- ============================================

-- Verify all chunks have document_id
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM document_chunks
  WHERE document_id IS NULL;
  
  IF orphan_count > 0 THEN
    RAISE EXCEPTION 'Found % orphan chunks without document_id', orphan_count;
  ELSE
    RAISE NOTICE 'Success: All chunks linked to documents';
  END IF;
END $$;

-- Verify FK constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_document_chunks_document'
  ) THEN
    RAISE EXCEPTION 'FK constraint not created';
  ELSE
    RAISE NOTICE 'Success: FK constraint exists';
  END IF;
END $$;
