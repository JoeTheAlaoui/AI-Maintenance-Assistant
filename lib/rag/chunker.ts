// lib/rag/chunker.ts

export interface TextChunk {
    content: string;
    metadata: {
        chunk_index: number;
        page_number?: number;
        char_start: number;
        char_end: number;
    };
}

/**
 * Split text into overlapping chunks (memory-efficient)
 * @param text - Full document text
 * @param chunkSize - Target chunk size in characters (default: 1500)
 * @param overlap - Overlap between chunks (default: 150)
 */
export function splitTextIntoChunks(
    text: string,
    chunkSize: number = 1500,
    overlap: number = 150
): TextChunk[] {
    const chunks: TextChunk[] = [];

    // Don't process empty text
    if (!text || text.length === 0) {
        return chunks;
    }

    // Limit text size to prevent memory issues (max 500KB)
    const maxLength = 500000;
    const cleanText = text
        .slice(0, maxLength)
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    if (cleanText.length <= chunkSize) {
        return [{
            content: cleanText,
            metadata: {
                chunk_index: 0,
                char_start: 0,
                char_end: cleanText.length,
            }
        }];
    }

    let startIndex = 0;
    let chunkIndex = 0;
    const maxChunks = 500; // Increased safety limit

    while (startIndex < cleanText.length && chunkIndex < maxChunks) {
        let endIndex = Math.min(startIndex + chunkSize, cleanText.length);

        // Try to break at natural boundaries (sentence end, paragraph)
        if (endIndex < cleanText.length) {
            const searchRange = cleanText.slice(startIndex, endIndex);
            const lastParagraph = searchRange.lastIndexOf('\n\n');
            const lastSentence = searchRange.lastIndexOf('. ');
            const lastNewline = searchRange.lastIndexOf('\n');

            // Prefer breaking at paragraph, then sentence, then newline
            const breakPoint = lastParagraph > chunkSize * 0.5 ? lastParagraph
                : lastSentence > chunkSize * 0.5 ? lastSentence + 1
                    : lastNewline > chunkSize * 0.5 ? lastNewline
                        : -1;

            if (breakPoint > 0) {
                endIndex = startIndex + breakPoint + 1;
            }
        }

        const chunkContent = cleanText.slice(startIndex, endIndex).trim();

        if (chunkContent.length > 50) {
            chunks.push({
                content: chunkContent,
                metadata: {
                    chunk_index: chunkIndex,
                    char_start: startIndex,
                    char_end: endIndex,
                }
            });
            chunkIndex++;
        }

        startIndex = endIndex - overlap;
        if (startIndex >= cleanText.length - 50) break;
    }

    return chunks;
}

/**
 * Estimate page number based on character position
 * Assumes ~3000 characters per page (rough estimate)
 */
export function estimatePageNumber(charPosition: number, charsPerPage: number = 3000): number {
    return Math.floor(charPosition / charsPerPage) + 1;
}
