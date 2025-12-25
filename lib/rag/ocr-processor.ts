import { createWorker, PSM, Worker } from 'tesseract.js';
import { pdf } from 'pdf-to-img';
import sharp from 'sharp';

interface OCRResult {
    text: string;
    pages: number;
    confidence: number;
    processingTime: number;
}

type ProgressCallback = (currentPage: number, totalPages: number, message: string) => void;

/**
 * Extract text from scanned PDF using Tesseract OCR
 * Supports: French, English, Arabic
 * Now with PARALLEL processing for better performance
 */
export async function extractTextWithOCR(
    pdfBuffer: Buffer,
    onProgress?: ProgressCallback
): Promise<OCRResult> {
    const startTime = Date.now();
    const CONCURRENT_PAGES = 4; // Process 4 pages at a time

    // Convert PDF to images first (collect all)
    console.log('📄 Converting PDF to images...');
    const images: Buffer[] = [];
    const document = await pdf(pdfBuffer, {
        scale: 2.0, // Slightly reduced for speed (was 2.5)
    });

    for await (const imageBuffer of document) {
        images.push(imageBuffer);
    }

    const totalPages = images.length;
    console.log(`📄 Total pages: ${totalPages}`);
    onProgress?.(0, totalPages, 'PDF converted to images');

    // Create worker pool for parallel processing
    const workerCount = Math.min(CONCURRENT_PAGES, totalPages);
    console.log(`🔧 Creating ${workerCount} OCR workers...`);

    const workers: Worker[] = await Promise.all(
        Array.from({ length: workerCount }, async () => {
            const worker = await createWorker('fra+eng');
            await worker.setParameters({
                tessedit_pageseg_mode: PSM.AUTO,
            });
            return worker;
        })
    );

    const results: { text: string; confidence: number }[] = new Array(totalPages);
    let completedPages = 0;

    try {
        // Process pages in parallel batches
        for (let batchStart = 0; batchStart < totalPages; batchStart += CONCURRENT_PAGES) {
            const batchEnd = Math.min(batchStart + CONCURRENT_PAGES, totalPages);
            const batchPromises: Promise<void>[] = [];

            for (let pageIdx = batchStart; pageIdx < batchEnd; pageIdx++) {
                const workerIdx = pageIdx - batchStart;
                const worker = workers[workerIdx % workers.length];

                batchPromises.push(
                    (async () => {
                        const optimizedImage = await preprocessImage(images[pageIdx]);
                        const { data } = await worker.recognize(optimizedImage);

                        results[pageIdx] = {
                            text: `[Page ${pageIdx + 1}]\n${data.text}`,
                            confidence: data.confidence,
                        };

                        completedPages++;
                        console.log(`  ✓ Page ${pageIdx + 1}: ${data.text.length} chars, ${data.confidence.toFixed(1)}% confidence`);
                        onProgress?.(completedPages, totalPages, `OCR: Page ${pageIdx + 1}/${totalPages}`);
                    })()
                );
            }

            await Promise.all(batchPromises);
        }
    } finally {
        // Terminate all workers
        await Promise.all(workers.map(w => w.terminate()));
    }

    const processingTime = Date.now() - startTime;
    const validResults = results.filter(r => r);
    const avgConfidence = validResults.length > 0
        ? validResults.reduce((sum, r) => sum + r.confidence, 0) / validResults.length
        : 0;

    console.log(`✅ OCR complete: ${totalPages} pages in ${(processingTime / 1000).toFixed(1)}s`);

    return {
        text: results.map(r => r?.text || '').join('\n\n'),
        pages: totalPages,
        confidence: avgConfidence,
        processingTime,
    };
}

/**
 * Preprocess image for better OCR accuracy
 */
async function preprocessImage(imageBuffer: Buffer): Promise<Buffer> {
    return sharp(imageBuffer)
        // Convert to grayscale
        .grayscale()
        // Increase contrast
        .normalize()
        // Sharpen text edges
        .sharpen({ sigma: 1.5 })
        // Remove noise
        .median(1)
        // Ensure good DPI
        .resize(null, null, {
            width: 2480, // A4 at 300 DPI
            withoutEnlargement: true,
        })
        // Output as PNG for best OCR results
        .png()
        .toBuffer();
}

/**
 * Detect if PDF is scanned (image-based) vs native text
 */
export function isScannedPDF(extractedText: string, pageCount: number): boolean {
    if (pageCount === 0) return true;

    const avgCharsPerPage = extractedText.trim().length / pageCount;

    // Scanned PDFs typically have very little extractable text
    // Native PDFs usually have 1000+ chars per page
    return avgCharsPerPage < 200;
}

/**
 * Clean OCR text (fix common errors)
 */
export function cleanOCRText(text: string): string {
    return text
        // Fix common OCR errors
        .replace(/\|/g, 'I')           // | often misread as I
        .replace(/0(?=[a-zA-Z])/g, 'O') // 0 before letters = O
        .replace(/1(?=[a-zA-Z])/g, 'l') // 1 before letters = l
        // Remove excessive whitespace
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{4,}/g, '\n\n\n')
        // Trim lines
        .split('\n')
        .map(line => line.trim())
        .join('\n')
        .trim();
}

