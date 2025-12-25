// app/api/ingest/route.ts
// SSE Streaming Ingest with Parallel OCR and Optimized Processing

import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { generateEmbeddings } from '@/lib/rag/embeddings';
import { estimatePageNumber } from '@/lib/rag/chunker';
import { extractAssetMetadata } from '@/lib/rag/metadata-extractor';
import { extractPDFText } from '@/lib/rag/pdf-extractor';
import { classifyDocument } from '@/lib/rag/document-classifier';
import { v4 as uuidv4 } from 'uuid';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import type { Document } from '@langchain/core/documents';

export const maxDuration = 300; // 5 minutes

// Progress stages
enum ImportStage {
    UPLOADING = 'uploading',
    LOADING = 'loading',
    OCR = 'ocr',
    METADATA = 'metadata',
    CHUNKING = 'chunking',
    EMBEDDING = 'embedding',
    STORING = 'storing',
    COMPLETE = 'complete',
    ERROR = 'error'
}

interface ProgressUpdate {
    stage: ImportStage;
    progress: number;
    message: string;
    currentStep?: string;
    currentPage?: number;
    totalPages?: number;
    currentChunk?: number;
    totalChunks?: number;
    estimatedTimeRemaining?: number;
    result?: any;
}

/**
 * Pre-process OCR text to optimize for semantic chunking
 * Focus: Quality over speed - preserve meaning and structure
 */
function preprocessOCRForQualityChunking(text: string): string {
    console.log('🧹 Pre-processing OCR text for quality chunking...');

    // Step 1: Remove page markers (OCR artifacts)
    let processed = text.replace(/\[Page \d+\]/gi, '');

    // Step 2: Identify and preserve section headers
    // Headers are typically: ALL CAPS, short lines, or numbered sections
    const lines = processed.split('\n');
    const processedLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const nextLine = lines[i + 1]?.trim() || '';

        // Skip empty lines
        if (line.length === 0) {
            processedLines.push('');
            continue;
        }

        // Detect section headers (preserve with markers for splitting)
        // ULTRA CONSERVATIVE - only major document sections
        const isSectionHeader = (
            // Must be ALL CAPS, have 3+ words, and be 20-100 chars
            (line === line.toUpperCase() &&
                line.length >= 20 &&
                line.length <= 100 &&
                line.split(/\s+/).length >= 3 &&  // At least 3 words
                /[A-Z]{3,}/.test(line) &&  // At least 3 consecutive letters
                !/^\d+$/.test(line) &&  // Not just numbers
                !line.includes('©') && !line.includes('®') &&  // No symbols
                !line.includes('==') && !line.includes('--')) ||  // No decorations
            // Numbered sections with substantial content
            (/^\d{1,2}\.-\s+[A-Z\s]{15,}$/i.test(line) && line.length >= 20) ||
            // Key French section patterns with strict length requirements
            (/^(MODES?\s+DE\s+FONCTIONNEMENT|CONSIGNES?\s+DE\s+SECURITE|ANOMALIES?\s+(ET\s+)?SOLUTIONS?|MAINTENANCE\s+PREVENTIVE|CARACTERISTIQUES\s+TECHNIQUES|DONNEES\s+A\s+PROGRAMMER|FONCTIONNEMENT\s+(MANUEL|AUTOMATIQUE)|FACTEURS?\s+A\s+CONSIDERER)/i.test(line) && line.length >= 20)
        );

        if (isSectionHeader) {
            // Add section marker for later splitting
            processedLines.push(`\n\n§§§SECTION§§§ ${line}\n`);
            continue;
        }

        // Detect list items (preserve structure)
        const isListItem = /^[-•*]\s/.test(line) || /^\d+[.)]\s/.test(line);
        if (isListItem) {
            processedLines.push(line);
            continue;
        }

        // Merge very short lines (< 40 chars) with previous line
        // UNLESS they're clearly intentional (like addresses, codes)
        if (line.length < 40 && processedLines.length > 0) {
            const lastLine = processedLines[processedLines.length - 1];

            // Don't merge if:
            // - Previous line is a section marker
            // - Line is clearly standalone (ends with period, colon)
            // - Line looks like contact info, codes, etc.
            if (
                !lastLine.includes('§§§SECTION§§§') &&
                !lastLine.endsWith(':') &&
                !line.endsWith(':') &&
                !/^[A-Z]\d/.test(line) && // Not codes like "F1", "F2"
                !/^\d{2,}/.test(line)      // Not numbers
            ) {
                // Merge with previous line
                processedLines[processedLines.length - 1] = `${lastLine} ${line}`;
                continue;
            }
        }

        processedLines.push(line);
    }

    // Step 3: Normalize spacing
    processed = processedLines
        .join('\n')
        .replace(/\n{4,}/g, '\n\n\n')  // Max 3 newlines
        .replace(/[ \t]+/g, ' ')        // Normalize spaces
        .trim();

    // Step 4: Log quality metrics
    const originalLineCount = text.split('\n').length;
    const processedLineCount = processed.split('\n').length;
    const sectionMatches = processed.match(/§§§SECTION§§§\s+([^\n]+)/g) || [];
    const sectionCount = sectionMatches.length;

    console.log(`
🧹 ========= PRE-PROCESSING RESULTS =========
📊 Original lines: ${originalLineCount}
📊 Processed lines: ${processedLineCount}
📊 Lines reduced: ${originalLineCount - processedLineCount} (${Math.round((1 - processedLineCount / originalLineCount) * 100)}%)
📊 Sections identified: ${sectionCount}
📊 Processed length: ${processed.length} chars

📋 Detected sections:
${sectionMatches.slice(0, 10).map((s, i) => `   ${i + 1}. ${s.replace('§§§SECTION§§§ ', '')}`).join('\n')}
${sectionCount > 10 ? `   ... and ${sectionCount - 10} more sections` : ''}
============================================
    `);

    return processed;
}

