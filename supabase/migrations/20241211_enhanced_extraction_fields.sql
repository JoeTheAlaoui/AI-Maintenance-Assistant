-- Migration: Add enhanced extraction fields to assets table
-- Description: Adds JSONB columns for multi-pass AI extraction data

-- Add new columns for enhanced extraction data
ALTER TABLE public.assets 
ADD COLUMN IF NOT EXISTS manufacturer text,
ADD COLUMN IF NOT EXISTS model_number text,
ADD COLUMN IF NOT EXISTS serial_number text,
ADD COLUMN IF NOT EXISTS category text DEFAULT 'equipment',
ADD COLUMN IF NOT EXISTS criticality text DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS specifications jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS model_configurations jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS integrated_subsystems jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS electrical_components jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS motor_protection_settings jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS diagnostic_codes jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS specification_tables jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS completeness_score integer,
ADD COLUMN IF NOT EXISTS extraction_metadata jsonb,
ADD COLUMN IF NOT EXISTS ai_extraction_id uuid REFERENCES public.ai_extractions(id);

-- Add comments for documentation
COMMENT ON COLUMN public.assets.manufacturer IS 'Equipment manufacturer name';
COMMENT ON COLUMN public.assets.model_number IS 'Model number/identifier';
COMMENT ON COLUMN public.assets.serial_number IS 'Serial number if available';
COMMENT ON COLUMN public.assets.category IS 'Equipment category (compressor, pump, motor, etc.)';
COMMENT ON COLUMN public.assets.criticality IS 'Criticality level (low, medium, high, critical)';
COMMENT ON COLUMN public.assets.specifications IS 'General specifications as key-value pairs';
COMMENT ON COLUMN public.assets.model_configurations IS 'Model configurations with pressure/flow data';
COMMENT ON COLUMN public.assets.integrated_subsystems IS 'Integrated subsystems (dryer, cooling, etc.)';
COMMENT ON COLUMN public.assets.electrical_components IS 'Electrical components (contactors, relays, fuses)';
COMMENT ON COLUMN public.assets.motor_protection_settings IS 'Motor protection settings by power rating';
COMMENT ON COLUMN public.assets.diagnostic_codes IS 'Diagnostic/alarm codes with actions';
COMMENT ON COLUMN public.assets.specification_tables IS 'Complete specification tables from manual';
COMMENT ON COLUMN public.assets.completeness_score IS 'AI extraction completeness score (0-100)';
COMMENT ON COLUMN public.assets.extraction_metadata IS 'AI extraction metadata (tokens, cost, time)';
COMMENT ON COLUMN public.assets.ai_extraction_id IS 'Reference to original AI extraction';

-- Create index for faster queries on new columns
CREATE INDEX IF NOT EXISTS idx_assets_category ON public.assets(category);
CREATE INDEX IF NOT EXISTS idx_assets_criticality ON public.assets(criticality);
CREATE INDEX IF NOT EXISTS idx_assets_completeness ON public.assets(completeness_score);

-- GIN indexes for JSONB search
CREATE INDEX IF NOT EXISTS idx_assets_diagnostic_codes ON public.assets USING gin(diagnostic_codes);
CREATE INDEX IF NOT EXISTS idx_assets_electrical_components ON public.assets USING gin(electrical_components);
