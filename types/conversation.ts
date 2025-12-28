// types/conversation.ts
// TypeScript interfaces for Conversation Memory (Phase 5)

export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    metadata?: {
        assetId?: string;
        assetName?: string;
        intent?: string;
        documentTypes?: string[];
    };
}

export interface Conversation {
    id: string;
    assetId: string;
    messages: Message[];
    createdAt: Date;
    lastMessageAt: Date;
}

export interface ConversationMemoryConfig {
    maxMessages: number;        // Max messages to keep in storage (default: 10)
    maxContextMessages: number; // Max to send to AI (default: 5)
    storage: 'session' | 'local';
    autoSave: boolean;
}

// API message format (simplified for sending to backend)
export interface APIMessage {
    role: 'user' | 'assistant';
    content: string;
}