/**
 * Section-aware semantic chunking for optimal RAG quality
 * Priority: Each chunk should be independently meaningful
 */
async function createQualityChunks(text: string): Promise<Document[]> {
    console.log('📦 Creating quality-optimized chunks...');

    // Step 1: Split by sections first
    const sections = text.split(/§§§SECTION§§§/).filter(s => s.trim());

    console.log(`📑 Found ${sections.length} major sections in document`);

    // If no sections found, treat entire text as one section
    if (sections.length === 0) {
        console.log('⚠️ No sections detected, treating entire document as one section');
        sections.push(text);
    }

    const allChunks: Document[] = [];
    let globalChunkIndex = 0;

    // Step 2: Process each section independently
    for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
        const sectionText = sections[sectionIndex].trim();

        // Extract section title (first line)
        const firstNewline = sectionText.indexOf('\n');
        const sectionTitle = firstNewline > 0
            ? sectionText.substring(0, firstNewline).trim()
            : 'Introduction';

        const sectionContent = firstNewline > 0
            ? sectionText.substring(firstNewline).trim()
            : sectionText;

        console.log(`\n📄 Processing section ${sectionIndex + 1}/${sections.length}: "${sectionTitle}"`);
        console.log(`   Length: ${sectionContent.length} chars`);

        // Step 3: Configure splitter based on section length
        const targetChunkSize = 1500;  // Optimal for most LLMs
        const minChunkSize = 800;      // Minimum meaningful chunk

        // If section is small enough, keep it as one chunk
        if (sectionContent.length <= targetChunkSize) {
            allChunks.push({
                pageContent: sectionContent,
                metadata: {
                    section: sectionTitle,
                    chunkIndex: globalChunkIndex++,
                    sectionIndex,
                    isComplete: true,  // This chunk contains a complete section
                }
            });
            console.log(`   ✓ Section kept as single chunk`);
            continue;
        }

        // Step 4: For larger sections, use semantic splitting
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: targetChunkSize,
            chunkOverlap: 200,  // Ensure context continuity

            // Quality-focused separators (order matters!)
            separators: [
                '\n\n\n',           // Multiple paragraph breaks
                '\n\n',             // Paragraph breaks
                '\n- ',             // List items
                '\n• ',             // Bullet points
                '\n\\d+[.)] ',      // Numbered lists
                '. ',               // Sentence endings
                '; ',               // Semicolons
                ', ',               // Commas (last resort)
                ' ',                // Words (fallback)
            ],

            // Preserve separators for context
            keepSeparator: true,

            // Length function that counts actual characters
            lengthFunction: (text: string) => text.length,
        });

        // Split the section
        const sectionChunks = await splitter.createDocuments([sectionContent]);

        // Step 5: Add rich metadata to each chunk
        for (let i = 0; i < sectionChunks.length; i++) {
            const chunk = sectionChunks[i];

            allChunks.push({
                pageContent: chunk.pageContent,
                metadata: {
                    section: sectionTitle,
                    chunkIndex: globalChunkIndex++,
                    sectionIndex,
                    chunkInSection: i,
                    totalChunksInSection: sectionChunks.length,
                    isComplete: false,  // This is a partial chunk
                    chunkSize: chunk.pageContent.length,
                }
            });
        }

        console.log(`   ✓ Section split into ${sectionChunks.length} semantic chunks`);
    }

    return allChunks;
}

