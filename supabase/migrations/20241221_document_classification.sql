-- Phase 1: Document Classification & Schematic Intelligence
-- Adds document type classification and schematic analysis capabilities

-- 1. Update asset_documents with classification fields
ALTER TABLE asset_documents 
ADD COLUMN IF NOT EXISTS document_type TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS document_type_confidence FLOAT,
ADD COLUMN IF NOT EXISTS user_confirmed BOOLEAN DEFAULT false;

-- document_type values: 'manual', 'installation', 'catalogue', 'schematic', 'datasheet', 'other'

COMMENT ON COLUMN asset_documents.document_type IS 'AI-classified document type: manual, installation, catalogue, schematic, datasheet, other';
COMMENT ON COLUMN asset_documents.document_type_confidence IS 'AI classification confidence score 0-1';
COMMENT ON COLUMN asset_documents.user_confirmed IS 'Whether user has confirmed/corrected the classification';

-- 2. Create schematic_analysis table for extracted schematic data
CREATE TABLE IF NOT EXISTS schematic_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  document_id UUID REFERENCES asset_documents(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  
  -- Classification
  schematic_type TEXT NOT NULL, -- 'electrical', 'pneumatic', 'hydraulic', 'mechanical', 'pid'
  
  -- Extracted data
  components JSONB DEFAULT '[]',
  -- Example: [{"ref": "Q1", "type": "disjoncteur", "value": "16A"}, ...]
  
  connections JSONB DEFAULT '[]',
  -- Example: [{"from": "Q1", "to": "KM1", "type": "power"}, ...]
  
  diagnostic_sequence TEXT[] DEFAULT '{}',
  -- Example: ['Q1', 'KM1', 'RT1', 'M1']
  
  -- Raw Vision AI output
  raw_description TEXT,
  
  -- Image reference (path in storage)
  image_path TEXT,
  
  -- Metadata
  confidence FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_schematic_asset ON schematic_analysis(asset_id);
CREATE INDEX IF NOT EXISTS idx_schematic_document ON schematic_analysis(document_id);
CREATE INDEX IF NOT EXISTS idx_schematic_type ON schematic_analysis(schematic_type);

COMMENT ON TABLE schematic_analysis IS 'Stores extracted schematic data including components, connections, and diagnostic sequences';

-- 3. Update document_chunks with content type classification
ALTER TABLE document_chunks
ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'text',
ADD COLUMN IF NOT EXISTS section_type TEXT;

-- content_type: 'text', 'schematic_description', 'table', 'spec_table'
-- section_type: 'maintenance', 'installation', 'troubleshooting', 'specs', 'parts_list', 'safety'

COMMENT ON COLUMN document_chunks.content_type IS 'Type of content: text, schematic_description, table';
COMMENT ON COLUMN document_chunks.section_type IS 'Section category: maintenance, installation, troubleshooting, specs, parts_list, safety';
