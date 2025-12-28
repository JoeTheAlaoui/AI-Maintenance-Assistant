// hooks/useConversationMemory.ts
// React hook for conversation memory management

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Message, APIMessage } from '@/types/conversation';
import { ConversationMemory, createConversationMemory } from '@/lib/conversation/memory';

interface UseConversationMemoryReturn {
    messages: Message[];
    addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => Message;
    clearConversation: () => void;
    getContextForAI: () => APIMessage[];
    summary: {
        messageCount: number;
        duration: string;
        lastMessageTime: string;
    } | null;
    isLoaded: boolean;
}

export function useConversationMemory(assetId: string): UseConversationMemoryReturn {
    // Create memory instance (memoized to prevent recreation)
    const memory = useMemo(() => createConversationMemory(assetId), [assetId]);

    const [messages, setMessages] = useState<Message[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load conversation on mount and when assetId changes
    useEffect(() => {
        const loadedMessages = memory.getMessages();
        setMessages(loadedMessages);
        setSummary(memory.getSummary());
        setIsLoaded(true);

        console.log(`📝 Conversation loaded for ${assetId}: ${loadedMessages.length} messages`);
    }, [memory, assetId]);

    // Add message
    const addMessage = useCallback((message: Omit<Message, 'id' | 'timestamp'>): Message => {
        const newMessage = memory.addMessage(message);
        setMessages(prev => [...prev, newMessage]);
        setSummary(memory.getSummary());

        console.log(`💬 Message added (${message.role}): ${message.content.substring(0, 50)}...`);
        return newMessage;
    }, [memory]);

    // Clear conversation
    const clearConversation = useCallback(() => {
        memory.clearConversation();
        setMessages([]);
        setSummary(null);

        console.log('🗑️ Conversation cleared');
    }, [memory]);

    // Get context for AI
    const getContextForAI = useCallback((): APIMessage[] => {
        return memory.getContextMessages();
    }, [memory]);

    return {
        messages,
        addMessage,
        clearConversation,
        getContextForAI,
        summary,
        isLoaded,
    };
}
