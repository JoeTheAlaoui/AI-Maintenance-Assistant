'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { AlertTriangle, AlertCircle, Info, Search, FileQuestion, XCircle } from 'lucide-react'

interface DiagnosticCode {
    id?: string
    code: string
    description: string
    display?: string
    possible_causes?: string[]
    corrective_actions?: string[]
    severity?: string
    reset_procedure?: string
}

interface DiagnosticsTabProps {
    diagnosticCodes?: DiagnosticCode[] | null
}

export function DiagnosticsTab({ diagnosticCodes }: DiagnosticsTabProps) {
    const [searchQuery, setSearchQuery] = useState('')

    // Filter codes by search query
    const filteredCodes = useMemo(() => {
        if (!diagnosticCodes) return []
        if (!searchQuery.trim()) return diagnosticCodes

        const query = searchQuery.toLowerCase()
        return diagnosticCodes.filter(code =>
            code.code.toLowerCase().includes(query) ||
            code.description.toLowerCase().includes(query) ||
            code.possible_causes?.some(cause => cause.toLowerCase().includes(query)) ||
            code.corrective_actions?.some(action => action.toLowerCase().includes(query))
        )
    }, [diagnosticCodes, searchQuery])

    // Group by severity
    const groupedCodes = useMemo(() => {
        const groups = {
            critical: [] as DiagnosticCode[],
            warning: [] as DiagnosticCode[],
            info: [] as DiagnosticCode[]
        }

        filteredCodes.forEach(code => {
            const severity = code.severity?.toLowerCase()
            if (severity === 'critical' || severity === 'shutdown') {
                groups.critical.push(code)
            } else if (severity === 'warning' || severity === 'alarm') {
                groups.warning.push(code)
            } else {
                groups.info.push(code)
            }
        })

        return groups
    }, [filteredCodes])

    const getSeverityIcon = (severity: 'critical' | 'warning' | 'info') => {
        switch (severity) {
            case 'critical':
                return <XCircle className="h-5 w-5 text-red-600" />
            case 'warning':
                return <AlertTriangle className="h-5 w-5 text-yellow-600" />
            case 'info':
                return <Info className="h-5 w-5 text-blue-600" />
        }
    }

    const getSeverityBadge = (code: DiagnosticCode) => {
        const severity = code.severity?.toLowerCase()
        if (severity === 'critical' || severity === 'shutdown') {
            return <Badge variant="destructive">Critique</Badge>
        }
        if (severity === 'warning' || severity === 'alarm') {
            return <Badge className="bg-yellow-500">Avertissement</Badge>
        }
        return <Badge variant="secondary">Info</Badge>
    }

    // Empty state
    if (!diagnosticCodes || diagnosticCodes.length === 0) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <FileQuestion className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                    <p className="text-lg font-medium text-muted-foreground">
                        Aucun code de diagnostic disponible
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                        Les codes diagnostics sont extraits des manuels lors de l'import IA.
                    </p>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Rechercher par code, description, cause ou action..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <Card className="border-red-200 bg-red-50">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-red-700 mb-1">
                            <XCircle className="h-4 w-4" />
                            <span className="text-sm font-medium">Alarmes critiques</span>
                        </div>
                        <p className="text-2xl font-bold text-red-700">
                            {groupedCodes.critical.length}
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-yellow-200 bg-yellow-50">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-yellow-700 mb-1">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="text-sm font-medium">Avertissements</span>
                        </div>
                        <p className="text-2xl font-bold text-yellow-700">
                            {groupedCodes.warning.length}
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-blue-700 mb-1">
                            <Info className="h-4 w-4" />
                            <span className="text-sm font-medium">Informatifs</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-700">
                            {groupedCodes.info.length}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Critical Alarms */}
            {groupedCodes.critical.length > 0 && (
                <Card className="border-red-200">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-red-700">
                            <XCircle className="h-5 w-5" />
                            Alarmes critiques ({groupedCodes.critical.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Accordion type="multiple">
                            {groupedCodes.critical.map((code, idx) => (
                                <AccordionItem key={code.id || idx} value={`critical-${idx}`} className="border-red-100">
                                    <AccordionTrigger className="hover:no-underline">
                                        <div className="flex items-center gap-3 text-left">
                                            {getSeverityIcon('critical')}
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-bold">{code.code}</span>
                                                    {getSeverityBadge(code)}
                                                </div>
                                                <p className="text-sm text-muted-foreground font-normal">{code.description}</p>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <DiagnosticDetails code={code} />
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </CardContent>
                </Card>
            )}

            {/* Warning Alarms */}
            {groupedCodes.warning.length > 0 && (
                <Card className="border-yellow-200">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-yellow-700">
                            <AlertTriangle className="h-5 w-5" />
                            Avertissements ({groupedCodes.warning.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Accordion type="multiple">
                            {groupedCodes.warning.map((code, idx) => (
                                <AccordionItem key={code.id || idx} value={`warning-${idx}`} className="border-yellow-100">
                                    <AccordionTrigger className="hover:no-underline">
                                        <div className="flex items-center gap-3 text-left">
                                            {getSeverityIcon('warning')}
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-bold">{code.code}</span>
                                                    {getSeverityBadge(code)}
                                                </div>
                                                <p className="text-sm text-muted-foreground font-normal">{code.description}</p>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <DiagnosticDetails code={code} />
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </CardContent>
                </Card>
            )}

            {/* Informational Messages */}
            {groupedCodes.info.length > 0 && (
                <Card className="border-blue-200">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-blue-700">
                            <Info className="h-5 w-5" />
                            Messages informatifs ({groupedCodes.info.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Accordion type="multiple">
                            {groupedCodes.info.map((code, idx) => (
                                <AccordionItem key={code.id || idx} value={`info-${idx}`} className="border-blue-100">
                                    <AccordionTrigger className="hover:no-underline">
                                        <div className="flex items-center gap-3 text-left">
                                            {getSeverityIcon('info')}
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-bold">{code.code}</span>
                                                    {getSeverityBadge(code)}
                                                </div>
                                                <p className="text-sm text-muted-foreground font-normal">{code.description}</p>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <DiagnosticDetails code={code} />
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </CardContent>
                </Card>
            )}

            {/* No Results */}
            {filteredCodes.length === 0 && searchQuery && (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Search className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                        <p className="text-muted-foreground">
                            Aucun code trouvé pour "{searchQuery}"
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

// Helper component for diagnostic details
function DiagnosticDetails({ code }: { code: DiagnosticCode }) {
    return (
        <div className="space-y-4 pl-8 pt-2">
            {code.display && (
                <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Affichage:</p>
                    <p className="font-mono text-sm bg-muted p-2 rounded">{code.display}</p>
                </div>
            )}

            {code.possible_causes && code.possible_causes.length > 0 && (
                <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Causes possibles:</p>
                    <ul className="list-disc list-inside space-y-1">
                        {code.possible_causes.map((cause, i) => (
                            <li key={i} className="text-sm">{cause}</li>
                        ))}
                    </ul>
                </div>
            )}

            {code.corrective_actions && code.corrective_actions.length > 0 && (
                <div>
                    <p className="text-xs font-semibold text-green-700 uppercase mb-2">Actions correctives:</p>
                    <ul className="list-disc list-inside space-y-1">
                        {code.corrective_actions.map((action, i) => (
                            <li key={i} className="text-sm text-green-800">{action}</li>
                        ))}
                    </ul>
                </div>
            )}

            {code.reset_procedure && (
                <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Procédure de réinitialisation:</p>
                    <p className="text-sm bg-muted p-2 rounded">{code.reset_procedure}</p>
                </div>
            )}
        </div>
    )
}
