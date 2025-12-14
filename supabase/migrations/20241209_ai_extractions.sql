-- Migration: Create ai_extractions table
-- Tracks all AI-powered asset extractions with cost, usage, and results

CREATE TABLE IF NOT EXISTS ai_extractions (
    -- Primary Key
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- User & File Info
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    
    -- AI Model & Usage
    model_used TEXT NOT NULL DEFAULT 'claude-3-5-sonnet-20241022',
    tokens_used INTEGER NOT NULL,
    cost_usd DECIMAL(10, 4) NOT NULL, -- Ex: 0.0653
    
    -- Extraction Quality
    confidence_score DECIMAL(3, 2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    extracted_assets_count INTEGER DEFAULT 1,
    extracted_components_count INTEGER DEFAULT 0,
    extracted_parts_count INTEGER DEFAULT 0,
    
    -- Results (JSONB for flexibility)
    raw_response JSONB NOT NULL,
    
    -- Performance
    processing_time_ms INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_ai_extractions_user_id ON ai_extractions(user_id);
CREATE INDEX idx_ai_extractions_created_at ON ai_extractions(created_at DESC);
CREATE INDEX idx_ai_extractions_confidence ON ai_extractions(confidence_score DESC);

-- RLS Policies
ALTER TABLE ai_extractions ENABLE ROW LEVEL SECURITY;

-- Users can view their own extractions
CREATE POLICY "Users can view own extractions"
    ON ai_extractions FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own extractions
CREATE POLICY "Users can create extractions"
    ON ai_extractions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ai_extractions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_extractions_updated_at
    BEFORE UPDATE ON ai_extractions
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_extractions_updated_at();

-- Comment
COMMENT ON TABLE ai_extractions IS 'Stores AI-powered asset extraction results with cost tracking';
