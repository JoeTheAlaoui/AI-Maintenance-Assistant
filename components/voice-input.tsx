import { useState, useRef } from 'react';
import { Mic, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface TranscriptMetadata {
    detectedLanguage: string;
    isDarija: boolean;
    confidence: number;
    alternatives?: Array<{ language: string; text: string; score: number }>;
}

interface VoiceInputProps {
    onTranscript: (text: string, metadata?: TranscriptMetadata) => void;
    autoDetectLanguage?: boolean;
    preferredLanguage?: 'ar' | 'fr' | 'en' | 'auto';
    className?: string;
}

export function VoiceInput({
    onTranscript,
    autoDetectLanguage = true,
    preferredLanguage = 'auto',
    className
}: VoiceInputProps) {
    const [recording, setRecording] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [languageDetected, setLanguageDetected] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const startRecording = async () => {
        if (!navigator.mediaDevices?.getUserMedia) {
            setError('Microphone not supported');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 16000
                }
            });

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = handleStop;
            mediaRecorder.start();
            setRecording(true);
            setError(null);
        } catch (err: any) {
            console.error('Error accessing mic', err);
            setError('Failed to access microphone');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && recording) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            setRecording(false);
        }
    };

    const handleStop = async () => {
        setProcessing(true);

        try {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');
            formData.append('language', autoDetectLanguage ? 'auto' : (preferredLanguage || 'fr'));

            const response = await fetch('/api/transcribe', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Transcription failed');
            }

            const data = await response.json();

            console.log('[Voice Input] Transcription result:', {
                text: data.text,
                language: data.detectedLanguage,
                isDarija: data.isDarija,
                confidence: data.confidence
            });

            // Show language indicator
            if (data.isDarija) {
                setLanguageDetected('Darija 🇲🇦');
            } else if (data.detectedLanguage === 'ar' || data.detectedLanguage === 'ar-MA') {
                setLanguageDetected('العربية');
            } else if (data.detectedLanguage === 'fr') {
                setLanguageDetected('Français');
            } else if (data.detectedLanguage === 'en') {
                setLanguageDetected('English');
            }

            setTimeout(() => setLanguageDetected(null), 3000);

            // Success!
            setSuccess(true);

            // Pass text + metadata to parent
            onTranscript(data.text, {
                detectedLanguage: data.detectedLanguage,
                isDarija: data.isDarija,
                confidence: data.confidence,
                alternatives: data.alternatives
            });

            setTimeout(() => setSuccess(false), 2000);

        } catch (err: any) {
            console.error('Transcription error:', err);
            setError('Failed to transcribe. Please try again.');
            setTimeout(() => setError(null), 3000);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className={`flex items-center gap-2 ${className || ''}`}>
            <Button
                variant="outline"
                size="icon"
                className={`rounded-xl border-2 h-12 w-12 flex-shrink-0 transition-colors ${recording ? 'bg-red-100 border-red-500 animate-pulse' : ''
                    } ${success ? 'bg-green-100 border-green-500' : ''} ${error ? 'bg-red-100 border-red-500' : ''
                    }`}
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                disabled={processing}
                title={recording ? 'Release to stop' : 'Hold to record'}
            >
                {processing ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                    <Mic className={`h-5 w-5 ${recording ? 'text-red-600' : ''}`} />
                )}
            </Button>

            {languageDetected && (
                <Badge variant="secondary" className="text-xs animate-fade-in">
                    {languageDetected}
                </Badge>
            )}

            {error && (
                <span className="text-xs text-red-600 animate-fade-in">{error}</span>
            )}
        </div>
    );
}
