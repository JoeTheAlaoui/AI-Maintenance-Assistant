'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Alias {
    id: string;
    alias: string;
    alias_normalized: string;
    language: string;
    created_at: string;
}

interface AliasManagerProps {
    assetId: string;
}

const LANGUAGES = [
    { code: 'ar', label: 'AR', color: 'bg-blue-500' },
    { code: 'fr', label: 'FR', color: 'bg-red-500' },
    { code: 'en', label: 'EN', color: 'bg-green-500' },
];

export default function AliasManager({ assetId }: AliasManagerProps) {
    const [aliases, setAliases] = useState<Alias[]>([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [newAlias, setNewAlias] = useState('');
    const [selectedLanguage, setSelectedLanguage] = useState('ar');

    useEffect(() => {
        fetchAliases();
    }, [assetId]);

    async function fetchAliases() {
        try {
            setLoading(true);
            const response = await fetch(`/api/assets/${assetId}/aliases`);
            const data = await response.json();
            setAliases(data.aliases || []);
        } catch (error) {
            console.error('Error fetching aliases:', error);
            toast.error('Failed to load aliases');
        } finally {
            setLoading(false);
        }
    }

    async function handleAddAlias() {
        if (!newAlias.trim() || newAlias.trim().length < 2) {
            toast.error('Alias must be at least 2 characters');
            return;
        }

        try {
            setAdding(true);
            const response = await fetch(`/api/assets/${assetId}/aliases`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    alias: newAlias.trim(),
                    language: selectedLanguage
                })
            });

            const data = await response.json();

            if (!response.ok) {
                toast.error(data.error || 'Failed to create alias');
                return;
            }

            toast.success('Alias created successfully!');
            setNewAlias('');
            fetchAliases(); // Refresh list

        } catch (error) {
            console.error('Error creating alias:', error);
            toast.error('Failed to create alias');
        } finally {
            setAdding(false);
        }
    }

    async function handleDeleteAlias(aliasId: string, aliasName: string) {
        if (!confirm(`Delete "${aliasName}"?\nThis cannot be undone.`)) {
            return;
        }

        try {
            const response = await fetch(`/api/assets/${assetId}/aliases?aliasId=${aliasId}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (!response.ok) {
                toast.error(data.error || 'Failed to delete alias');
                return;
            }

            toast.success('Alias deleted successfully');
            fetchAliases(); // Refresh list

        } catch (error) {
            console.error('Error deleting alias:', error);
            toast.error('Failed to delete alias');
        }
    }

    function getLanguageColor(lang: string) {
        return LANGUAGES.find(l => l.code === lang)?.color || 'bg-gray-500';
    }

    if (loading) {
        return (
            <Card>
                <CardContent className="py-8 flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Custom Names (Aliases)</CardTitle>
                <CardDescription>
                    Add alternative names to make this equipment easier to find
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Alias List */}
                {aliases.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <p className="mb-2">No custom names yet</p>
                        <p className="text-sm">Add aliases to make this equipment easier to find</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {aliases.map((alias) => (
                            <div
                                key={alias.id}
                                className="flex items-start justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge className={`${getLanguageColor(alias.language)} text-white text-xs`}>
                                            {alias.language.toUpperCase()}
                                        </Badge>
                                        <span className="font-medium">{alias.alias}</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Added {format(new Date(alias.created_at), 'MMM d, yyyy')}
                                    </p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteAlias(alias.id, alias.alias)}
                                    className="text-destructive hover:text-destructive"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Add New Alias Form */}
                <div className="border-t pt-4 mt-4">
                    <div className="space-y-3">
                        <Input
                            placeholder="Enter new alias..."
                            value={newAlias}
                            onChange={(e) => setNewAlias(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAddAlias()}
                            disabled={adding}
                        />

                        <div className="flex items-center gap-2">
                            {/* Language Selector */}
                            <div className="flex gap-1">
                                {LANGUAGES.map((lang) => (
                                    <Button
                                        key={lang.code}
                                        variant={selectedLanguage === lang.code ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setSelectedLanguage(lang.code)}
                                        disabled={adding}
                                    >
                                        {lang.label}
                                    </Button>
                                ))}
                            </div>

                            {/* Add Button */}
                            <Button
                                onClick={handleAddAlias}
                                disabled={!newAlias.trim() || adding}
                                className="ml-auto"
                            >
                                {adding ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Adding...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Alias
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
