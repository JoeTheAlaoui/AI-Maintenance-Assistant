import * as pdfParse from 'pdf-parse';
import { extractTextWithOCR, isScannedPDF, cleanOCRText } from './ocr-processor';

interface ExtractionResult {
    text: string;
    pageCount: number;
    method: 'native' | 'ocr';
    confidence?: number;
    processingTime: number;
}

type ProgressCallback = (currentPage: number, totalPages: number, message: string) => void;

/**
 * Smart PDF text extraction
 * Automatically detects scanned PDFs and uses OCR when needed
 */
export async function extractPDFText(
    buffer: Buffer,
    onProgress?: ProgressCallback
): Promise<ExtractionResult> {
    const startTime = Date.now();

    try {
        // First, try native text extraction
        console.log('📝 Attempting native text extraction...');
        const pdfData = await (pdfParse as any).default(buffer);

        // Detailed analysis of extracted text
        const textLength = pdfData.text?.trim().length || 0;
        const pageCount = pdfData.numpages || 1;
        const avgCharsPerPage = textLength / pageCount;
        const sampleText = pdfData.text?.substring(0, 200).trim() || '';

        console.log(`📝 Native extraction analysis:`);
        console.log(`   - Text length: ${textLength} chars`);
        console.log(`   - Pages: ${pageCount}`);
        console.log(`   - Avg chars/page: ${avgCharsPerPage.toFixed(0)}`);
        console.log(`   - Sample: "${sampleText.substring(0, 80)}${sampleText.length > 80 ? '...' : ''}"`);

        // Check if it's a scanned PDF (lowered threshold from 200 to 100)
        const hasExtractableText = avgCharsPerPage >= 100;

        if (!hasExtractableText) {
            console.log('📸 Scanned PDF detected (low text density)! Switching to OCR...');

            const ocrResult = await extractTextWithOCR(buffer, onProgress);

            return {
                text: cleanOCRText(ocrResult.text),
                pageCount: ocrResult.pages,
                method: 'ocr',
                confidence: ocrResult.confidence,
                processingTime: Date.now() - startTime,
            };
        }

        // Native extraction successful
        console.log(`✅ Native text extraction successful (${textLength} chars)`);
        return {
            text: pdfData.text,
            pageCount: pdfData.numpages,
            method: 'native',
            processingTime: Date.now() - startTime,
        };

    } catch (error: any) {
        console.log(`⚠️ Native extraction failed: ${error.message}`);
        console.log('📸 Falling back to OCR...');

        // Fallback to OCR
        const ocrResult = await extractTextWithOCR(buffer, onProgress);

        return {
            text: cleanOCRText(ocrResult.text),
            pageCount: ocrResult.pages,
            method: 'ocr',
            confidence: ocrResult.confidence,
            processingTime: Date.now() - startTime,
        };
    }
}


