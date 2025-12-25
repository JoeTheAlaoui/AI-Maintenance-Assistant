// app/api/ai-import/route.ts
// AI-powered PDF manual import with SSE streaming progress

import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { generateEmbedding } from '@/lib/rag/embeddings';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { v4 as uuidv4 } from 'uuid';

// Progress stages
export enum ImportStage {
    UPLOADING = 'uploading',
    LOADING = 'loading',
    CHUNKING = 'chunking',
    EMBEDDING = 'embedding',
    STORING = 'storing',
    COMPLETE = 'complete',
    ERROR = 'error'
}

interface ProgressUpdate {
    stage: ImportStage;
    progress: number; // 0-100
    message: string;
    currentStep?: string;
    currentChunk?: number;
    totalChunks?: number;
    estimatedTimeRemaining?: number; // seconds
}

// Helper to send SSE updates
function sendProgress(
    encoder: TextEncoder,
    controller: ReadableStreamDefaultController,
    update: ProgressUpdate
) {
    const data = `data: ${JSON.stringify(update)}\n\n`;
    controller.enqueue(encoder.encode(data));
}

// Simple PDF text extraction using pdf-parse
async function extractTextFromPDF(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdf = require('pdf-parse');
    const data = await pdf(buffer);
    return {
        text: data.text,
        pageCount: data.numpages
    };
}

// Split text into chunks
function splitTextIntoChunks(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
        const end = Math.min(start + chunkSize, text.length);
        let chunk = text.slice(start, end);

        // Try to break at sentence or paragraph boundary
        if (end < text.length) {
            const lastPeriod = chunk.lastIndexOf('.');
            const lastNewline = chunk.lastIndexOf('\n');
            const breakPoint = Math.max(lastPeriod, lastNewline);

            if (breakPoint > chunkSize * 0.5) {
                chunk = chunk.slice(0, breakPoint + 1);
            }
        }

        chunks.push(chunk.trim());
        start = start + chunk.length - overlap;

        if (start <= 0 && chunks.length > 0) break; // Prevent infinite loop
    }

    return chunks.filter(c => c.length > 50); // Filter out tiny chunks
}