/**
 * Validate chunk quality and provide detailed analysis
 */
function validateChunkQuality(chunks: Document[]): {
    isValid: boolean;
    metrics: any;
    warnings: string[];
    recommendations: string[];
} {
    console.log('\n🔍 ========= CHUNK QUALITY VALIDATION =========');

    const metrics = {
        totalChunks: chunks.length,
        avgSize: 0,
        medianSize: 0,
        minSize: Infinity,
        maxSize: 0,
        sizeDistribution: {
            tiny: 0,      // < 500
            small: 0,     // 500-1000
            optimal: 0,   // 1000-1800
            large: 0,     // 1800-2500
            huge: 0       // > 2500
        },
        uniqueChunks: 0,
        duplicateChunks: 0,
        completeSections: 0,
        partialSections: 0,
    };

    const warnings: string[] = [];
    const recommendations: string[] = [];
    const chunkSizes: number[] = [];
    const chunkContents = new Set<string>();

    // Analyze each chunk
    for (const chunk of chunks) {
        const size = chunk.pageContent.length;
        chunkSizes.push(size);

        metrics.minSize = Math.min(metrics.minSize, size);
        metrics.maxSize = Math.max(metrics.maxSize, size);

        // Size distribution
        if (size < 500) metrics.sizeDistribution.tiny++;
        else if (size < 1000) metrics.sizeDistribution.small++;
        else if (size <= 1800) metrics.sizeDistribution.optimal++;
        else if (size <= 2500) metrics.sizeDistribution.large++;
        else metrics.sizeDistribution.huge++;

        // Check for duplicates
        const normalized = chunk.pageContent.trim().toLowerCase();
        if (chunkContents.has(normalized)) {
            metrics.duplicateChunks++;
        } else {
            chunkContents.add(normalized);
            metrics.uniqueChunks++;
        }

        // Count complete vs partial sections
        if (chunk.metadata?.isComplete) {
            metrics.completeSections++;
        } else {
            metrics.partialSections++;
        }
    }

    // Calculate statistics
    metrics.avgSize = Math.round(chunkSizes.reduce((a, b) => a + b, 0) / chunks.length);
    chunkSizes.sort((a, b) => a - b);
    metrics.medianSize = chunkSizes[Math.floor(chunkSizes.length / 2)];

    // Generate warnings
    if (metrics.totalChunks > 150) {
        warnings.push(`⚠️ High chunk count (${metrics.totalChunks}) may indicate over-fragmentation`);
        recommendations.push('Consider increasing chunk size to 2000-2500 chars');
    }

    if (metrics.totalChunks < 20) {
        warnings.push(`⚠️ Low chunk count (${metrics.totalChunks}) may indicate under-chunking`);
        recommendations.push('Consider decreasing chunk size to 1000-1200 chars');
    }

    if (metrics.avgSize < 800) {
        warnings.push(`⚠️ Average chunk size too small (${metrics.avgSize} chars)`);
        recommendations.push('Chunks should be 1000-1500 chars for optimal RAG quality');
    }

    if (metrics.sizeDistribution.tiny > chunks.length * 0.3) {
        warnings.push(`⚠️ ${metrics.sizeDistribution.tiny} chunks are tiny (<500 chars)`);
        recommendations.push('Review separator configuration to reduce fragmentation');
    }

    if (metrics.duplicateChunks > 0) {
        warnings.push(`⚠️ Found ${metrics.duplicateChunks} duplicate chunks`);
        recommendations.push('Investigate chunking logic for redundancy issues');
    }

    // Determine if quality is acceptable
    const isValid = (
        metrics.totalChunks >= 20 &&
        metrics.totalChunks <= 150 &&
        metrics.avgSize >= 800 &&
        metrics.avgSize <= 2000 &&
        metrics.sizeDistribution.optimal >= chunks.length * 0.5 &&
        metrics.duplicateChunks === 0
    );

    // Display results
    console.log(`
📊 CHUNK STATISTICS:
   Total chunks: ${metrics.totalChunks}
   Unique chunks: ${metrics.uniqueChunks}
   Duplicate chunks: ${metrics.duplicateChunks}

📏 SIZE METRICS:
   Average: ${metrics.avgSize} chars
   Median: ${metrics.medianSize} chars
   Range: ${metrics.minSize} - ${metrics.maxSize} chars

📊 SIZE DISTRIBUTION:
   Tiny (<500):       ${metrics.sizeDistribution.tiny} chunks (${Math.round(metrics.sizeDistribution.tiny / chunks.length * 100)}%)
   Small (500-1000):  ${metrics.sizeDistribution.small} chunks (${Math.round(metrics.sizeDistribution.small / chunks.length * 100)}%)
   ✨ Optimal (1000-1800): ${metrics.sizeDistribution.optimal} chunks (${Math.round(metrics.sizeDistribution.optimal / chunks.length * 100)}%)
   Large (1800-2500): ${metrics.sizeDistribution.large} chunks (${Math.round(metrics.sizeDistribution.large / chunks.length * 100)}%)
   Huge (>2500):      ${metrics.sizeDistribution.huge} chunks (${Math.round(metrics.sizeDistribution.huge / chunks.length * 100)}%)

📑 SECTION COMPLETENESS:
   Complete sections: ${metrics.completeSections}
   Partial sections: ${metrics.partialSections}

🎯 QUALITY ASSESSMENT: ${isValid ? '✅ EXCELLENT' : '⚠️ NEEDS IMPROVEMENT'}
    `);

    if (warnings.length > 0) {
        console.log('⚠️ WARNINGS:');
        warnings.forEach(w => console.log(`   ${w}`));
    }

    if (recommendations.length > 0) {
        console.log('\n💡 RECOMMENDATIONS:');
        recommendations.forEach(r => console.log(`   ${r}`));
    }

    console.log('================================================\n');

    return { isValid, metrics, warnings, recommendations };
}

