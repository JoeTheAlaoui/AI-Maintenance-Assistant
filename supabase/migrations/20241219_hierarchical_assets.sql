-- ============================================
-- Migration: Hierarchical Assets with Alias Support
-- Created: 2024-12-19
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ============================================
-- STEP 1: Add hierarchical columns to assets
-- ============================================
DO $$ 
BEGIN
    -- Add parent_id for hierarchy
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'assets' AND column_name = 'parent_id') THEN
        ALTER TABLE assets ADD COLUMN parent_id UUID REFERENCES assets(id) ON DELETE SET NULL;
    END IF;
    
    -- Add level column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'assets' AND column_name = 'level') THEN
        ALTER TABLE assets ADD COLUMN level TEXT DEFAULT 'equipment' 
            CHECK (level IN ('site', 'line', 'subsystem', 'equipment', 'component'));
    END IF;
    
    -- Add path column (materialized path for efficient queries)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'assets' AND column_name = 'path') THEN
        ALTER TABLE assets ADD COLUMN path TEXT;
    END IF;
    
    -- Add depth column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'assets' AND column_name = 'depth') THEN
        ALTER TABLE assets ADD COLUMN depth INTEGER DEFAULT 0;
    END IF;
END $$;

-- Create indexes for hierarchy queries
CREATE INDEX IF NOT EXISTS idx_assets_parent ON assets(parent_id);
CREATE INDEX IF NOT EXISTS idx_assets_level ON assets(level);
CREATE INDEX IF NOT EXISTS idx_assets_path ON assets(path);

-- ============================================
-- STEP 2: Create asset_aliases table
-- ============================================
CREATE TABLE IF NOT EXISTS asset_aliases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    
    alias TEXT NOT NULL,                   -- "Malaxeur 1", "M1", "مالاكسور 1"
    alias_normalized TEXT NOT NULL,        -- Lowercase, no accents: "malaxeur 1"
    language TEXT DEFAULT 'fr',            -- 'fr', 'ar', 'darija'
    is_primary BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(alias_normalized, asset_id)
);

