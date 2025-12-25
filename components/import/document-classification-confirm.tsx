'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, FileText, Wrench, Package, Zap, FileSpreadsheet, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DocumentClassificationConfirmProps {
    suggestedType: string;
    confidence: number;
    reasoning?: string;
    onConfirm: (type: string) => void;
    onSkip?: () => void;
}

const documentTypes = [
    { value: 'manual', label: 'Manuel Utilisateur', icon: FileText, description: 'Maintenance, opérations', color: 'text-blue-500' },
    { value: 'installation', label: 'Manuel Installation', icon: Wrench, description: 'Mise en service, configuration', color: 'text-green-500' },
    { value: 'catalogue', label: 'Catalogue Pièces', icon: Package, description: 'Références, pièces de rechange', color: 'text-orange-500' },
    { value: 'schematic', label: 'Schémas Techniques', icon: Zap, description: 'Électrique, pneumatique, P&ID', color: 'text-yellow-500' },
    { value: 'datasheet', label: 'Fiche Technique', icon: FileSpreadsheet, description: 'Spécifications, caractéristiques', color: 'text-purple-500' },
    { value: 'other', label: 'Autre', icon: HelpCircle, description: 'Autre type de document', color: 'text-gray-500' },
];

export function DocumentClassificationConfirm({
    suggestedType,
    confidence,
    reasoning,
    onConfirm,
    onSkip
}: DocumentClassificationConfirmProps) {
    const [selectedType, setSelectedType] = useState(suggestedType);

    const suggested = documentTypes.find(t => t.value === suggestedType) || documentTypes[0];
    const SuggestedIcon = suggested.icon;

    const confidenceColor = confidence > 0.8 ? 'text-green-600' : confidence > 0.6 ? 'text-yellow-600' : 'text-orange-600';
    const confidenceLabel = confidence > 0.8 ? 'Haute' : confidence > 0.6 ? 'Moyenne' : 'Faible';

    return (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                Classification du document
            </h3>

            {/* AI Suggestion */}
            <div className="flex items-center gap-3 mb-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-700", suggested.color)}>
                    <SuggestedIcon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">{suggested.label}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{suggested.description}</p>
                </div>
                <div className="text-right">
                    <p className={cn("text-sm font-medium", confidenceColor)}>
                        {(confidence * 100).toFixed(0)}%
                    </p>
                    <p className="text-xs text-gray-400">{confidenceLabel}</p>
                </div>
            </div>

            {/* AI Reasoning */}
            {reasoning && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 italic">
                    💡 {reasoning}
                </p>
            )}

            {/* Type Selector */}
            <div className="mb-4">
                <label className="text-sm text-gray-600 dark:text-gray-400 mb-1.5 block">
                    Modifier si nécessaire:
                </label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger className="bg-white dark:bg-gray-800">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {documentTypes.map(type => {
                            const TypeIcon = type.icon;
                            return (
                                <SelectItem key={type.value} value={type.value}>
                                    <div className="flex items-center gap-2">
                                        <TypeIcon className={cn("w-4 h-4", type.color)} />
                                        <span>{type.label}</span>
                                        <span className="text-gray-400 text-xs ml-1">({type.description})</span>
                                    </div>
                                </SelectItem>
                            );
                        })}
                    </SelectContent>
                </Select>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
                {onSkip && (
                    <Button variant="ghost" onClick={onSkip} className="flex-1">
                        Ignorer
                    </Button>
                )}
                <Button
                    onClick={() => onConfirm(selectedType)}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirmer
                </Button>
            </div>
        </div>
    );
}