export async function POST(request: NextRequest) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            let tempFilePath: string | null = null;

            try {
                // 1. Get form data
                const formData = await request.formData();
                const file = formData.get('file') as File;
                const assetId = formData.get('assetId') as string;

                if (!file || !assetId) {
                    throw new Error('Missing required fields: file and assetId');
                }

                // Auth check
                const cookieStore = await cookies();
                const supabase = createClient(cookieStore);
                const { data: { user }, error: authError } = await supabase.auth.getUser();

                if (authError || !user) {
                    throw new Error('Unauthorized');
                }

                // Send: Uploading
                sendProgress(encoder, controller, {
                    stage: ImportStage.UPLOADING,
                    progress: 5,
                    message: 'Uploading file...',
                    currentStep: 'Receiving file from client'
                });

                // 2. Save file temporarily
                const bytes = await file.arrayBuffer();
                const buffer = Buffer.from(bytes);
                tempFilePath = join(tmpdir(), `${Date.now()}-${file.name}`);
                await writeFile(tempFilePath, buffer);

                sendProgress(encoder, controller, {
                    stage: ImportStage.UPLOADING,
                    progress: 10,
                    message: 'File uploaded successfully',
                    currentStep: `${(file.size / 1024 / 1024).toFixed(2)} MB received`
                });

                // 3. Extract PDF text
                sendProgress(encoder, controller, {
                    stage: ImportStage.LOADING,
                    progress: 15,
                    message: 'Loading PDF document...',
                    currentStep: 'Extracting text from PDF'
                });

                const { text, pageCount } = await extractTextFromPDF(buffer);

                sendProgress(encoder, controller, {
                    stage: ImportStage.LOADING,
                    progress: 25,
                    message: `PDF loaded: ${pageCount} pages found`,
                    currentStep: `Extracted ${text.length} characters`
                });

                // 4. Create document record first
                sendProgress(encoder, controller, {
                    stage: ImportStage.LOADING,
                    progress: 28,
                    message: 'Creating document record...',
                    currentStep: 'Saving to database'
                });

                const documentId = uuidv4();
                const { error: docError } = await supabase.from('asset_documents').insert({
                    id: documentId,
                    asset_id: assetId,
                    file_name: file.name,
                    file_size: file.size,
                    file_type: 'application/pdf',
                    processing_status: 'processing',
                    total_pages: pageCount,
                    metadata: {
                        extraction_method: 'native',
                        imported_at: new Date().toISOString()
                    }
                });

                if (docError) throw docError;

                // 5. Chunking
                sendProgress(encoder, controller, {
                    stage: ImportStage.CHUNKING,
                    progress: 30,
                    message: 'Splitting document into chunks...',
                    currentStep: 'Preparing text splitter'
                });

                const chunks = splitTextIntoChunks(text, 1000, 200);
                const totalChunks = chunks.length;

                sendProgress(encoder, controller, {
                    stage: ImportStage.CHUNKING,
                    progress: 40,
                    message: `Created ${totalChunks} chunks`,
                    currentStep: 'Text chunking complete',
                    totalChunks
                });

                // 6. Generate embeddings & store (with progress)
                sendProgress(encoder, controller, {
                    stage: ImportStage.EMBEDDING,
                    progress: 45,
                    message: 'Generating embeddings...',
                    currentStep: 'Initializing embedding model',
                    totalChunks
                });

                // Process chunks in batches
                const BATCH_SIZE = 5;
                const batches = Math.ceil(totalChunks / BATCH_SIZE);
                let processedChunks = 0;
                const startTime = Date.now();

                for (let i = 0; i < batches; i++) {
                    const batchStart = i * BATCH_SIZE;
                    const batchEnd = Math.min((i + 1) * BATCH_SIZE, totalChunks);
                    const batchChunks = chunks.slice(batchStart, batchEnd);

                    // Calculate progress (45-90% for embedding)
                    const embeddingProgress = 45 + Math.floor((i / batches) * 45);

                    // Calculate ETA
                    const elapsed = (Date.now() - startTime) / 1000;
                    const chunksPerSecond = processedChunks > 0 ? processedChunks / elapsed : 1;
                    const remainingChunks = totalChunks - processedChunks;
                    const estimatedTimeRemaining = Math.ceil(remainingChunks / chunksPerSecond);

                    sendProgress(encoder, controller, {
                        stage: ImportStage.EMBEDDING,
                        progress: embeddingProgress,
                        message: `Processing batch ${i + 1}/${batches}`,
                        currentStep: `Embedding chunks ${batchStart + 1}-${batchEnd}`,
                        currentChunk: processedChunks,
                        totalChunks,
                        estimatedTimeRemaining
                    });

                    // Generate embeddings and store each chunk
                    for (let j = 0; j < batchChunks.length; j++) {
                        const chunk = batchChunks[j];
                        const chunkIndex = batchStart + j;

                        try {
                            // Generate embedding
                            const embedding = await generateEmbedding(chunk);

                            // Store chunk with embedding
                            const { error: chunkError } = await supabase.from('document_chunks').insert({
                                id: uuidv4(),
                                document_id: documentId,
                                asset_id: assetId,
                                content: chunk,
                                embedding: `[${embedding.join(',')}]`,
                                chunk_index: chunkIndex,
                                metadata: {
                                    char_count: chunk.length,
                                    word_count: chunk.split(/\s+/).length
                                }
                            });

                            if (chunkError) {
                                console.error(`Error storing chunk ${chunkIndex}:`, chunkError);
                            }
                        } catch (embedError) {
                            console.error(`Error embedding chunk ${chunkIndex}:`, embedError);
                        }
                    }

                    processedChunks = batchEnd;
                }

                // 7. Final storage updates
                sendProgress(encoder, controller, {
                    stage: ImportStage.STORING,
                    progress: 95,
                    message: 'Finalizing import...',
                    currentStep: 'Updating document record'
                });

                // Update document status
                const { error: updateError } = await supabase
                    .from('asset_documents')
                    .update({
                        processing_status: 'completed',
                        total_chunks: totalChunks,
                        metadata: {
                            extraction_method: 'native',
                            imported_at: new Date().toISOString(),
                            chunks_created: processedChunks
                        }
                    })
                    .eq('id', documentId);

                if (updateError) throw updateError;

                // 8. Complete
                sendProgress(encoder, controller, {
                    stage: ImportStage.COMPLETE,
                    progress: 100,
                    message: 'Import completed successfully! ✅',
                    currentStep: `${processedChunks} chunks indexed and ready for AI search`,
                    totalChunks: processedChunks
                });

                // Clean up temp file
                if (tempFilePath) {
                    try {
                        await unlink(tempFilePath);
                    } catch { }
                }

                controller.close();

            } catch (error: any) {
                console.error('Import error:', error);

                sendProgress(encoder, controller, {
                    stage: ImportStage.ERROR,
                    progress: 0,
                    message: `Error: ${error.message}`,
                    currentStep: 'Import failed'
                });

                // Clean up temp file on error
                if (tempFilePath) {
                    try {
                        await unlink(tempFilePath);
                    } catch { }
                }

                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
