'use client';

import { useState, useRef, useEffect } from 'react';
import {
    Send,
    Mic,
    Loader2,
    Bot,
    User,
    CheckCircle,
    Clock,
    Wrench,
    Package,
    AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════

interface SuggestionChip {
    id: string;
    label: string;
    value: string;
    metadata?: { location?: string };
}

interface WorkOrderDraft {
    assetId: string;
    assetName: string;
    componentName?: string;
    issue: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    estimatedTime?: number;
    suggestedActions: string[];
}

interface StructuredData {
    type: 'suggestion_chips' | 'confirmation' | 'work_order_draft' | 'text';
    data: {
        title?: string;
        items?: SuggestionChip[];
        assetId?: string;
        assetName?: string;
        componentName?: string;
        issue?: string;
        priority?: 'low' | 'medium' | 'high' | 'critical';
        estimatedTime?: number;
        suggestedActions?: string[];
        content?: string;
    };
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    structuredData?: StructuredData;
}

// ═══════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════

export function AITriageChat() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: "Bonjour! Je suis votre Assistant de Triage Maintenance. Je vais vous aider à identifier rapidement les problèmes et créer des ordres de travail. Quel est le problème ?",
            timestamp: new Date()
        }
    ]);

    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [workOrderCreated, setWorkOrderCreated] = useState(false);

    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-scroll
    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    // ═══════════════════════════════════════════════════
    // MESSAGE HANDLING
    // ═══════════════════════════════════════════════════

    const addMessage = (message: Message) => {
        setMessages(prev => [...prev, message]);
    };

    const sendMessage = async (text: string) => {
        if (!text.trim() || isTyping) return;

        // Add user message
        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: text,
            timestamp: new Date()
        };

        addMessage(userMessage);
        setInput('');
        setIsTyping(true);

        try {
            // Call AI Triage API
            const response = await fetch('/api/ai-triage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    conversationHistory: messages.map(m => ({
                        role: m.role,
                        content: m.content
                    }))
                })
            });

            if (!response.ok) throw new Error('API call failed');

            const data = await response.json();
            setIsTyping(false);

            // Handle structured response
            const aiResponse = data.response;

            let messageContent = '';
            let structuredData: StructuredData | undefined = undefined;

            if (aiResponse.type === 'text') {
                messageContent = aiResponse.content;
            } else if (aiResponse.type === 'suggestion_chips') {
                messageContent = aiResponse.title || 'Sélectionnez une option:';
                structuredData = {
                    type: 'suggestion_chips',
                    data: aiResponse
                };
            } else if (aiResponse.type === 'confirmation') {
                messageContent = `Pour confirmer: Vous signalez un problème avec **${aiResponse.assetName}**${aiResponse.componentName ? ` - ${aiResponse.componentName}` : ''} ?`;
                structuredData = {
                    type: 'confirmation',
                    data: aiResponse
                };
            } else if (aiResponse.type === 'work_order_draft') {
                messageContent = `J'ai préparé un ordre de travail pour **${aiResponse.assetName}**. Veuillez vérifier:`;
                structuredData = {
                    type: 'work_order_draft',
                    data: aiResponse
                };
            }

            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: messageContent,
                timestamp: new Date(),
                structuredData
            };

            addMessage(aiMessage);

        } catch (error) {
            console.error('AI Triage error:', error);
            setIsTyping(false);

            addMessage({
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Désolé, une erreur est survenue. Veuillez réessayer.',
                timestamp: new Date()
            });
        }
    };

    const handleSend = () => {
        sendMessage(input);
    };

    const handleChipClick = (chip: SuggestionChip) => {
        sendMessage(chip.label);
    };

    const handleConfirmWorkOrder = async (draft: WorkOrderDraft) => {
        setWorkOrderCreated(true);

        addMessage({
            id: Date.now().toString(),
            role: 'assistant',
            content: `✅ **Ordre de travail créé avec succès!**\n\n📋 Équipement: ${draft.assetName}\n🔧 Composant: ${draft.componentName || 'N/A'}\n⚠️ Problème: ${draft.issue}\n⏱️ Temps estimé: ${draft.estimatedTime || 60} minutes\n\nVous pouvez le consulter dans la section Ordres de Travail.`,
            timestamp: new Date()
        });
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'critical': return 'bg-red-500 text-white';
            case 'high': return 'bg-orange-500 text-white';
            case 'medium': return 'bg-yellow-500 text-black';
            default: return 'bg-green-500 text-white';
        }
    };

    // ═══════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════

    return (
        <div className="flex flex-col h-full">
            {/* Messages Area */}
            <div
                ref={scrollAreaRef}
                className="flex-1 overflow-y-auto p-6 space-y-6 max-h-[55vh]"
            >
                {messages.map((message) => (
                    <div key={message.id}>
                        {/* Message Bubble */}
                        <div
                            className={cn(
                                "flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
                                message.role === 'user' ? 'justify-end' : 'justify-start'
                            )}
                        >
                            {message.role === 'assistant' && (
                                <Avatar className="w-10 h-10 border-2 border-blue-200 flex-shrink-0">
                                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600">
                                        <Bot className="h-5 w-5 text-white" />
                                    </AvatarFallback>
                                </Avatar>
                            )}

                            <div className={cn(
                                "max-w-[75%] rounded-2xl px-5 py-3 shadow-sm",
                                message.role === 'user'
                                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                                    : 'bg-gray-100 text-gray-900 border border-gray-200'
                            )}>
                                <p className="whitespace-pre-wrap leading-relaxed text-sm">
                                    {message.content}
                                </p>
                                <p className={cn(
                                    "text-xs mt-2",
                                    message.role === 'user' ? 'text-white/70' : 'text-gray-500'
                                )}>
                                    {message.timestamp.toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </p>
                            </div>

                            {message.role === 'user' && (
                                <Avatar className="w-10 h-10 border-2 border-purple-200 flex-shrink-0">
                                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-600">
                                        <User className="h-5 w-5 text-white" />
                                    </AvatarFallback>
                                </Avatar>
                            )}
                        </div>

                        {/* Structured Data Components */}
                        {message.structuredData && (
                            <div className="mt-4 ml-14">
                                {/* Suggestion Chips */}
                                {message.structuredData.type === 'suggestion_chips' && message.structuredData.data.items && (
                                    <div className="flex flex-wrap gap-2">
                                        {message.structuredData.data.items.map((chip) => (
                                            <Button
                                                key={chip.id}
                                                onClick={() => handleChipClick(chip)}
                                                variant="outline"
                                                className="rounded-full border-2 hover:border-blue-500 hover:bg-blue-50 transition-all text-sm"
                                            >
                                                <Package className="h-4 w-4 mr-2 text-blue-600" />
                                                {chip.label}
                                                {chip.metadata?.location && (
                                                    <Badge variant="secondary" className="ml-2 text-xs">
                                                        {chip.metadata.location}
                                                    </Badge>
                                                )}
                                            </Button>
                                        ))}
                                    </div>
                                )}

                                {/* Work Order Draft Card */}
                                {message.structuredData.type === 'work_order_draft' && (
                                    <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50 max-w-lg">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="text-base flex items-center gap-2">
                                                    <Wrench className="h-5 w-5 text-blue-600" />
                                                    Ordre de Travail
                                                </CardTitle>
                                                {message.structuredData.data.priority && (
                                                    <Badge className={cn("text-xs", getPriorityColor(message.structuredData.data.priority))}>
                                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                                        {message.structuredData.data.priority.toUpperCase()}
                                                    </Badge>
                                                )}
                                            </div>
                                        </CardHeader>

                                        <CardContent className="space-y-3">
                                            {/* Asset Info */}
                                            <div className="p-3 bg-white rounded-lg border text-sm">
                                                <p className="text-gray-600 mb-1">Équipement:</p>
                                                <p className="font-semibold">{message.structuredData.data.assetName}</p>
                                                {message.structuredData.data.componentName && (
                                                    <>
                                                        <p className="text-gray-600 mt-2 mb-1">Composant:</p>
                                                        <p className="font-medium">{message.structuredData.data.componentName}</p>
                                                    </>
                                                )}
                                            </div>

                                            {/* Issue */}
                                            <div className="p-3 bg-white rounded-lg border text-sm">
                                                <p className="text-gray-600 mb-1">Problème:</p>
                                                <p className="font-medium">{message.structuredData.data.issue}</p>
                                            </div>

                                            {/* Estimated Time */}
                                            {message.structuredData.data.estimatedTime && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Clock className="h-4 w-4 text-gray-500" />
                                                    <span className="text-gray-600">Temps estimé:</span>
                                                    <span className="font-semibold">{message.structuredData.data.estimatedTime} min</span>
                                                </div>
                                            )}

                                            {/* Suggested Actions */}
                                            {message.structuredData.data.suggestedActions && (
                                                <div className="p-3 bg-white rounded-lg border text-sm">
                                                    <p className="font-semibold mb-2">Actions suggérées:</p>
                                                    <ol className="list-decimal list-inside space-y-1">
                                                        {message.structuredData.data.suggestedActions.map((action, idx) => (
                                                            <li key={idx} className="text-gray-700">{action}</li>
                                                        ))}
                                                    </ol>
                                                </div>
                                            )}

                                            {/* Action Buttons */}
                                            {!workOrderCreated && (
                                                <div className="flex gap-2 pt-2">
                                                    <Button
                                                        onClick={() => handleConfirmWorkOrder(message.structuredData!.data as WorkOrderDraft)}
                                                        className="flex-1 btn-gradient rounded-xl"
                                                        size="sm"
                                                    >
                                                        <CheckCircle className="h-4 w-4 mr-2" />
                                                        Créer l'Ordre
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        className="rounded-xl border-2"
                                                        size="sm"
                                                        onClick={() => sendMessage("Modifier cet ordre")}
                                                    >
                                                        Modifier
                                                    </Button>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        )}
                    </div>
                ))}

                {/* Typing Indicator */}
                {isTyping && (
                    <div className="flex gap-3 justify-start animate-in fade-in duration-300">
                        <Avatar className="w-10 h-10 border-2 border-blue-200 flex-shrink-0">
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600">
                                <Bot className="h-5 w-5 text-white" />
                            </AvatarFallback>
                        </Avatar>

                        <div className="bg-gray-100 rounded-2xl px-5 py-4 border border-gray-200">
                            <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                                <span className="text-sm text-gray-600">Analyse en cours...</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Suggestions */}
            {messages.length <= 2 && (
                <div className="px-6 py-3 border-t bg-gray-50/50">
                    <p className="text-xs text-muted-foreground mb-2">💡 Exemples de demandes:</p>
                    <div className="flex flex-wrap gap-2">
                        {[
                            "Il y a un problème avec une machine",
                            "Bruit anormal zone A",
                            "Voyant rouge sur le compresseur"
                        ].map((suggestion, idx) => (
                            <Button
                                key={idx}
                                variant="outline"
                                size="sm"
                                onClick={() => sendMessage(suggestion)}
                                className="rounded-full border-2 text-xs hover:bg-blue-50 hover:border-blue-300"
                            >
                                {suggestion}
                            </Button>
                        ))}
                    </div>
                </div>
            )}

            {/* Input Area */}
            <div className="border-t p-4 bg-white">
                <div className="flex gap-3 items-end">
                    {/* Input Field */}
                    <div className="flex-1">
                        <Input
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                            placeholder="Décrivez le problème (ex: 'Compresseur fait du bruit')..."
                            className="h-12 text-base border-2 rounded-xl px-4"
                            disabled={isTyping}
                        />
                    </div>

                    {/* Voice Button */}
                    <Button
                        variant="outline"
                        size="icon"
                        className="rounded-xl border-2 h-12 w-12 flex-shrink-0"
                        title="Saisie vocale"
                    >
                        <Mic className="h-5 w-5" />
                    </Button>

                    {/* Send Button */}
                    <Button
                        onClick={handleSend}
                        disabled={!input.trim() || isTyping}
                        size="lg"
                        className="btn-gradient rounded-xl h-12 px-6 flex-shrink-0"
                    >
                        {isTyping ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <>
                                <Send className="h-5 w-5 mr-2" />
                                Envoyer
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
