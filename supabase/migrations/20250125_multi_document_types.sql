-- Migration: Add multi-type classification support
-- This allows documents to have multiple types (e.g., maintenance + spare parts)

-- 1. Add new array column for document types
ALTER TABLE asset_documents 
ADD COLUMN document_types text[] DEFAULT ARRAY['manual'];

-- 2. Add AI classification tracking columns
ALTER TABLE asset_documents 
ADD COLUMN ai_classified boolean DEFAULT false;

ALTER TABLE asset_documents 
ADD COLUMN classification_confidence numeric(3,2) DEFAULT 0.0;

-- 3. Migrate existing data from single type to array
UPDATE asset_documents
SET document_types = ARRAY[document_type]::text[]
WHERE document_type IS NOT NULL AND document_types IS NULL;

-- 4. Make document_types required
ALTER TABLE asset_documents 
ALTER COLUMN document_types SET NOT NULL;

-- 5. Add GIN index for efficient array searches
CREATE INDEX idx_document_types ON asset_documents USING GIN (document_types);

-- 6. Add comment for documentation
COMMENT ON COLUMN asset_documents.document_types IS 'Array of document content types (e.g., [''maintenance'', ''parts''])';
COMMENT ON COLUMN asset_documents.ai_classified IS 'Whether document types were determined by AI';
COMMENT ON COLUMN asset_documents.classification_confidence IS 'AI classification confidence score (0.0-1.0)';

-- Note: Keeping old document_type column for backward compatibility
-- Can be dropped in future migration after confirming everything works
