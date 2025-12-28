-- ================================================
-- CRITICAL: Fix organization_id Schema
-- Migration: 20250128_fix_organization_schema.sql
-- ================================================

-- First, check current state
DO $$
DECLARE
  orphaned_count INTEGER;
  org_count INTEGER;
  first_org_id UUID;
BEGIN
  SELECT COUNT(*) INTO orphaned_count 
  FROM assets 
  WHERE organization_id IS NULL;
  
  SELECT COUNT(*) INTO org_count FROM organizations;
  
  RAISE NOTICE 'Found % assets without organization_id', orphaned_count;
  RAISE NOTICE 'Found % organizations in database', org_count;
  
  IF org_count = 0 THEN
    RAISE EXCEPTION 'No organizations found! Create an organization first.';
  END IF;
END $$;

-- 1. Get the first organization ID (most reliable method)
DO $$
DECLARE
  first_org_id UUID;
BEGIN
  SELECT id INTO first_org_id 
  FROM organizations 
  ORDER BY created_at ASC 
  LIMIT 1;
  
  -- Update ALL assets without organization_id
  UPDATE assets
  SET organization_id = first_org_id
  WHERE organization_id IS NULL;
  
  RAISE NOTICE 'Updated all orphaned assets to organization: %', first_org_id;
END $$;

-- 2. Verify all assets now have organization_id
DO $$
DECLARE
  orphaned_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphaned_count 
  FROM assets 
  WHERE organization_id IS NULL;
  
  IF orphaned_count > 0 THEN
    RAISE EXCEPTION 'Still have % orphaned assets after update!', orphaned_count;
  ELSE
    RAISE NOTICE '✅ All assets now have organization_id';
  END IF;
END $$;

-- 3. Now make it NOT NULL (prevent future issues)
ALTER TABLE assets 
ALTER COLUMN organization_id SET NOT NULL;

-- 4. Add foreign key constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_assets_organization'
  ) THEN
    ALTER TABLE assets
    ADD CONSTRAINT fk_assets_organization 
      FOREIGN KEY (organization_id) 
      REFERENCES organizations(id) 
      ON DELETE RESTRICT;
  END IF;
END $$;

-- 5. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_assets_organization 
ON assets(organization_id);

-- 6. Final verification
DO $$
DECLARE
  total_assets INTEGER;
  with_org INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_assets FROM assets;
  SELECT COUNT(*) INTO with_org FROM assets WHERE organization_id IS NOT NULL;
  
  RAISE NOTICE '✅ MIGRATION COMPLETE: % of % assets have organization_id', with_org, total_assets;
END $$;

-- 7. Document the change
COMMENT ON COLUMN assets.organization_id IS 
  'Required: Every asset must belong to an organization. Set via user context during creation.';
