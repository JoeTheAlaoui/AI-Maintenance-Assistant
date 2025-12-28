// components/assets/DependencySuggestions.tsx
// UI for reviewing AI-generated dependency suggestions

'use client';

import { useState, useEffect } from 'react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Check,
    X,
    Sparkles,
    ArrowUpRight,
    ArrowDownRight,
    RefreshCcw,
    Link2,
    AlertTriangle,
    Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

interface Suggestion {
    id: string;
    target_name_raw: string;
    target: { id: string; name: string; custom_name?: string } | null;
    relationship_type: string;
    confidence: number;
    context_snippet: string;
}

interface DependencySuggestionsProps {
    assetId: string;
    assetName?: string;
}

export default function DependencySuggestions({ assetId, assetName }: DependencySuggestionsProps) {
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null);

    useEffect(() => {
        fetchSuggestions();
    }, [assetId]);

    async function fetchSuggestions() {
        try {
            setLoading(true);
            const response = await fetch(`/api/dependencies/suggestions?assetId=${assetId}`);
            const data = await response.json();
            setSuggestions(data.suggestions || []);
        } catch (error) {
            console.error('Error fetching suggestions:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleApprove(suggestionId: string) {
        try {
            setProcessing(suggestionId);
            const response = await fetch(`/api/dependencies/suggestions/${suggestionId}`, {
                method: 'POST',
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to approve');
            }

            toast.success('✅ Dependency created!');
            setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
        } catch (error: any) {
            toast.error(error.message || 'Failed to approve suggestion');
        } finally {
            setProcessing(null);
        }
    }

    async function handleReject(suggestionId: string) {
        try {
            setProcessing(suggestionId);
            const response = await fetch(`/api/dependencies/suggestions/${suggestionId}`, {
                method: 'PATCH',
            });

            if (!response.ok) {
                throw new Error('Failed to reject');
            }

            toast.success('Suggestion rejected');
            setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
        } catch (error) {
            toast.error('Failed to reject suggestion');
        } finally {
            setProcessing(null);
        }
    }

    async function handleApproveAll() {
        const matchedSuggestions = suggestions.filter(s => s.target);
        if (matchedSuggestions.length === 0) return;

        for (const suggestion of matchedSuggestions) {
            await handleApprove(suggestion.id);
        }
    }

    function getRelationshipIcon(type: string) {
        switch (type) {
            case 'upstream':
                return <ArrowUpRight className="h-4 w-4 text-blue-500" />;
            case 'downstream':
                return <ArrowDownRight className="h-4 w-4 text-green-500" />;
            case 'alternative':
                return <RefreshCcw className="h-4 w-4 text-orange-500" />;
            case 'parallel':
                return <Link2 className="h-4 w-4 text-purple-500" />;
            default:
                return <Link2 className="h-4 w-4 text-gray-500" />;
        }
    }

    function getRelationshipLabel(type: string) {
        switch (type) {
            case 'upstream': return 'Feeds into this equipment';
            case 'downstream': return 'Receives from this equipment';
            case 'alternative': return 'Backup/alternative';
            case 'parallel': return 'Runs in parallel';
            default: return 'Related equipment';
        }
    }

    function getConfidenceBadge(confidence: number) {
        if (confidence >= 0.9) {
            return <Badge className="bg-green-500 text-white text-xs">High ({(confidence * 100).toFixed(0)}%)</Badge>;
        }
        if (confidence >= 0.7) {
            return <Badge className="bg-yellow-500 text-white text-xs">Medium ({(confidence * 100).toFixed(0)}%)</Badge>;
        }
        return <Badge className="bg-orange-500 text-white text-xs">Low ({(confidence * 100).toFixed(0)}%)</Badge>;
    }

    if (loading) {
        return (
            <Card className="border-dashed border-purple-300 bg-purple-50/30">
                <CardContent className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
                </CardContent>
            </Card>
        );
    }

    if (suggestions.length === 0) {
        return null; // Don't show if no suggestions
    }

    const matchedCount = suggestions.filter(s => s.target).length;
    const unmatchedCount = suggestions.length - matchedCount;

    return (
        <Card className="border-purple-300 bg-gradient-to-br from-purple-50/50 to-white">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                    AI Detected Dependencies
                    <Badge variant="secondary" className="ml-2">
                        {suggestions.length}
                    </Badge>
                </CardTitle>
                <CardDescription>
                    Found in uploaded manuals for {assetName || 'this equipment'}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Bulk Actions */}
                {matchedCount > 0 && (
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                        <span className="text-sm text-muted-foreground">
                            {matchedCount} matched, {unmatchedCount} unmatched
                        </span>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleApproveAll}
                            disabled={processing !== null}
                        >
                            <Check className="h-3 w-3 mr-1" />
                            Approve All Matched
                        </Button>
                    </div>
                )}

                {/* Suggestions List */}
                <div className="space-y-3">
                    {suggestions.map((suggestion) => {
                        const isMatched = !!suggestion.target;
                        const isProcessing = processing === suggestion.id;

                        return (
                            <div
                                key={suggestion.id}
                                className={`
                                    border rounded-lg p-4 transition-all
                                    ${isMatched ? 'bg-white' : 'bg-orange-50/50 border-orange-200'}
                                    ${isProcessing ? 'opacity-50' : ''}
                                `}
                            >
                                {/* Header */}
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-2">
                                        {getRelationshipIcon(suggestion.relationship_type)}
                                        <span className="font-medium capitalize text-sm">
                                            {suggestion.relationship_type}
                                        </span>
                                        {getConfidenceBadge(suggestion.confidence)}
                                    </div>
                                </div>

                                {/* Equipment Name */}
                                <div className="mb-2">
                                    {isMatched ? (
                                        <div>
                                            <p className="font-medium text-gray-900">
                                                {suggestion.target!.name}
                                                {suggestion.target!.custom_name && (
                                                    <span className="text-gray-500 font-normal ml-1">
                                                        ({suggestion.target!.custom_name})
                                                    </span>
                                                )}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {getRelationshipLabel(suggestion.relationship_type)}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="flex items-start gap-2">
                                            <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />
                                            <div>
                                                <p className="font-medium text-orange-700">
                                                    "{suggestion.target_name_raw}"
                                                </p>
                                                <p className="text-xs text-orange-600">
                                                    No matching equipment found in database
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Context Snippet */}
                                {suggestion.context_snippet && (
                                    <div className="text-xs text-gray-500 italic bg-gray-50 p-2 rounded mb-3">
                                        "{suggestion.context_snippet}"
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        onClick={() => handleApprove(suggestion.id)}
                                        disabled={!isMatched || isProcessing}
                                        className="bg-green-600 hover:bg-green-700"
                                    >
                                        {isProcessing ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                            <>
                                                <Check className="h-3 w-3 mr-1" />
                                                {isMatched ? 'Approve' : 'No Match'}
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleReject(suggestion.id)}
                                        disabled={isProcessing}
                                    >
                                        <X className="h-3 w-3 mr-1" />
                                        Reject
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
