-- ================================================
-- Auto-Dependency Detection Schema
-- ================================================
-- Date: 2025-01-27
-- Purpose: Store AI-generated dependency suggestions from document analysis

-- 1. Create dependency_suggestions table
CREATE TABLE IF NOT EXISTS dependency_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source equipment (the one being analyzed)
  source_asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  
  -- Target equipment (the one being referenced)
  target_asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  target_name_raw TEXT NOT NULL, -- Raw name from document (may not match DB)
  
  -- Relationship details
  relationship_type TEXT NOT NULL, -- 'upstream', 'downstream', 'alternative', 'related'
  confidence DECIMAL(3,2) NOT NULL, -- 0.00 - 1.00
  
  -- Context from document
  context_snippet TEXT, -- "receives filtered air from..."
  document_id UUID REFERENCES asset_documents(id) ON DELETE CASCADE,
  
  -- User action
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'auto_approved'
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_relationship_type CHECK (
    relationship_type IN ('upstream', 'downstream', 'alternative', 'related', 'parallel')
  ),
  CONSTRAINT valid_status CHECK (
    status IN ('pending', 'approved', 'rejected', 'auto_approved')
  ),
  CONSTRAINT valid_confidence CHECK (confidence >= 0 AND confidence <= 1)
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_suggestions_source ON dependency_suggestions(source_asset_id, status);
CREATE INDEX IF NOT EXISTS idx_suggestions_target ON dependency_suggestions(target_asset_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_status ON dependency_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_suggestions_confidence ON dependency_suggestions(confidence DESC);

-- 3. Function to approve suggestion (creates actual dependency)
CREATE OR REPLACE FUNCTION approve_dependency_suggestion(suggestion_id UUID)
RETURNS void AS $$
DECLARE
  suggestion RECORD;
BEGIN
  -- Get suggestion details
  SELECT * INTO suggestion
  FROM dependency_suggestions
  WHERE id = suggestion_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Suggestion not found';
  END IF;
  
  IF suggestion.target_asset_id IS NULL THEN
    RAISE EXCEPTION 'Cannot approve: no matching equipment found';
  END IF;
  
  -- Create dependency in asset_dependencies table
  INSERT INTO asset_dependencies (
    equipement_id,
    depends_on_id,
    dependency_type,
    description
  ) VALUES (
    CASE 
      WHEN suggestion.relationship_type = 'upstream' THEN suggestion.source_asset_id
      ELSE suggestion.target_asset_id
    END,
    CASE 
      WHEN suggestion.relationship_type = 'upstream' THEN suggestion.target_asset_id
      ELSE suggestion.source_asset_id
    END,
    suggestion.relationship_type,
    suggestion.context_snippet
  )
  ON CONFLICT DO NOTHING;
  
  -- Mark suggestion as approved
  UPDATE dependency_suggestions
  SET 
    status = 'approved',
    reviewed_at = NOW()
  WHERE id = suggestion_id;
END;
$$ LANGUAGE plpgsql;

-- 4. Function to auto-approve high-confidence suggestions
CREATE OR REPLACE FUNCTION auto_approve_high_confidence_suggestions(
  min_confidence DECIMAL DEFAULT 0.95
)
RETURNS INTEGER AS $$
DECLARE
  approved_count INTEGER := 0;
  suggestion RECORD;
BEGIN
  FOR suggestion IN 
    SELECT id 
    FROM dependency_suggestions
    WHERE status = 'pending'
    AND confidence >= min_confidence
    AND target_asset_id IS NOT NULL -- Must have matched equipment
  LOOP
    BEGIN
      PERFORM approve_dependency_suggestion(suggestion.id);
      approved_count := approved_count + 1;
    EXCEPTION WHEN OTHERS THEN
      -- Skip failed approvals
      CONTINUE;
    END;
  END LOOP;
  
  RETURN approved_count;
END;
$$ LANGUAGE plpgsql;

-- 5. Comments
COMMENT ON TABLE dependency_suggestions IS 'AI-generated dependency suggestions from document analysis';
COMMENT ON COLUMN dependency_suggestions.target_name_raw IS 'Equipment name as it appears in document (before fuzzy matching)';
COMMENT ON COLUMN dependency_suggestions.confidence IS 'AI confidence score (0.0-1.0)';
COMMENT ON COLUMN dependency_suggestions.context_snippet IS 'Text snippet showing the relationship context';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Dependency suggestions schema created successfully';
END $$;
