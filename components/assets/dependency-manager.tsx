'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowUp, ArrowDown, Plus, Trash2, Check, Sparkles, Loader2, Link2 } from 'lucide-react';
import { toast } from 'sonner';

interface Dependency {
    id?: string;
    depends_on_id: string;
    depends_on_name: string;
    dependency_type: string;
    criticality: string;
    source: string;
    confidence?: number;
    reasoning?: string;
}

interface Props {
    assetId: string;
    assetName: string;
}

const dependencyTypeLabels: Record<string, string> = {
    feeds: 'Alimente',
    powers: 'Électrique',
    controls: 'Contrôle',
    cools: 'Refroidit',
    lubricates: 'Lubrifie',
};

const criticalityLabels: Record<string, { label: string; icon: string }> = {
    critical: { label: 'Critique', icon: '🔴' },
    high: { label: 'Haute', icon: '🟠' },
    medium: { label: 'Moyenne', icon: '🟡' },
    low: { label: 'Basse', icon: '🟢' },
};

export function DependencyManager({ assetId, assetName }: Props) {
    const [upstream, setUpstream] = useState<Dependency[]>([]);
    const [downstream, setDownstream] = useState<Dependency[]>([]);
    const [allAssets, setAllAssets] = useState<{ id: string; name: string }[]>([]);
    const [suggesting, setSuggesting] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    // New dependency form state
    const [showAddUpstream, setShowAddUpstream] = useState(false);
    const [showAddDownstream, setShowAddDownstream] = useState(false);
    const [newAssetId, setNewAssetId] = useState('');
    const [newType, setNewType] = useState('feeds');
    const [newCriticality, setNewCriticality] = useState('high');

    const supabase = createClient();

    useEffect(() => {
        loadDependencies();
        loadAllAssets();
    }, [assetId]);

    const loadDependencies = async () => {
        setLoading(true);

        // Load upstream (what feeds this asset)
        const { data: upData } = await supabase
            .from('asset_dependencies')
            .select(`
                id, dependency_type, criticality, source, confidence,
                depends_on:depends_on_id (id, name)
            `)
            .eq('asset_id', assetId);

        if (upData) {
            setUpstream(upData.map((d: any) => ({
                id: d.id,
                depends_on_id: d.depends_on?.id,
                depends_on_name: d.depends_on?.name || 'Inconnu',
                dependency_type: d.dependency_type,
                criticality: d.criticality,
                source: d.source,
                confidence: d.confidence,
            })).filter(d => d.depends_on_id));
        }

        // Load downstream (what depends on this asset)
        const { data: downData } = await supabase
            .from('asset_dependencies')
            .select(`
                id, dependency_type, criticality, source, confidence,
                asset:asset_id (id, name)
            `)
            .eq('depends_on_id', assetId);

        if (downData) {
            setDownstream(downData.map((d: any) => ({
                id: d.id,
                depends_on_id: d.asset?.id,
                depends_on_name: d.asset?.name || 'Inconnu',
                dependency_type: d.dependency_type,
                criticality: d.criticality,
                source: d.source,
                confidence: d.confidence,
            })).filter(d => d.depends_on_id));
        }

        setLoading(false);
    };

    const loadAllAssets = async () => {
        const { data } = await supabase
            .from('assets')
            .select('id, name')
            .neq('id', assetId)
            .order('name');
        if (data) setAllAssets(data);
    };

    const suggestDependencies = async () => {
        setSuggesting(true);
        try {
            const response = await fetch('/api/suggest-dependencies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ asset_id: assetId }),
            });

            if (!response.ok) {
                throw new Error('Failed to get suggestions');
            }

            const suggestions = await response.json();

            // Add suggestions (marked as ai_suggested)
            if (suggestions.upstream?.length > 0) {
                const newUpstream = suggestions.upstream
                    .filter((s: any) => s.depends_on_id && !upstream.some(p => p.depends_on_id === s.depends_on_id))
                    .map((s: any) => ({ ...s, source: 'ai_suggested' }));

                if (newUpstream.length > 0) {
                    setUpstream(prev => [...prev, ...newUpstream]);
                    toast.success(`${newUpstream.length} suggestions amont ajoutées`);
                }
            }

            if (suggestions.downstream?.length > 0) {
                const newDownstream = suggestions.downstream
                    .filter((s: any) => s.depends_on_id && !downstream.some(p => p.depends_on_id === s.depends_on_id))
                    .map((s: any) => ({ ...s, source: 'ai_suggested' }));

                if (newDownstream.length > 0) {
                    setDownstream(prev => [...prev, ...newDownstream]);
                    toast.success(`${newDownstream.length} suggestions aval ajoutées`);
                }
            }

            if (!suggestions.upstream?.length && !suggestions.downstream?.length) {
                toast.info('Aucune nouvelle suggestion trouvée');
            }
        } catch (error) {
            console.error('Suggestion error:', error);
            toast.error('Erreur lors de la suggestion');
        }
        setSuggesting(false);
    };

    const saveDependency = async (dep: Dependency, direction: 'upstream' | 'downstream') => {
        setSaving(true);
        try {
            const record = direction === 'upstream'
                ? { asset_id: assetId, depends_on_id: dep.depends_on_id }
                : { asset_id: dep.depends_on_id, depends_on_id: assetId };

            const { error } = await supabase.from('asset_dependencies').upsert({
                ...record,
                dependency_type: dep.dependency_type,
                criticality: dep.criticality,
                source: dep.source === 'ai_suggested' ? 'confirmed' : dep.source,
                confidence: dep.confidence,
            }, {
                onConflict: 'asset_id,depends_on_id,dependency_type'
            });

            if (error) throw error;

            toast.success('Dépendance enregistrée');
            await loadDependencies();
        } catch (error) {
            console.error('Save error:', error);
            toast.error('Erreur lors de l\'enregistrement');
        }
        setSaving(false);
    };

    const removeDependency = async (depId: string) => {
        const { error } = await supabase.from('asset_dependencies').delete().eq('id', depId);
        if (error) {
            toast.error('Erreur lors de la suppression');
        } else {
            toast.success('Dépendance supprimée');
            await loadDependencies();
        }
    };

    const updateDependency = (
        direction: 'upstream' | 'downstream',
        index: number,
        field: 'dependency_type' | 'criticality',
        value: string
    ) => {
        const setter = direction === 'upstream' ? setUpstream : setDownstream;
        setter(prev => prev.map((d, i) => i === index ? { ...d, [field]: value } : d));
    };

    const addNewDependency = async (direction: 'upstream' | 'downstream') => {
        if (!newAssetId) {
            toast.error('Sélectionnez un équipement');
            return;
        }

        const selectedAsset = allAssets.find(a => a.id === newAssetId);
        if (!selectedAsset) return;

        setSaving(true);
        try {
            const record = direction === 'upstream'
                ? { asset_id: assetId, depends_on_id: newAssetId }
                : { asset_id: newAssetId, depends_on_id: assetId };

            const { error } = await supabase.from('asset_dependencies').insert({
                ...record,
                dependency_type: newType,
                criticality: newCriticality,
                source: 'manual',
            });

            if (error) throw error;

            toast.success('Dépendance ajoutée');
            setNewAssetId('');
            setNewType('feeds');
            setNewCriticality('high');
            setShowAddUpstream(false);
            setShowAddDownstream(false);
            await loadDependencies();
        } catch (error) {
            console.error('Add error:', error);
            toast.error('Erreur lors de l\'ajout');
        }
        setSaving(false);
    };

    const renderAddForm = (direction: 'upstream' | 'downstream') => {
        const isShow = direction === 'upstream' ? showAddUpstream : showAddDownstream;
        const setShow = direction === 'upstream' ? setShowAddUpstream : setShowAddDownstream;
        const existingIds = direction === 'upstream'
            ? upstream.map(d => d.depends_on_id)
            : downstream.map(d => d.depends_on_id);
        const availableAssets = allAssets.filter(a => !existingIds.includes(a.id));

        if (!isShow) {
            return (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShow(true)}
                    className="mt-2 w-full border-dashed"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter manuellement
                </Button>
            );
        }

        return (
            <div className="mt-2 p-3 border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <div className="flex items-center gap-2 flex-wrap">
                    <Select value={newAssetId} onValueChange={setNewAssetId}>
                        <SelectTrigger className="flex-1 min-w-[180px] h-9 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                            <SelectValue placeholder="Sélectionner un équipement..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-60 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                            {availableAssets.length === 0 ? (
                                <div className="p-2 text-sm text-gray-500 dark:text-gray-400">Aucun équipement disponible</div>
                            ) : (
                                availableAssets.map(asset => (
                                    <SelectItem key={asset.id} value={asset.id}>
                                        {asset.name}
                                    </SelectItem>
                                ))
                            )}
                        </SelectContent>
                    </Select>

                    <Select value={newType} onValueChange={setNewType}>
                        <SelectTrigger className="w-28 h-9 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                            {Object.entries(dependencyTypeLabels).map(([value, label]) => (
                                <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={newCriticality} onValueChange={setNewCriticality}>
                        <SelectTrigger className="w-28 h-9 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                            {Object.entries(criticalityLabels).map(([value, { label, icon }]) => (
                                <SelectItem key={value} value={value}>
                                    {icon} {label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button
                        size="sm"
                        onClick={() => addNewDependency(direction)}
                        disabled={saving || !newAssetId}
                        className="h-9"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { setShow(false); setNewAssetId(''); }}
                        className="h-9"
                    >
                        Annuler
                    </Button>
                </div>
            </div>
        );
    };

    const renderDependencyList = (deps: Dependency[], direction: 'upstream' | 'downstream') => (
        <div className="space-y-2">
            {deps.map((dep, idx) => (
                <div
                    key={dep.id || `${direction}-${idx}`}
                    className={`flex flex-wrap sm:flex-nowrap items-center gap-2 p-3 rounded-lg border transition-colors ${dep.source === 'ai_suggested'
                        ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                        }`}
                >
                    <Link2 className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0 hidden sm:block" />
                    <span className="font-medium flex-1 min-w-0 truncate text-gray-900 dark:text-white">{dep.depends_on_name}</span>

                    <Select
                        value={dep.dependency_type}
                        onValueChange={(v) => updateDependency(direction, idx, 'dependency_type', v)}
                    >
                        <SelectTrigger className="w-24 sm:w-28 h-8 text-xs sm:text-sm bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                            {Object.entries(dependencyTypeLabels).map(([value, label]) => (
                                <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={dep.criticality}
                        onValueChange={(v) => updateDependency(direction, idx, 'criticality', v)}
                    >
                        <SelectTrigger className="w-24 sm:w-28 h-8 text-xs sm:text-sm bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                            {Object.entries(criticalityLabels).map(([value, { label, icon }]) => (
                                <SelectItem key={value} value={value}>
                                    {icon} {label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {dep.source === 'ai_suggested' ? (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => saveDependency(dep, direction)}
                            disabled={saving}
                            className="h-8"
                        >
                            <Check className="w-4 h-4" />
                        </Button>
                    ) : dep.id ? (
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeDependency(dep.id!)}
                            className="h-8 text-red-500 hover:text-red-600"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    ) : null}
                </div>
            ))}

            {deps.length === 0 && (
                <p className="text-gray-400 text-sm py-4 text-center">
                    Aucune dépendance {direction === 'upstream' ? 'amont' : 'aval'}
                </p>
            )}
        </div>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                    <Link2 className="w-5 h-5 text-blue-500" />
                    Dépendances de {assetName}
                </h3>
                <Button onClick={suggestDependencies} disabled={suggesting} variant="outline" size="sm">
                    {suggesting ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    Suggérer (IA)
                </Button>
            </div>

            {/* Upstream */}
            <div>
                <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3 flex items-center gap-2">
                    <ArrowUp className="w-4 h-4" />
                    Amont (ce qui alimente cet équipement)
                </h4>
                {renderDependencyList(upstream, 'upstream')}
                {renderAddForm('upstream')}
            </div>

            {/* Downstream */}
            <div>
                <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3 flex items-center gap-2">
                    <ArrowDown className="w-4 h-4" />
                    Aval (ce qui dépend de cet équipement)
                </h4>
                {renderDependencyList(downstream, 'downstream')}
                {renderAddForm('downstream')}
            </div>

            {/* Legend */}
            {(upstream.some(d => d.source === 'ai_suggested') || downstream.some(d => d.source === 'ai_suggested')) && (
                <div className="text-xs text-gray-500 flex items-center gap-2 pt-2 border-t">
                    <div className="w-3 h-3 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 rounded" />
                    <span>Suggestion IA - Cliquez ✓ pour confirmer</span>
                </div>
            )}
        </div>
    );
}
