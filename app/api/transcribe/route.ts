import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!
});

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!
});

function calculateLanguageScore(text: string, language: string): number {
    let score = 0;
    score += Math.min(text.length / 10, 50);

    if (language === 'ar') {
        const arabicChars = text.match(/[\u0600-\u06FF]/g);
        if (arabicChars) score += arabicChars.length * 2;
        const arabicWords = ['في', 'من', 'على', 'هو', 'هي', 'ما', 'شنو', 'اللي', 'عند'];
        arabicWords.forEach(w => { if (text.includes(w)) score += 10; });
    }

    if (language === 'fr') {
        const frenchWords = ['le', 'la', 'les', 'de', 'un', 'une', 'des', 'est', 'sont', 'compresseur'];
        frenchWords.forEach(w => {
            const re = new RegExp(`\\b${w}\\b`, 'gi');
            const m = text.match(re);
            if (m) score += m.length * 5;
        });
        const nonAscii = text.match(/[^\x00-\x7F]/g);
        if (!nonAscii || nonAscii.length < text.length * 0.3) score += 20;
    }

    if (language === 'en') {
        const englishWords = ['the', 'is', 'are', 'what', 'where', 'how', 'compressor', 'machine'];
        englishWords.forEach(w => {
            const re = new RegExp(`\\b${w}\\b`, 'gi');
            const m = text.match(re);
            if (m) score += m.length * 5;
        });
    }

    return score;
}

function detectDarija(text: string): boolean {
    const darijaKeywords = [
        'شنو', 'كيفاش', 'فين', 'واش', 'اللي', 'ديال', 'غادي', 'بغيت',
        'كاين', 'عندنا', 'عندي', 'عندك', 'دابا', 'دغيا', 'بزاف',
        'chno', 'chnou', 'kifach', 'fin', 'wach', 'wash', 'lli', 'li',
        'dial', 'dyal', 'ghadi', 'bghit', 'kayn', '3and', 'daba', 'bzaf'
    ];

    const lower = text.toLowerCase();
    if (darijaKeywords.some(k => lower.includes(k))) return true;

    const hasArabic = /[\u0600-\u06FF]/.test(text);
    const hasLatin = /[a-zA-Z]/.test(text);
    if (hasArabic && hasLatin) return true;

    const hasTranslit = /[0-9]/.test(text) && /[a-zA-Z]/.test(text);
    return hasTranslit;
}

async function enhanceDarijaTranscription(
    primaryText: string,
    allTranscriptions: Array<{ language: string; text: string }>
): Promise<string | null> {
    try {
        const prompt = `You are a Darija (Moroccan Arabic) transcription expert.

I have multiple transcriptions of the same audio in different languages. The speaker was speaking in Darija (Moroccan dialectal Arabic), which is a mix of Arabic, French, and some Berber words.

Transcriptions:
${allTranscriptions.map(t => `- ${t.language.toUpperCase()}: "${t.text}"`).join('\n')}

Your task:
1. Combine the best parts of each transcription
2. Preserve the original Darija meaning
3. Use Arabic script for Arabic words
4. Use Latin script for French/English technical terms
5. Output natural Darija text that a Moroccan would write

Example:
Input (AR): "شنو هما لي كومبريسور اللي عندنا"
Input (FR): "chnou homa li compresseur li 3andna"
Output: "شنو هوما الكومبريسور اللي عندنا؟"

Return ONLY the enhanced transcription, nothing else.`;

        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 500,
            messages: [{ role: 'user', content: prompt }]
        });

        const textBlock = response.content.find(b => b.type === 'text');
        if (textBlock && 'text' in textBlock) {
            return textBlock.text.trim();
        }

        return null;
    } catch (e) {
        console.error('[Darija Enhancement Error]', e);
        return null;
    }
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const audio = formData.get('audio') as File;
        const languageHint = (formData.get('language') as string) || 'auto';

        if (!audio) {
            return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
        }

        if (audio.size > 25 * 1024 * 1024) {
            return NextResponse.json({ error: 'File too large. Max size is 25MB' }, { status: 400 });
        }

        console.log(`[Transcription] Processing ${audio.name} (${audio.size} bytes), language hint: ${languageHint}`);

        const languages = languageHint === 'auto' ? ['ar', 'fr', 'en'] : [languageHint];
        const startTime = Date.now();

        const transcriptionPromises = languages.map(async (lang) => {
            try {
                const result = await openai.audio.transcriptions.create({
                    file: audio,
                    model: 'whisper-1',
                    language: lang,
                    response_format: 'verbose_json',
                    temperature: 0.0
                });

                return {
                    language: lang,
                    text: (result as any).text,
                    duration: (result as any).duration,
                    segments: (result as any).segments || []
                };
            } catch (e) {
                console.error(`Transcription failed for ${lang}:`, e);
                return null;
            }
        });

        const rawResults = await Promise.all(transcriptionPromises);
        const validResults = rawResults.filter(r => r !== null) as Array<{
            language: string;
            text: string;
            duration: number;
            segments: any[];
        }>;

        if (validResults.length === 0) {
            throw new Error('All transcription attempts failed');
        }

        const scored = validResults.map(r => ({
            language: r.language,
            text: r.text,
            duration: r.duration,
            score: calculateLanguageScore(r.text, r.language)
        }));

        scored.sort((a, b) => b.score - a.score);
        const best = scored[0];

        console.log('[Language Detection] Scores:', scored.map(s => ({
            lang: s.language,
            score: s.score.toFixed(2),
            preview: s.text.slice(0, 50)
        })));

        const isDarija = detectDarija(best.text);
        let finalText = best.text;
        let detectedLanguage = best.language;

        if (isDarija) {
            console.log('[Darija Detected] Enhancing transcription...');
            const enhanced = await enhanceDarijaTranscription(
                best.text,
                scored.map(s => ({ language: s.language, text: s.text }))
            );

            if (enhanced) {
                finalText = enhanced;
                detectedLanguage = 'ar-MA';
            }
        }

        const durationMs = Date.now() - startTime;

        return NextResponse.json({
            success: true,
            text: finalText,
            detectedLanguage,
            isDarija,
            confidence: best.score,
            alternatives: scored.slice(1).map(s => ({
                language: s.language,
                text: s.text,
                score: s.score
            })),
            duration: best.duration,
            metadata: {
                originalLanguageHint: languageHint,
                languagesAttempted: languages,
                processingTimeMs: durationMs
            }
        });
    } catch (error: any) {
        console.error('[Transcription Error]', error);

        if (error.status === 401) {
            return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
        }

        if (error.status === 429) {
            return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
        }

        return NextResponse.json({
            error: 'Transcription failed',
            details: error.message
        }, { status: 500 });
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