/**
 * Aggressive OCR text cleaning for RAG quality
 * Focus: Create coherent paragraphs by aggressively merging
 */
function cleanOCRForRAG(text: string): string {
    console.log('🧹 Cleaning OCR text for RAG quality...');

    // Step 1: Remove artifacts and noise
    let cleaned = text
        .replace(/\[Page \d+\]/gi, '')
        .replace(/^Page \d+\/\d+$/gm, '')
        .replace(/^Nn poyates.*$/gm, '')
        .replace(/\f/g, ' ')
        .replace(/\r\n/g, '\n')
        .replace(/\t/g, ' ');

    // Step 2: Get non-empty lines only
    const lines = cleaned.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    // Step 3: Build paragraphs aggressively
    const paragraphs: string[] = [];
    let para = '';

    for (const line of lines) {
        // Only break for MAJOR section headers (very strict)
        const isMajorSection = (
            line === line.toUpperCase() &&
            line.length >= 20 && line.length <= 60 &&
            line.split(/\s+/).length >= 3 &&
            /^[A-Z]/.test(line) &&
            !/^\d/.test(line) &&
            !line.includes('-') && !line.includes('.')
        );

        const isNumberedHeader = /^\d+[\.\-]\s*[A-Z]/.test(line) && line.length < 50;

        if (isMajorSection || isNumberedHeader) {
            if (para.length > 0) { paragraphs.push(para); para = ''; }
            paragraphs.push(line);
            continue;
        }

        // Merge everything else - only break when paragraph is long + complete
        para = para ? para + ' ' + line : line;

        if (para.length >= 500 && /[.!?]$/.test(para)) {
            paragraphs.push(para);
            para = '';
        }
    }
    if (para.length > 0) paragraphs.push(para);

    // Step 4: Final clean
    const result = paragraphs
        .map(p => p.replace(/ {2,}/g, ' ').trim())
        .filter(p => p.length > 0)
        .join('\n\n')
        .trim();

    // Log quality
    const resultParas = result.split('\n\n').length;
    const avgLen = Math.round(result.length / resultParas);

    console.log(`
🧹 ========= OCR CLEANING FOR RAG =========
📊 Original lines: ${text.split('\n').length}
📊 Cleaned paragraphs: ${resultParas}
📊 Avg paragraph length: ${avgLen} chars
📊 Result length: ${result.length} chars
============================================
`);

    return result;
}

