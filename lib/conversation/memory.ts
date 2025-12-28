// lib/conversation/memory.ts
// Core conversation memory management with session storage persistence

import { Message, Conversation, ConversationMemoryConfig, APIMessage } from '@/types/conversation';

const DEFAULT_CONFIG: ConversationMemoryConfig = {
    maxMessages: 10,
    maxContextMessages: 5,
    storage: 'session',
    autoSave: true,
};

export class ConversationMemory {
    private config: ConversationMemoryConfig;
    private storageKey: string;

    constructor(assetId: string, config?: Partial<ConversationMemoryConfig>) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.storageKey = `conversation_${assetId}`;
    }

    /**
     * Get current conversation from storage
     */
    getConversation(): Conversation | null {
        try {
            const stored = this.getStorage().getItem(this.storageKey);
            if (!stored) return null;

            const data = JSON.parse(stored);

            // Convert ISO strings back to Date objects
            return {
                ...data,
                createdAt: new Date(data.createdAt),
                lastMessageAt: new Date(data.lastMessageAt),
                messages: data.messages.map((m: any) => ({
                    ...m,
                    timestamp: new Date(m.timestamp),
                })),
            };
        } catch (error) {
            console.error('Error loading conversation:', error);
            return null;
        }
    }

    /**
     * Add a message to conversation
     */
    addMessage(message: Omit<Message, 'id' | 'timestamp'>): Message {
        const conversation = this.getConversation();

        const newMessage: Message = {
            ...message,
            id: this.generateMessageId(),
            timestamp: new Date(),
        };

        if (!conversation) {
            // Create new conversation
            const newConversation: Conversation = {
                id: this.generateConversationId(),
                assetId: message.metadata?.assetId || '',
                messages: [newMessage],
                createdAt: new Date(),
                lastMessageAt: new Date(),
            };
            this.saveConversation(newConversation);
        } else {
            // Add to existing conversation
            conversation.messages.push(newMessage);
            conversation.lastMessageAt = new Date();

            // Trim old messages if exceeds max
            if (conversation.messages.length > this.config.maxMessages) {
                conversation.messages = conversation.messages.slice(
                    conversation.messages.length - this.config.maxMessages
                );
            }

            this.saveConversation(conversation);
        }

        return newMessage;
    }

    /**
     * Get all messages (for display)
     */
    getMessages(): Message[] {
        const conversation = this.getConversation();
        return conversation?.messages || [];
    }

    /**
     * Get messages to send to AI (last N messages, formatted for API)
     */
    getContextMessages(): APIMessage[] {
        const conversation = this.getConversation();
        if (!conversation) return [];

        const contextSize = this.config.maxContextMessages;
        return conversation.messages
            .slice(-contextSize)
            .map(m => ({ role: m.role, content: m.content }));
    }

    /**
     * Clear conversation history
     */
    clearConversation(): void {
        this.getStorage().removeItem(this.storageKey);
    }

    /**
     * Get conversation summary for display
     */
    getSummary(): {
        messageCount: number;
        duration: string;
        lastMessageTime: string;
    } | null {
        const conversation = this.getConversation();
        if (!conversation || conversation.messages.length === 0) return null;

        const duration = this.formatDuration(
            conversation.createdAt,
            conversation.lastMessageAt
        );

        const lastMessageTime = this.formatRelativeTime(
            conversation.lastMessageAt
        );

        return {
            messageCount: conversation.messages.length,
            duration,
            lastMessageTime,
        };
    }

    /**
     * Private: Save conversation to storage
     */
    private saveConversation(conversation: Conversation): void {
        try {
            this.getStorage().setItem(this.storageKey, JSON.stringify(conversation));
        } catch (error) {
            console.error('Error saving conversation:', error);

            // If storage full, clear oldest messages
            if (error instanceof DOMException && error.name === 'QuotaExceededError') {
                conversation.messages = conversation.messages.slice(-5);
                this.getStorage().setItem(this.storageKey, JSON.stringify(conversation));
            }
        }
    }

    /**
     * Private: Get storage mechanism
     */
    private getStorage(): Storage {
        if (typeof window === 'undefined') {
            // Server-side: return mock storage
            return {
                getItem: () => null,
                setItem: () => { },
                removeItem: () => { },
                clear: () => { },
                length: 0,
                key: () => null,
            };
        }

        return this.config.storage === 'local'
            ? window.localStorage
            : window.sessionStorage;
    }

    /**
     * Private: Generate unique message ID
     */
    private generateMessageId(): string {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Private: Generate unique conversation ID
     */
    private generateConversationId(): string {
        return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Private: Format duration between two dates
     */
    private formatDuration(start: Date, end: Date): string {
        const ms = end.getTime() - start.getTime();
        const minutes = Math.floor(ms / 60000);

        if (minutes < 1) return 'Just started';
        if (minutes === 1) return '1 minute';
        if (minutes < 60) return `${minutes} minutes`;

        const hours = Math.floor(minutes / 60);
        if (hours === 1) return '1 hour';
        return `${hours} hours`;
    }

    /**
     * Private: Format relative time
     */
    private formatRelativeTime(date: Date): string {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Just now';
        if (diffMins === 1) return '1 min ago';
        if (diffMins < 60) return `${diffMins} min ago`;

        const diffHours = Math.floor(diffMins / 60);
        if (diffHours === 1) return '1 hour ago';
        if (diffHours < 24) return `${diffHours} hours ago`;

        const diffDays = Math.floor(diffHours / 24);
        if (diffDays === 1) return 'Yesterday';
        return `${diffDays} days ago`;
    }
}

/**
 * Factory function for creating memory instance
 */
export function createConversationMemory(
    assetId: string,
    config?: Partial<ConversationMemoryConfig>
): ConversationMemory {
    return new ConversationMemory(assetId, config);
}
