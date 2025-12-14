import { Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AITriageChat } from '@/components/ai-triage-chat';

export default function AIAssistantPage() {
    return (
        <div className="h-[calc(100vh-180px)] flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-xl">
                        <Sparkles className="h-7 w-7 text-white" />
                    </div>

                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">AI Triage Assistant</h1>
                        <p className="text-muted-foreground">
                            Identification intelligente des problèmes & création d'ordres de travail
                        </p>
                    </div>
                </div>

                <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm px-4 py-2 gap-2">
                    <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    AI Powered
                </Badge>
            </div>

            {/* Chat Interface */}
            <Card className="flex-1 flex flex-col border-2 shadow-xl overflow-hidden">
                <AITriageChat />
            </Card>
        </div>
    );
}
