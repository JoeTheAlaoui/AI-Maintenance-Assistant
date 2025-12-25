import Anthropic from '@anthropic-ai/sdk';

interface ClassificationInput {
    text: string;
    chunks: any[];
    metadata: {
        name?: string;
        manufacturer?: string;
        model?: string;
        category?: string;
    };
}

const DOCUMENT_TYPES = [
    'manual',
    'installation',
    'maintenance',
    'troubleshooting',
    'parts',
    'electrical',
    'mechanical',
    'safety'
];

/**
 * Classify document content types using AI
 * Analyzes extracted text and metadata to determine what types of content the document contains
 * 
 * @param input - Object containing text, chunks, and metadata
 * @returns Array of document type strings (e.g., ['maintenance', 'parts'])
 */
export async function classifyDocumentTypes(
    input: ClassificationInput
): Promise<string[]> {
    const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
    });

    // Use first 3000 chars for classification (enough context, saves tokens)
    const textSample = input.text.substring(0, 3000);

    const prompt = `You are analyzing an equipment manual to classify its content types.

Equipment Information:
- Name: ${input.metadata.name || 'Unknown'}
- Manufacturer: ${input.metadata.manufacturer || 'Unknown'}
- Category: ${input.metadata.category || 'Unknown'}

Document Text Sample (first 3000 chars):
${textSample}

Available document types:
${DOCUMENT_TYPES.map(t => `- ${t}`).join('\n')}

Task: Determine which types of content this document contains.

Rules:
1. Select ALL applicable types (a document can have multiple)
2. Base your decision on actual content, not assumptions
3. If document covers installation procedures → include 'installation'
4. If document covers maintenance procedures → include 'maintenance'  
5. If document has troubleshooting guides → include 'troubleshooting'
6. If document lists spare parts → include 'parts'
7. If document has electrical diagrams → include 'electrical'
8. If document has mechanical drawings → include 'mechanical'
9. If document has safety procedures → include 'safety'
10. If you're unsure, include 'manual' as fallback

Respond with ONLY a JSON array of type strings, nothing else.
Example: ["maintenance", "parts", "troubleshooting"]
`;

    try {
        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 200,
            messages: [{
                role: 'user',
                content: prompt
            }]
        });

        const content = response.content[0].type === 'text'
            ? response.content[0].text
            : '["manual"]';

        // Parse AI response
        const types = JSON.parse(content.trim());

        // Validate types
        const validTypes = types.filter((t: string) =>
            DOCUMENT_TYPES.includes(t)
        );

        // Ensure at least one type
        return validTypes.length > 0 ? validTypes : ['manual'];

    } catch (error) {
        console.error('❌ Classification error:', error);
        // Fallback to 'manual' if AI fails
        return ['manual'];
    }
}
