'use client'

import { useState } from 'react'
import { X, Plus, Languages } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

export interface AliasEntry {
    alias: string
    language: 'fr' | 'ar' | 'darija' | 'en'
    is_primary: boolean
}

interface AliasInputProps {
    value: AliasEntry[]
    onChange: (aliases: AliasEntry[]) => void
    suggestedAliases?: string[]
    className?: string
}

const languageLabels: Record<string, string> = {
    fr: '🇫🇷 Français',
    ar: '🇲🇦 العربية',
    darija: '🇲🇦 Darija',
    en: '🇬🇧 English',
}

export function AliasInput({ value, onChange, suggestedAliases = [], className }: AliasInputProps) {
    const [newAlias, setNewAlias] = useState('')
    const [newLanguage, setNewLanguage] = useState<'fr' | 'ar' | 'darija' | 'en'>('fr')

    const addAlias = () => {
        if (!newAlias.trim()) return

        // Check for duplicates
        const normalized = newAlias.toLowerCase().trim()
        if (value.some(a => a.alias.toLowerCase() === normalized)) {
            return
        }

        onChange([
            ...value,
            {
                alias: newAlias.trim(),
                language: newLanguage,
                is_primary: value.length === 0
            }
        ])
        setNewAlias('')
    }

    const removeAlias = (index: number) => {
        const newAliases = value.filter((_, i) => i !== index)
        // If we removed the primary, make the first one primary
        if (newAliases.length > 0 && !newAliases.some(a => a.is_primary)) {
            newAliases[0].is_primary = true
        }
        onChange(newAliases)
    }

    const setPrimary = (index: number) => {
        onChange(value.map((alias, i) => ({
            ...alias,
            is_primary: i === index
        })))
    }

    const addSuggested = (suggestion: string) => {
        if (value.some(a => a.alias.toLowerCase() === suggestion.toLowerCase())) {
            return
        }
        onChange([
            ...value,
            {
                alias: suggestion,
                language: 'fr',
                is_primary: value.length === 0
            }
        ])
    }

    return (
        <div className={cn("space-y-3", className)}>
            <Label className="flex items-center gap-2">
                <Languages className="h-4 w-4" />
                Alias / Noms alternatifs
            </Label>

            <p className="text-xs text-gray-500 dark:text-gray-400">
                Comment les opérateurs appellent cet équipement ? (ex: M1, Malaxeur 1, مالاكسور)
            </p>

            {/* Current aliases */}
            {value.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {value.map((alias, index) => (
                        <Badge
                            key={index}
                            variant={alias.is_primary ? "default" : "secondary"}
                            className="flex items-center gap-1 px-2 py-1"
                        >
                            <span className="text-xs">{alias.language === 'fr' ? '🇫🇷' : alias.language === 'ar' ? '🇲🇦' : alias.language === 'darija' ? '🗣️' : '🇬🇧'}</span>
                            {alias.alias}
                            {alias.is_primary && (
                                <span className="text-xs opacity-70">(principal)</span>
                            )}
                            {!alias.is_primary && (
                                <button
                                    onClick={() => setPrimary(index)}
                                    className="ml-1 text-xs opacity-50 hover:opacity-100"
                                    title="Définir comme principal"
                                >
                                    ★
                                </button>
                            )}
                            <button
                                onClick={() => removeAlias(index)}
                                className="ml-1 hover:text-red-500"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    ))}
                </div>
            )}

            {/* Add new alias */}
            <div className="flex gap-2">
                <div className="flex-1">
                    <Input
                        value={newAlias}
                        onChange={(e) => setNewAlias(e.target.value)}
                        placeholder="Ajouter un alias..."
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault()
                                addAlias()
                            }
                        }}
                    />
                </div>
                <Select value={newLanguage} onValueChange={(v) => setNewLanguage(v as any)}>
                    <SelectTrigger className="w-32">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="fr">🇫🇷 FR</SelectItem>
                        <SelectItem value="ar">🇲🇦 AR</SelectItem>
                        <SelectItem value="darija">🗣️ Darija</SelectItem>
                        <SelectItem value="en">🇬🇧 EN</SelectItem>
                    </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="icon" onClick={addAlias}>
                    <Plus className="h-4 w-4" />
                </Button>
            </div>

            {/* Suggested aliases */}
            {suggestedAliases.length > 0 && (
                <div className="pt-2 border-t">
                    <p className="text-xs text-gray-500 mb-2">
                        💡 Suggestions détectées:
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {suggestedAliases
                            .filter(s => !value.some(a => a.alias.toLowerCase() === s.toLowerCase()))
                            .map((suggestion, index) => (
                                <Button
                                    key={index}
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => addSuggested(suggestion)}
                                >
                                    <Plus className="h-3 w-3 mr-1" />
                                    {suggestion}
                                </Button>
                            ))}
                    </div>
                </div>
            )}
        </div>
    )
}
