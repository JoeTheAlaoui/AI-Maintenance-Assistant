// components/chat/ConversationControls.tsx
// UI controls for conversation memory - stats display and clear button

'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { MessageSquare, Trash2, Clock, Hash, Sparkles } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ConversationControlsProps {
    summary: {
        messageCount: number;
        duration: string;
        lastMessageTime: string;
    } | null;
    onClear: () => void;
}

export default function ConversationControls({
    summary,
    onClear,
}: ConversationControlsProps) {
    if (!summary) {
        return (
            <div className="flex items-center gap-2 px-4 py-2 border-b bg-gradient-to-r from-purple-50/50 to-blue-50/50">
                <Sparkles className="h-4 w-4 text-purple-500" />
                <span className="text-sm text-muted-foreground">
                    New conversation • I remember context from this session
                </span>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-between px-4 py-2 border-b bg-gradient-to-r from-purple-50/50 to-blue-50/50">
            {/* Left: Conversation Info */}
            <div className="flex items-center gap-3">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Badge variant="secondary" className="gap-1 bg-purple-100 text-purple-700 hover:bg-purple-200">
                                <Hash className="h-3 w-3" />
                                {summary.messageCount}
                            </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{summary.messageCount} messages in this conversation</p>
                        </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Badge variant="outline" className="gap-1">
                                <Clock className="h-3 w-3" />
                                {summary.duration}
                            </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Conversation started {summary.duration} ago</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                <span className="text-xs text-muted-foreground hidden sm:inline">
                    Last: {summary.lastMessageTime}
                </span>
            </div>

            {/* Right: Clear Button */}
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 text-muted-foreground hover:text-red-500">
                        <Trash2 className="h-3 w-3 mr-1" />
                        <span className="hidden sm:inline">Clear</span>
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Clear conversation?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will delete {summary.messageCount} messages from this conversation.
                            The AI will start fresh without any context from previous questions.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={onClear}
                            className="bg-red-500 hover:bg-red-600"
                        >
                            Clear Conversation
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