export async function POST(request: NextRequest) {
    // Suppress font loading warnings to clean up logs
    const originalConsoleWarn = console.warn;
    console.warn = (...args: any[]) => {
        const message = args.join(' ');
        if (message.includes('Unable to load font') || message.includes('font data')) {
            return; // Suppress font warnings
        }
        originalConsoleWarn.apply(console, args);
    };

    const encoder = new TextEncoder();
    const startTime = Date.now();

    const stream = new ReadableStream({
        async start(controller) {
            // Helper to send SSE progress
            const sendProgress = (update: ProgressUpdate) => {
                const data = `data: ${JSON.stringify(update)}\n\n`;
                controller.enqueue(encoder.encode(data));
            };

            try {
                const cookieStore = await cookies();
                const supabase = createClient(cookieStore);

                // 1. Auth check
                sendProgress({
                    stage: ImportStage.UPLOADING,
                    progress: 5,
                    message: 'Vérification...',
                });

                const { data: { user }, error: authError } = await supabase.auth.getUser();
                if (authError || !user) {
                    sendProgress({
                        stage: ImportStage.ERROR,
                        progress: 0,
                        message: 'Non autorisé',
                    });
                    controller.close();
                    return;
                }

                // 2. Get the uploaded file
                const formData = await request.formData();
                const file = formData.get('file') as File;
                const assetIdParam = formData.get('assetId') as string | null; // For adding to existing equipment
                const documentType = (formData.get('documentType') as string) || 'manual';

                if (!file) {
                    sendProgress({
                        stage: ImportStage.ERROR,
                        progress: 0,
                        message: 'Aucun fichier fourni',
                    });
                    controller.close();
                    return;
                }

                sendProgress({
                    stage: ImportStage.UPLOADING,
                    progress: 10,
                    message: `Fichier reçu: ${file.name}`,
                    currentStep: `${(file.size / 1024).toFixed(0)} KB`,
                });

                console.log(`\n${'='.repeat(50)}`);
                console.log(`📄 Processing: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
                console.log(`${'='.repeat(50)}`);

                // 3. Extract text with progress callback
                sendProgress({
                    stage: ImportStage.LOADING,
                    progress: 15,
                    message: 'Extraction du texte...',
                    currentStep: 'Analyse du PDF...',
                });

                const arrayBuffer = await file.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);

                // Progress callback for OCR
                const onOCRProgress = (currentPage: number, totalPages: number, message: string) => {
                    const ocrProgress = 15 + Math.floor((currentPage / totalPages) * 45);
                    sendProgress({
                        stage: ImportStage.OCR,
                        progress: ocrProgress,
                        message: `OCR en cours...`,
                        currentStep: message,
                        currentPage,
                        totalPages,
                        estimatedTimeRemaining: Math.ceil((totalPages - currentPage) * 3), // ~3s per page with parallel
                    });
                };

                const extraction = await extractPDFText(buffer, onOCRProgress);

                console.log(`📊 Extraction complete: ${extraction.method}, ${extraction.pageCount} pages`);

                // ============================================
                // TEXT QUALITY ANALYSIS
                // ============================================
                const fullText = extraction.text;
                console.log(`
📊 ========= RAW TEXT QUALITY ANALYSIS =========
📝 Total extracted text: ${fullText.length} characters
📝 Total lines: ${fullText.split('\n').length}
📝 Average line length: ${Math.round(fullText.length / fullText.split('\n').length)} chars
📝 Empty lines: ${fullText.split('\n').filter(l => l.trim() === '').length}
📝 Lines with only whitespace: ${fullText.split('\n').filter(l => l.trim() === '' && l.length > 0).length}

📋 First 500 characters:
${'-'.repeat(50)}
${fullText.substring(0, 500)}
${'-'.repeat(50)}

📋 Last 500 characters:
${'-'.repeat(50)}
${fullText.substring(Math.max(0, fullText.length - 500))}
${'-'.repeat(50)}

📊 Character distribution:
- Newlines: ${(fullText.match(/\n/g) || []).length}
- Spaces: ${(fullText.match(/ /g) || []).length}
- Alphanumeric: ${(fullText.match(/[a-zA-Z0-9]/g) || []).length}
- Special chars: ${fullText.length - (fullText.match(/[a-zA-Z0-9\s]/g) || []).length}
================================================
`);

                // Apply aggressive OCR cleaning for RAG quality
                const cleanedText = cleanOCRForRAG(fullText);

                // Use cleaned text for metadata and chunking
                extraction.text = cleanedText;

                sendProgress({
                    stage: ImportStage.METADATA,
                    progress: 65,
                    message: 'Extraction terminée',
                    currentStep: `${extraction.text.length} caractères extraits`,
                });

                if (extraction.text.length < 100) {
                    sendProgress({
                        stage: ImportStage.ERROR,
                        progress: 0,
                        message: 'PDF contient trop peu de texte',
                    });
                    controller.close();
                    return;
                }

                // 4. Extract metadata
                sendProgress({
                    stage: ImportStage.METADATA,
                    progress: 68,
                    message: 'Extraction des métadonnées...',
                    currentStep: 'Analyse IA...',
                });

                const metadata = await extractAssetMetadata(extraction.text);
                console.log('📋 Metadata:', JSON.stringify(metadata, null, 2));

                // 4b. Classify document
                sendProgress({
                    stage: ImportStage.METADATA,
                    progress: 72,
                    message: 'Classification du document...',
                });

                const classification = await classifyDocument(extraction.text);
                console.log(`📄 Document type: ${classification.type}`);

                // 5. Create or use existing Asset
                let assetId: string;

                if (assetIdParam) {
                    // Adding document to existing equipment
                    assetId = assetIdParam;
                    console.log(`📦 Using existing asset: ${assetId}`);

                    sendProgress({
                        stage: ImportStage.STORING,
                        progress: 75,
                        message: 'Ajout du document à l\'équipement...',
                    });
                } else {
                    // Creating new equipment (original flow)
                    sendProgress({
                        stage: ImportStage.STORING,
                        progress: 75,
                        message: 'Création de l\'équipement...',
                    });

                    assetId = uuidv4();
                    const { error: assetError } = await supabase
                        .from('assets')
                        .insert({
                            id: assetId,
                            name: metadata.name,
                            code: `${metadata.model || 'ASSET'}-${Date.now()}`,
                            location: 'À définir',
                            manufacturer: metadata.manufacturer,
                            model_number: metadata.model,
                            serial_number: metadata.serial_number,
                            category: metadata.category,
                            status: 'operational',
                            created_by: user.id,
                        });

                    if (assetError) {
                        console.error('Asset creation error:', assetError);
                        sendProgress({
                            stage: ImportStage.ERROR,
                            progress: 0,
                            message: 'Erreur création équipement',
                        });
                        controller.close();
                        return;
                    }
                }

                // 6. Create document record
                const documentId = uuidv4();
                const { error: docError } = await supabase
                    .from('asset_documents')
                    .insert({
                        id: documentId,
                        asset_id: assetId,
                        file_name: file.name,
                        file_size: file.size,
                        processing_status: 'processing',
                        document_type: documentType || classification.type, // User selection or AI classification
                        document_type_confidence: documentType ? 1.0 : classification.confidence,
                        user_confirmed: !!documentType, // True if user selected type
                    });

                if (docError) {
                    console.error('❌ Document record error:', docError);
                } else {
                    console.log('📄 ✅ Document record created successfully:', {
                        id: documentId,
                        asset_id: assetId,
                        file_name: file.name,
                        document_type: documentType || classification.type,
                        user_confirmed: !!documentType
                    });
                }

                // ============================================
                // 7. SIMPLE DIRECT CHUNKING (Fixed)
                // ============================================
                console.log('\n📦 ========= CHUNKING WITH LANGCHAIN =========');

                sendProgress({
                    stage: ImportStage.CHUNKING,
                    progress: 78,
                    message: 'Découpage en sections...',
                });

                // Clean text first (remove excessive whitespace)
                const cleanedForChunking = extraction.text
                    .replace(/\n{3,}/g, '\n\n')  // Max 2 newlines
                    .replace(/[ \t]+/g, ' ')     // Normalize spaces
                    .replace(/\[Page \d+\]/gi, '')  // Remove page markers
                    .trim();

                console.log(`📝 Text to chunk: ${cleanedForChunking.length} chars`);

                // Use LangChain's splitter directly - simple and effective
                const CHUNK_SIZE = 1500;
                const CHUNK_OVERLAP = 200;

                const splitter = new RecursiveCharacterTextSplitter({
                    chunkSize: CHUNK_SIZE,
                    chunkOverlap: CHUNK_OVERLAP,
                    separators: ['\n\n', '\n', '. ', ' ', ''],
                });

                const langchainDocs = await splitter.createDocuments([cleanedForChunking]);

                console.log(`✅ LangChain created ${langchainDocs.length} chunks`);

                // Convert to our format
                const chunks = langchainDocs.map((doc, index) => ({
                    content: doc.pageContent,
                    metadata: {
                        chunk_index: index,
                        char_start: index * CHUNK_SIZE,
                        char_end: (index + 1) * CHUNK_SIZE,
                    }
                }));

                // Log chunk statistics
                if (chunks.length > 0) {
                    const chunkLengths = chunks.map(c => c.content.length);
                    const avgSize = Math.round(chunkLengths.reduce((a, b) => a + b, 0) / chunks.length);
                    const minSize = Math.min(...chunkLengths);
                    const maxSize = Math.max(...chunkLengths);

                    console.log(`
📊 CHUNK STATISTICS:
   Total: ${chunks.length} chunks
   Average: ${avgSize} chars
   Range: ${minSize} - ${maxSize} chars
   Expected batches: ${Math.ceil(chunks.length / 40)}
================================================
`);
                }

                sendProgress({
                    stage: ImportStage.CHUNKING,
                    progress: 80,
                    message: `${chunks.length} sections créées`,
                    totalChunks: chunks.length,
                });

                // 8. Generate embeddings - OPTIMIZED: larger batches
                console.log('\n🧠 Generating embeddings...');
                const chunkTexts = chunks.map(c => c.content);
                const BATCH_SIZE = 40; // Was 20
                const allEmbeddings: number[][] = [];
                const embeddingStartTime = Date.now();

                for (let i = 0; i < chunkTexts.length; i += BATCH_SIZE) {
                    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
                    const totalBatches = Math.ceil(chunkTexts.length / BATCH_SIZE);

                    const batch = chunkTexts.slice(i, i + BATCH_SIZE);
                    const embeddings = await generateEmbeddings(batch);
                    allEmbeddings.push(...embeddings);

                    const embeddingProgress = 80 + Math.floor((batchNum / totalBatches) * 12);
                    const elapsed = (Date.now() - embeddingStartTime) / 1000;
                    const chunksPerSecond = allEmbeddings.length / elapsed;
                    const remainingChunks = chunkTexts.length - allEmbeddings.length;
                    const eta = chunksPerSecond > 0 ? Math.ceil(remainingChunks / chunksPerSecond) : 0;

                    sendProgress({
                        stage: ImportStage.EMBEDDING,
                        progress: embeddingProgress,
                        message: `Vectorisation batch ${batchNum}/${totalBatches}`,
                        currentChunk: allEmbeddings.length,
                        totalChunks: chunkTexts.length,
                        estimatedTimeRemaining: eta,
                    });

                    console.log(`   ✓ Batch ${batchNum}/${totalBatches} (${allEmbeddings.length}/${chunkTexts.length})`);
                }

                // 9. Save to vector store
                sendProgress({
                    stage: ImportStage.STORING,
                    progress: 93,
                    message: 'Sauvegarde...',
                    currentStep: 'Enregistrement dans la base...',
                });

                const chunkRecords = chunks.map((chunk, index) => ({
                    asset_id: assetId,
                    document_id: documentId, // NEW: Link to specific document
                    content: chunk.content,
                    metadata: {
                        chunk_index: chunk.metadata.chunk_index,
                        page_number: estimatePageNumber(chunk.metadata.char_start),
                        source_file: file.name,
                        extraction_method: extraction.method,
                        document_type: documentType || classification.type,
                    },
                    embedding: `[${allEmbeddings[index].join(',')}]`,
                    chunk_index: chunk.metadata.chunk_index,
                    page_number: estimatePageNumber(chunk.metadata.char_start),
                }));

                const insertBatchSize = 20;
                for (let i = 0; i < chunkRecords.length; i += insertBatchSize) {
                    const batch = chunkRecords.slice(i, i + insertBatchSize);
                    const { error: chunkError } = await supabase
                        .from('document_chunks')
                        .insert(batch);

                    if (chunkError) {
                        console.error(`Chunk insertion error (batch ${i}):`, chunkError);
                    }

                    const storeProgress = 93 + Math.floor(((i + insertBatchSize) / chunkRecords.length) * 5);
                    sendProgress({
                        stage: ImportStage.STORING,
                        progress: Math.min(storeProgress, 98),
                        message: `Sauvegarde ${Math.min(i + insertBatchSize, chunkRecords.length)}/${chunkRecords.length}`,
                    });
                }

                // 🆕 10. AI Classification of Document Types
                console.log('\n🏷️ Classifying document types...');
                sendProgress({
                    stage: ImportStage.STORING,
                    progress: 95,
                    message: 'Classification IA des types...',
                });

                // Import classification function
                const { classifyDocumentTypes } = await import('@/lib/ai/classify-document-types');

                // Classify using already extracted data
                const detectedTypes = await classifyDocumentTypes({
                    text: extraction.text,
                    chunks: chunks,
                    metadata: {
                        name: metadata.name || undefined,
                        manufacturer: metadata.manufacturer || undefined,
                        model: metadata.model || undefined,
                        category: metadata.category || undefined,
                    }
                });

                console.log('🏷️ Detected types:', detectedTypes);

                // Update document record with detected types
                const { error: updateError } = await supabase
                    .from('asset_documents')
                    .update({
                        document_types: detectedTypes,
                        ai_classified: true,
                        classification_confidence: 0.85,
                        processing_status: 'completed',
                        total_chunks: chunks.length,
                        processed_at: new Date().toISOString(),
                    })
                    .eq('id', documentId);

                if (updateError) {
                    console.error('❌ Classification update error:', updateError);
                    // Continue even if classification fails - document is still usable
                } else {
                    console.log('✅ Document types saved:', detectedTypes);
                }

                const totalTime = Date.now() - startTime;

                console.log(`\n${'='.repeat(50)}`);
                console.log(`✅ COMPLETED in ${(totalTime / 1000).toFixed(1)}s`);
                console.log(`${'='.repeat(50)}\n`);

                // Send completion with detected types
                sendProgress({
                    stage: ImportStage.COMPLETE,
                    progress: 100,
                    message: `Import réussi en ${(totalTime / 1000).toFixed(0)}s`,
                    totalChunks: chunks.length,
                    result: {
                        success: true,
                        asset_id: assetId,
                        document_id: documentId, // 🆕 Required for type confirmation
                        asset: {
                            name: metadata.name,
                            manufacturer: metadata.manufacturer,
                            model: metadata.model,
                            category: metadata.category,
                        },
                        classification: {
                            type: classification.type,
                            confidence: classification.confidence,
                        },
                        document_types: detectedTypes, // 🆕 AI-detected types for frontend
                        extraction: {
                            method: extraction.method,
                            pages: extraction.pageCount,
                            confidence: extraction.confidence,
                        },
                        chunks_created: chunks.length,
                        processing_time_ms: totalTime,
                    },
                });

                controller.close();

            } catch (error) {
                console.error('Ingestion error:', error);
                sendProgress({
                    stage: ImportStage.ERROR,
                    progress: 0,
                    message: error instanceof Error ? error.message : 'Erreur interne',
                });
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
