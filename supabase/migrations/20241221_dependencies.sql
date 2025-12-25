-- Phase 2: System Hierarchy & Dependencies Management
-- Enables dependency tracking between assets for smart diagnostics

-- 1. Create asset_dependencies table
CREATE TABLE IF NOT EXISTS asset_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- The asset that depends on another
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  
  -- The asset it depends on
  depends_on_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  
  -- Relationship type
  dependency_type TEXT NOT NULL DEFAULT 'feeds',
  -- 'feeds': upstream feeds this asset (Centrale → Malaxeur)
  -- 'powers': provides electrical power
  -- 'controls': provides control signals
  -- 'cools': provides cooling
  -- 'lubricates': provides lubrication
  
  -- How critical is this dependency
  criticality TEXT DEFAULT 'high',
  -- 'critical': Asset cannot function without this
  -- 'high': Significant impact if missing
  -- 'medium': Partial functionality affected
  -- 'low': Minor impact
  
  -- AI suggested or user created
  source TEXT DEFAULT 'manual',
  -- 'ai_suggested': AI proposed this
  -- 'manual': User created manually
  -- 'confirmed': AI suggested, user confirmed
  
  confidence FLOAT,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate dependencies
  UNIQUE(asset_id, depends_on_id, dependency_type)
);

CREATE INDEX IF NOT EXISTS idx_dependencies_asset ON asset_dependencies(asset_id);
CREATE INDEX IF NOT EXISTS idx_dependencies_depends_on ON asset_dependencies(depends_on_id);

COMMENT ON TABLE asset_dependencies IS 'Tracks dependencies between assets for intelligent diagnostics';

-- 2. Function to get full hierarchy path (root to asset)
CREATE OR REPLACE FUNCTION get_asset_path(target_asset_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  level TEXT,
  depth INTEGER
)
LANGUAGE SQL AS $$
  WITH RECURSIVE hierarchy AS (
    SELECT a.id, a.name, a.level, 0 as depth, a.parent_id
    FROM assets a
    WHERE a.id = target_asset_id
    
    UNION ALL
    
    SELECT a.id, a.name, a.level, h.depth + 1, a.parent_id
    FROM assets a
    JOIN hierarchy h ON a.id = h.parent_id
  )
  SELECT id, name, level, depth FROM hierarchy ORDER BY depth DESC;
$$;

-- 3. Function to get all descendants of an asset
CREATE OR REPLACE FUNCTION get_asset_descendants(root_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  level TEXT,
  parent_id UUID,
  depth INTEGER
)
LANGUAGE SQL AS $$
  WITH RECURSIVE descendants AS (
    SELECT a.id, a.name, a.level, a.parent_id, 0 as depth
    FROM assets a
    WHERE a.id = root_id
    
    UNION ALL
    
    SELECT a.id, a.name, a.level, a.parent_id, d.depth + 1
    FROM assets a
    JOIN descendants d ON a.parent_id = d.id
  )
  SELECT * FROM descendants WHERE id != root_id ORDER BY depth, name;
$$;

-- 4. Function to get upstream dependencies (what feeds this asset)
CREATE OR REPLACE FUNCTION get_upstream_dependencies(target_asset_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  level TEXT,
  dependency_type TEXT,
  criticality TEXT
)
LANGUAGE SQL AS $$
  SELECT a.id, a.name, a.level, d.dependency_type, d.criticality
  FROM asset_dependencies d
  JOIN assets a ON a.id = d.depends_on_id
  WHERE d.asset_id = target_asset_id
  ORDER BY 
    CASE d.criticality 
      WHEN 'critical' THEN 1 
      WHEN 'high' THEN 2 
      WHEN 'medium' THEN 3 
      ELSE 4 
    END;
$$;

-- 5. Function to get downstream dependencies (what depends on this asset)
CREATE OR REPLACE FUNCTION get_downstream_dependencies(target_asset_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  level TEXT,
  dependency_type TEXT,
  criticality TEXT
)
LANGUAGE SQL AS $$
  SELECT a.id, a.name, a.level, d.dependency_type, d.criticality
  FROM asset_dependencies d
  JOIN assets a ON a.id = d.asset_id
  WHERE d.depends_on_id = target_asset_id
  ORDER BY 
    CASE d.criticality 
      WHEN 'critical' THEN 1 
      WHEN 'high' THEN 2 
      WHEN 'medium' THEN 3 
      ELSE 4 
    END;
$$;

COMMENT ON FUNCTION get_asset_path IS 'Returns the full hierarchy path from root to the specified asset';
COMMENT ON FUNCTION get_asset_descendants IS 'Returns all child assets recursively under the specified asset';
COMMENT ON FUNCTION get_upstream_dependencies IS 'Returns assets that feed/supply the specified asset';
COMMENT ON FUNCTION get_downstream_dependencies IS 'Returns assets that depend on the specified asset';
