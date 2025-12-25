-- Hybrid search: combines vector similarity with keyword matching
-- This provides better results for technical documents with specific terms

CREATE OR REPLACE FUNCTION hybrid_search_chunks(
    query_text TEXT,
    query_embedding vector(1536),
    match_asset_id UUID,
    match_threshold FLOAT DEFAULT 0.25,
    match_count INT DEFAULT 12
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    metadata JSONB,
    similarity FLOAT,
    keyword_rank FLOAT,
    combined_score FLOAT
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    WITH vector_results AS (
        SELECT 
            dc.id,
            dc.content,
            dc.metadata,
            (1 - (dc.embedding <=> query_embedding))::FLOAT AS similarity
        FROM document_chunks dc
        WHERE dc.asset_id = match_asset_id
            AND 1 - (dc.embedding <=> query_embedding) > match_threshold
    ),
    keyword_results AS (
        SELECT 
            dc.id,
            ts_rank(to_tsvector('french', dc.content), plainto_tsquery('french', query_text))::FLOAT AS keyword_rank
        FROM document_chunks dc
        WHERE dc.asset_id = match_asset_id
            AND to_tsvector('french', dc.content) @@ plainto_tsquery('french', query_text)
    )
    SELECT 
        v.id,
        v.content,
        v.metadata,
        v.similarity,
        COALESCE(k.keyword_rank, 0::FLOAT) AS keyword_rank,
        (v.similarity * 0.7 + COALESCE(k.keyword_rank, 0) * 0.3)::FLOAT AS combined_score
    FROM vector_results v
    LEFT JOIN keyword_results k ON v.id = k.id
    ORDER BY combined_score DESC
    LIMIT match_count;
END;
$$;

-- Add GIN index for full-text search if not exists
CREATE INDEX IF NOT EXISTS idx_document_chunks_content_fts 
ON document_chunks USING GIN (to_tsvector('french', content));

COMMENT ON FUNCTION hybrid_search_chunks IS 'Hybrid search combining 70% vector similarity with 30% keyword matching for better technical document retrieval';
