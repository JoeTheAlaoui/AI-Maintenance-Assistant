// types/rag.ts

export interface DocumentChunk {
    id: string;
    asset_id: string;
    content: string;
    metadata: {
        page_number?: number;
        chunk_index: number;
        source_file?: string;
        extraction_method?: 'native' | 'ocr';
    };
    embedding?: number[];
    similarity?: number;
}

export interface AssetMetadata {
    name: string;
    manufacturer: string | null;
    model: string | null;
    serial_number: string | null;
    category: string | null;
    description: string | null;
}

export interface ExtractionInfo {
    method: 'native' | 'ocr';
    pages: number;
    confidence?: number;
}

export interface IngestionResult {
    success: boolean;
    asset_id: string;
    asset: {
        name: string;
        manufacturer: string | null;
        model: string | null;
        category: string | null;
    };
    extraction: ExtractionInfo;
    chunks_created: number;
    processing_time_ms: number;
    message: string;
}

export interface RAGContext {
    chunks: DocumentChunk[];
    asset_name: string;
    total_chunks_found: number;
}
