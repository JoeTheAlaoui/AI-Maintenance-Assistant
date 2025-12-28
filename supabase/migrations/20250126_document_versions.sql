-- ================================================
-- Document Version Tracking Migration
-- ================================================
-- Date: 2025-01-26
-- Purpose: Add version management to asset_documents

-- ============================================
-- STEP 1: Add version tracking columns
-- ============================================

-- Add version columns to asset_documents
ALTER TABLE asset_documents 
ADD COLUMN IF NOT EXISTS version VARCHAR(50) DEFAULT '1.0',
ADD COLUMN IF NOT EXISTS is_latest BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS supersedes UUID REFERENCES asset_documents(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS superseded_by UUID REFERENCES asset_documents(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS version_notes TEXT,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- ============================================
-- STEP 2: Add indexes for version queries
-- ============================================

-- Index for finding latest documents
CREATE INDEX IF NOT EXISTS idx_documents_is_latest 
ON asset_documents(asset_id, is_latest) 
WHERE is_latest = true;

-- Indexes for version chain navigation
CREATE INDEX IF NOT EXISTS idx_documents_supersedes 
ON asset_documents(supersedes);

CREATE INDEX IF NOT EXISTS idx_documents_superseded_by 
ON asset_documents(superseded_by);

-- Index for archived documents
CREATE INDEX IF NOT EXISTS idx_documents_archived 
ON asset_documents(archived_at) 
WHERE archived_at IS NOT NULL;

-- ============================================
-- STEP 3: Function to get version chain
-- ============================================

CREATE OR REPLACE FUNCTION get_document_version_chain(doc_id UUID)
RETURNS TABLE(
  id UUID,
  version VARCHAR(50),
  created_at TIMESTAMPTZ,
  is_latest BOOLEAN,
  file_name TEXT,
  file_size BIGINT,
  version_notes TEXT,
  archived_at TIMESTAMPTZ,
  chain_order INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE version_chain AS (
    -- Start with given document
    SELECT 
      d.id,
      d.version,
      d.created_at,
      d.is_latest,
      d.file_name,
      d.file_size,
      d.version_notes,
      d.archived_at,
      d.supersedes,
      d.superseded_by,
      0 as depth
    FROM asset_documents d
    WHERE d.id = doc_id
    
    UNION ALL
    
    -- Follow supersedes chain backwards (older versions)
    SELECT 
      d.id,
      d.version,
      d.created_at,
      d.is_latest,
      d.file_name,
      d.file_size,
      d.version_notes,
      d.archived_at,
      d.supersedes,
      d.superseded_by,
      vc.depth - 1
    FROM asset_documents d
    INNER JOIN version_chain vc ON d.id = vc.supersedes
    WHERE vc.depth > -10 -- Prevent infinite loops
    
    UNION ALL
    
    -- Follow superseded_by chain forwards (newer versions)
    SELECT 
      d.id,
      d.version,
      d.created_at,
      d.is_latest,
      d.file_name,
      d.file_size,
      d.version_notes,
      d.archived_at,
      d.supersedes,
      d.superseded_by,
      vc.depth + 1
    FROM asset_documents d
    INNER JOIN version_chain vc ON d.id = vc.superseded_by
    WHERE vc.depth < 10 -- Prevent infinite loops
  )
  SELECT DISTINCT
    vc.id,
    vc.version,
    vc.created_at,
    vc.is_latest,
    vc.file_name,
    vc.file_size,
    vc.version_notes,
    vc.archived_at,
    vc.depth as chain_order
  FROM version_chain vc
  ORDER BY vc.created_at DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_document_version_chain IS 
'Returns all versions in a document chain (older and newer versions)';

-- ============================================
-- STEP 4: Function to mark document as superseded
-- ============================================

CREATE OR REPLACE FUNCTION mark_document_superseded(
  old_doc_id UUID,
  new_doc_id UUID
) RETURNS void AS $$
BEGIN
  -- Update old document
  UPDATE asset_documents
  SET 
    is_latest = false,
    superseded_by = new_doc_id
  WHERE id = old_doc_id;
  
  -- Update new document
  UPDATE asset_documents
  SET 
    supersedes = old_doc_id,
    is_latest = true
  WHERE id = new_doc_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION mark_document_superseded IS 
'Links two document versions: marks old as superseded by new';

-- ============================================
-- STEP 5: Function to archive document
-- ============================================

CREATE OR REPLACE FUNCTION archive_document(doc_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE asset_documents
  SET archived_at = NOW()
  WHERE id = doc_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION archive_document IS 
'Archives a document (hides from default search)';

-- ============================================
-- STEP 6: Function to promote previous version on delete
-- ============================================

CREATE OR REPLACE FUNCTION on_document_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- If deleting latest version, promote previous version
  IF OLD.is_latest = true AND OLD.supersedes IS NOT NULL THEN
    UPDATE asset_documents
    SET 
      is_latest = true,
      superseded_by = NULL
    WHERE id = OLD.supersedes;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for delete
DROP TRIGGER IF EXISTS trigger_document_delete ON asset_documents;
CREATE TRIGGER trigger_document_delete
BEFORE DELETE ON asset_documents
FOR EACH ROW
EXECUTE FUNCTION on_document_delete();

-- ============================================
-- STEP 7: Column comments
-- ============================================

COMMENT ON COLUMN asset_documents.version IS 'Version string (e.g., "1.0", "2.1", "2024-03")';
COMMENT ON COLUMN asset_documents.is_latest IS 'True only for the most recent version in chain';
COMMENT ON COLUMN asset_documents.supersedes IS 'Points to the previous version (older)';
COMMENT ON COLUMN asset_documents.superseded_by IS 'Points to the next version (newer)';
COMMENT ON COLUMN asset_documents.version_notes IS 'Change notes for this version';
COMMENT ON COLUMN asset_documents.archived_at IS 'When document was archived (hidden from search)';

-- ============================================
-- STEP 8: Migrate existing data
-- ============================================

-- Mark all existing documents as version 1.0 and latest
UPDATE asset_documents
SET 
  version = '1.0',
  is_latest = true
WHERE version IS NULL;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Document version tracking migration completed successfully';
END $$;