-- Create indexes for alias search
CREATE INDEX IF NOT EXISTS idx_asset_aliases_asset ON asset_aliases(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_aliases_normalized ON asset_aliases(alias_normalized);
CREATE INDEX IF NOT EXISTS idx_asset_aliases_trgm ON asset_aliases USING GIN (alias_normalized gin_trgm_ops);

-- ============================================
-- STEP 3: Create resolve_asset_alias function
-- ============================================
CREATE OR REPLACE FUNCTION resolve_asset_alias(
    search_term TEXT,
    org_id UUID DEFAULT NULL
)
RETURNS TABLE (
    asset_id UUID,
    asset_name TEXT,
    technical_reference TEXT,
    match_type TEXT,
    confidence FLOAT
)
LANGUAGE plpgsql AS $$
DECLARE
    normalized_term TEXT;
BEGIN
    -- Normalize search term
    normalized_term := lower(unaccent(trim(search_term)));
    
    RETURN QUERY
    
    -- 1. Exact alias match (highest confidence)
    SELECT 
        a.id,
        a.name,
        a.model_number,
        'alias_exact'::TEXT,
        1.0::FLOAT
    FROM assets a
    JOIN asset_aliases aa ON a.id = aa.asset_id
    WHERE aa.alias_normalized = normalized_term
    
    UNION ALL
    
    -- 2. Technical reference match
    SELECT 
        a.id,
        a.name,
        a.model_number,
        'technical_ref'::TEXT,
        0.95::FLOAT
    FROM assets a
    WHERE lower(a.model_number) = normalized_term
    
    UNION ALL
    
    -- 3. Partial alias match (fuzzy using trigram)
    SELECT 
        a.id,
        a.name,
        a.model_number,
        'alias_partial'::TEXT,
        similarity(aa.alias_normalized, normalized_term)::FLOAT
    FROM assets a
    JOIN asset_aliases aa ON a.id = aa.asset_id
    WHERE aa.alias_normalized % normalized_term
        AND similarity(aa.alias_normalized, normalized_term) > 0.3
    
    UNION ALL
    
    -- 4. Name contains match
    SELECT 
        a.id,
        a.name,
        a.model_number,
        'name_contains'::TEXT,
        0.6::FLOAT
    FROM assets a
    WHERE lower(a.name) LIKE '%' || normalized_term || '%'
    
    ORDER BY confidence DESC
    LIMIT 5;
END;
$$;

-- ============================================
-- STEP 4: Create get_asset_hierarchy function
-- ============================================
CREATE OR REPLACE FUNCTION get_asset_hierarchy(root_asset_id UUID)
RETURNS TABLE (
    id UUID,
    name TEXT,
    level TEXT,
    depth INTEGER,
    path TEXT,
    parent_id UUID
)
LANGUAGE SQL AS $$
    WITH RECURSIVE hierarchy AS (
        -- Base case: root asset
        SELECT 
            a.id, a.name, a.level, 0 as depth, 
            a.id::TEXT as path, a.parent_id
        FROM assets a
        WHERE a.id = root_asset_id
        
        UNION ALL
        
        -- Recursive case: children
        SELECT 
            a.id, a.name, a.level, h.depth + 1,
            h.path || '/' || a.id::TEXT, a.parent_id
        FROM assets a
        JOIN hierarchy h ON a.parent_id = h.id
    )
    SELECT * FROM hierarchy ORDER BY depth, name;
$$;

-- ============================================
-- STEP 5: Create get_asset_ancestors function
-- ============================================
CREATE OR REPLACE FUNCTION get_asset_ancestors(asset_uuid UUID)
RETURNS TABLE (
    id UUID,
    name TEXT,
    level TEXT,
    depth INTEGER
)
LANGUAGE SQL AS $$
    WITH RECURSIVE ancestors AS (
        SELECT a.id, a.name, a.level, 0 as depth, a.parent_id
        FROM assets a
        WHERE a.id = asset_uuid
        
        UNION ALL
        
        SELECT a.id, a.name, a.level, anc.depth + 1, a.parent_id
        FROM assets a
        JOIN ancestors anc ON a.id = anc.parent_id
    )
    SELECT id, name, level, depth FROM ancestors ORDER BY depth DESC;
$$;

-- ============================================
-- STEP 6: Create smart_rag_search function
-- ============================================
CREATE OR REPLACE FUNCTION smart_rag_search(
    query_text TEXT,
    query_embedding vector(1536),
    match_asset_id UUID DEFAULT NULL,
    match_threshold FLOAT DEFAULT 0.4,
    match_count INT DEFAULT 8
)
RETURNS TABLE (
    chunk_id UUID,
    content TEXT,
    asset_id UUID,
    asset_name TEXT,
    technical_reference TEXT,
    similarity FLOAT,
    resolution_method TEXT
)
LANGUAGE plpgsql AS $$
DECLARE
    resolved_asset_id UUID;
    resolved_method TEXT;
BEGIN
    -- Step 1: If no asset_id provided, try to resolve from query
    IF match_asset_id IS NULL THEN
        SELECT ra.asset_id, ra.match_type 
        INTO resolved_asset_id, resolved_method
        FROM resolve_asset_alias(query_text) ra
        LIMIT 1;
    ELSE
        resolved_asset_id := match_asset_id;
        resolved_method := 'explicit';
    END IF;
    
    -- Step 2: If asset resolved, search only that asset's chunks
    IF resolved_asset_id IS NOT NULL THEN
        RETURN QUERY
        SELECT 
            dc.id,
            dc.content,
            a.id,
            a.name,
            a.model_number,
            1 - (dc.embedding <=> query_embedding) as sim,
            resolved_method
        FROM document_chunks dc
        JOIN assets a ON dc.asset_id = a.id
        WHERE dc.asset_id = resolved_asset_id
            AND 1 - (dc.embedding <=> query_embedding) > match_threshold
        ORDER BY dc.embedding <=> query_embedding
        LIMIT match_count;
    ELSE
        -- Step 3: Fallback to global search
        RETURN QUERY
        SELECT 
            dc.id,
            dc.content,
            a.id,
            a.name,
            a.model_number,
            1 - (dc.embedding <=> query_embedding) as sim,
            'semantic_search'::TEXT
        FROM document_chunks dc
        JOIN assets a ON dc.asset_id = a.id
        WHERE 1 - (dc.embedding <=> query_embedding) > match_threshold
        ORDER BY dc.embedding <=> query_embedding
        LIMIT match_count;
    END IF;
END;
$$;

-- ============================================
-- STEP 7: Helper function to normalize aliases
-- ============================================
CREATE OR REPLACE FUNCTION normalize_alias(input_text TEXT)
RETURNS TEXT
LANGUAGE SQL IMMUTABLE AS $$
    SELECT lower(unaccent(trim(input_text)));
$$;

-- ============================================
-- STEP 8: Trigger to auto-normalize alias
-- ============================================
CREATE OR REPLACE FUNCTION trigger_normalize_alias()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    NEW.alias_normalized := normalize_alias(NEW.alias);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_alias ON asset_aliases;
CREATE TRIGGER trg_normalize_alias
    BEFORE INSERT OR UPDATE ON asset_aliases
    FOR EACH ROW
    EXECUTE FUNCTION trigger_normalize_alias();
