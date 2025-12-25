// components/chat/rag-chat.tsx

'use client';

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface AnalysisMetadata {
    intent: string;
    urgency: string;
    response_format: string;
}

interface SearchMetadata {
    sources_used: number;
    source_types: string[];
    avg_relevance: number;
    context_quality: string;
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    analysis?: AnalysisMetadata;
    search?: SearchMetadata;
}

interface RAGChatProps {
    assetId: string;
    assetName: string;
}

export interface RAGChatRef {
    sendMessage: (message: string) => void;
}

export const RAGChat = forwardRef<RAGChatRef, RAGChatProps>(({ assetId, assetName }, ref) => {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: `Bonjour! Je suis votre assistant technique pour **${assetName}**. Je peux répondre à vos questions sur la maintenance, le dépannage, les spécifications techniques, et plus encore. Comment puis-je vous aider?`,
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const sendMessageInternal = async (messageContent: string) => {
        if (!messageContent.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: messageContent.trim(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        // Add placeholder for assistant response
        const assistantId = (Date.now() + 1).toString();
        setMessages(prev => [...prev, {
            id: assistantId,
            role: 'assistant',
            content: '',
        }]);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage.content,
                    asset_id: assetId,
                    conversation_history: messages
                        .filter(m => m.id !== 'welcome')
                        .map(m => ({ role: m.role, content: m.content })),
                }),
            });

            if (!response.ok) {
                throw new Error('Chat request failed');
            }

            // Handle streaming response
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let fullContent = '';
            let chunksUsed = 0;

            while (reader) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.content) {
                                fullContent += data.content;
                                setMessages(prev => prev.map(m =>
                                    m.id === assistantId
                                        ? { ...m, content: fullContent }
                                        : m
                                ));
                            }
                            if (data.done) {
                                // Update with new metadata format
                                setMessages(prev => prev.map(m =>
                                    m.id === assistantId
                                        ? {
                                            ...m,
                                            content: fullContent,
                                            analysis: data.analysis,
                                            search: data.search,
                                        }
                                        : m
                                ));
                            }
                        } catch (e) {
                            // Skip invalid JSON
                        }
                    }
                }
            }

            // Final message was already updated when 'done' received
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => prev.map(m =>
                m.id === assistantId
                    ? { ...m, content: 'Désolé, une erreur est survenue. Veuillez réessayer.' }
                    : m
            ));
        } finally {
            setIsLoading(false);
        }
    };

    // Expose sendMessage via ref for suggested questions
    useImperativeHandle(ref, () => ({
        sendMessage: (message: string) => sendMessageInternal(message)
    }));

    const sendMessage = () => {
        if (input.trim()) {
            sendMessageInternal(input);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="flex flex-col h-full min-h-0 bg-white">
            {/* Messages - scrollable area */}
            <div className="flex-1 overflow-y-auto p-4 min-h-0" ref={scrollRef}>
                <div className="space-y-4">
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={cn(
                                "flex gap-3",
                                message.role === 'user' ? 'justify-end' : 'justify-start'
                            )}
                        >
                            {message.role === 'assistant' && (
                                <Avatar className="w-8 h-8 border flex-shrink-0">
                                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600">
                                        <Bot className="w-4 h-4 text-white" />
                                    </AvatarFallback>
                                </Avatar>
                            )}

                            <div
                                className={cn(
                                    "max-w-[80%] rounded-2xl px-4 py-3",
                                    message.role === 'user'
                                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                                        : 'bg-gray-100 text-gray-900'
                                )}
                            >
                                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                                    {message.content || (
                                        <span className="flex items-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Recherche dans le manuel...
                                        </span>
                                    )}
                                </p>

                                {/* Analysis metadata - new smart routing info */}
                                {message.analysis && message.search && (
                                    <div className="flex flex-wrap items-center gap-1.5 mt-2 text-xs">
                                        {/* Intent badge */}
                                        <span className={cn(
                                            "px-2 py-0.5 rounded-full font-medium",
                                            message.analysis.urgency === 'emergency'
                                                ? 'bg-red-100 text-red-700'
                                                : message.analysis.intent === 'troubleshooting'
                                                    ? 'bg-orange-100 text-orange-700'
                                                    : message.analysis.intent === 'maintenance'
                                                        ? 'bg-blue-100 text-blue-700'
                                                        : 'bg-gray-200 text-gray-600'
                                        )}>
                                            {message.analysis.intent === 'troubleshooting' ? '🔧 Diagnostic' :
                                                message.analysis.intent === 'maintenance' ? '🛠️ Maintenance' :
                                                    message.analysis.intent === 'parts' ? '📦 Pièces' :
                                                        message.analysis.intent === 'procedure' ? '📋 Procédure' :
                                                            message.analysis.intent === 'specs' ? '📊 Specs' :
                                                                '💬 Info'}
                                        </span>

                                        {/* Source count */}
                                        <span className="text-gray-500">
                                            • {message.search.sources_used} sources
                                        </span>

                                        {/* Source types */}
                                        {message.search.source_types.includes('schematic') && (
                                            <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                                                📐 Schéma
                                            </span>
                                        )}
                                        {message.search.source_types.includes('dependency') && (
                                            <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                                                🔗 Dépendances
                                            </span>
                                        )}

                                        {/* Relevance quality */}
                                        <span className={cn(
                                            "text-xs",
                                            message.search.context_quality === 'high' ? 'text-green-600' :
                                                message.search.context_quality === 'medium' ? 'text-yellow-600' :
                                                    'text-gray-400'
                                        )}>
                                            ({message.search.avg_relevance}% pertinent)
                                        </span>
                                    </div>
                                )}
                            </div>

                            {message.role === 'user' && (
                                <Avatar className="w-8 h-8 border flex-shrink-0">
                                    <AvatarFallback className="bg-gray-200">
                                        <User className="w-4 h-4" />
                                    </AvatarFallback>
                                </Avatar>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Input - fixed at bottom */}
            <div className="flex-shrink-0 p-4 border-t bg-gray-50">
                <div className="flex gap-2">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Posez votre question technique..."
                        disabled={isLoading}
                        className="flex-1"
                    />
                    <Button
                        onClick={sendMessage}
                        disabled={!input.trim() || isLoading}
                        className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                    >
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
});

RAGChat.displayName = 'RAGChat';
