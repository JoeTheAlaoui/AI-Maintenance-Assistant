'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Wind, Droplets, Thermometer, Zap, FileQuestion, Settings, List, AlertTriangle, Wrench } from 'lucide-react'

interface SubsystemComponent {
    name: string
    type?: string
    specifications?: Record<string, unknown>
}

interface AlarmCode {
    code: string
    description: string
    action?: string
    reset_condition?: string
}

interface ControlPanel {
    type?: string
    buttons?: string[]
    displays?: string[]
    indicators?: string[]
    programmable_parameters?: Array<{
        code: string
        description: string
        range?: string
        default_value?: string | number
    }>
}

interface SubsystemMaintenance {
    daily?: string[]
    weekly?: string[]
    monthly?: string[]
    yearly?: string[]
}

interface IntegratedSubsystem {
    id?: string
    name: string
    type: string
    function?: string
    components?: SubsystemComponent[]
    alarm_codes?: AlarmCode[]
    control_panel?: ControlPanel
    maintenance?: SubsystemMaintenance
}

interface SubsystemsTabProps {
    subsystems?: IntegratedSubsystem[] | null
}

export function SubsystemsTab({ subsystems }: SubsystemsTabProps) {

    const getSubsystemIcon = (type: string) => {
        switch (type.toLowerCase()) {
            case 'dryer':
            case 'sécheur':
                return <Droplets className="h-6 w-6" />
            case 'cooling':
            case 'refroidissement':
                return <Thermometer className="h-6 w-6" />
            case 'filtration':
            case 'filtre':
                return <Wind className="h-6 w-6" />
            case 'control':
            case 'contrôle':
                return <Zap className="h-6 w-6" />
            default:
                return <Settings className="h-6 w-6" />
        }
    }

    // Empty state
    if (!subsystems || subsystems.length === 0) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <FileQuestion className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                    <p className="text-lg font-medium text-muted-foreground">
                        Aucun sous-système disponible
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                        Les sous-systèmes sont extraits des manuels lors de l'import IA.
                    </p>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Sous-systèmes intégrés
                    </CardTitle>
                    <CardDescription>
                        {subsystems.length} sous-système{subsystems.length !== 1 ? 's' : ''} détecté{subsystems.length !== 1 ? 's' : ''}
                    </CardDescription>
                </CardHeader>
            </Card>

            <Accordion type="multiple" className="space-y-4">
                {subsystems.map((subsystem, index) => (
                    <Card key={subsystem.id || index}>
                        <AccordionItem value={`subsystem-${index}`} className="border-0">
                            <AccordionTrigger className="px-6 py-4 hover:no-underline">
                                <div className="flex items-center gap-4 text-left w-full">
                                    <div className="p-3 rounded-lg bg-primary/10 text-primary">
                                        {getSubsystemIcon(subsystem.type)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-semibold text-lg">{subsystem.name}</span>
                                            <Badge variant="outline">{subsystem.type}</Badge>
                                        </div>
                                        {subsystem.function && (
                                            <p className="text-sm text-muted-foreground">{subsystem.function}</p>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        {subsystem.components && subsystem.components.length > 0 && (
                                            <Badge variant="secondary">
                                                {subsystem.components.length} composant{subsystem.components.length > 1 ? 's' : ''}
                                            </Badge>
                                        )}
                                        {subsystem.alarm_codes && subsystem.alarm_codes.length > 0 && (
                                            <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                                                {subsystem.alarm_codes.length} alarme{subsystem.alarm_codes.length > 1 ? 's' : ''}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-6 pb-6">
                                <Tabs defaultValue="components" className="w-full">
                                    <TabsList className="mb-4">
                                        {subsystem.components && subsystem.components.length > 0 && (
                                            <TabsTrigger value="components" className="flex items-center gap-1">
                                                <List className="h-4 w-4" />
                                                Composants
                                            </TabsTrigger>
                                        )}
                                        {subsystem.control_panel && (
                                            <TabsTrigger value="control" className="flex items-center gap-1">
                                                <Zap className="h-4 w-4" />
                                                Panneau
                                            </TabsTrigger>
                                        )}
                                        {subsystem.alarm_codes && subsystem.alarm_codes.length > 0 && (
                                            <TabsTrigger value="alarms" className="flex items-center gap-1">
                                                <AlertTriangle className="h-4 w-4" />
                                                Alarmes
                                            </TabsTrigger>
                                        )}
                                        {subsystem.maintenance && (
                                            <TabsTrigger value="maintenance" className="flex items-center gap-1">
                                                <Wrench className="h-4 w-4" />
                                                Maintenance
                                            </TabsTrigger>
                                        )}
                                    </TabsList>

                                    {/* Components Tab */}
                                    {subsystem.components && subsystem.components.length > 0 && (
                                        <TabsContent value="components">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Nom</TableHead>
                                                        <TableHead>Type</TableHead>
                                                        <TableHead>Spécifications</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {subsystem.components.map((component, idx) => (
                                                        <TableRow key={idx}>
                                                            <TableCell className="font-medium">{component.name}</TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline">{component.type || 'N/A'}</Badge>
                                                            </TableCell>
                                                            <TableCell className="text-sm text-muted-foreground">
                                                                {component.specifications
                                                                    ? Object.entries(component.specifications)
                                                                        .slice(0, 3)
                                                                        .map(([k, v]) => `${k}: ${v}`)
                                                                        .join(', ')
                                                                    : '-'
                                                                }
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TabsContent>
                                    )}

                                    {/* Control Panel Tab */}
                                    {subsystem.control_panel && (
                                        <TabsContent value="control">
                                            <div className="space-y-6">
                                                {subsystem.control_panel.type && (
                                                    <div>
                                                        <p className="text-sm font-semibold text-muted-foreground uppercase mb-1">Type</p>
                                                        <p>{subsystem.control_panel.type}</p>
                                                    </div>
                                                )}

                                                {subsystem.control_panel.buttons && subsystem.control_panel.buttons.length > 0 && (
                                                    <div>
                                                        <p className="text-sm font-semibold text-muted-foreground uppercase mb-2">Boutons</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {subsystem.control_panel.buttons.map((button, idx) => (
                                                                <Badge key={idx} variant="secondary">{button}</Badge>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {subsystem.control_panel.displays && subsystem.control_panel.displays.length > 0 && (
                                                    <div>
                                                        <p className="text-sm font-semibold text-muted-foreground uppercase mb-2">Affichages</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {subsystem.control_panel.displays.map((display, idx) => (
                                                                <Badge key={idx} variant="outline">{display}</Badge>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {subsystem.control_panel.indicators && subsystem.control_panel.indicators.length > 0 && (
                                                    <div>
                                                        <p className="text-sm font-semibold text-muted-foreground uppercase mb-2">Indicateurs</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {subsystem.control_panel.indicators.map((indicator, idx) => (
                                                                <Badge key={idx} className="bg-green-100 text-green-800">{indicator}</Badge>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {subsystem.control_panel.programmable_parameters &&
                                                    subsystem.control_panel.programmable_parameters.length > 0 && (
                                                        <div>
                                                            <p className="text-sm font-semibold text-muted-foreground uppercase mb-2">Paramètres programmables</p>
                                                            <Table>
                                                                <TableHeader>
                                                                    <TableRow>
                                                                        <TableHead>Code</TableHead>
                                                                        <TableHead>Description</TableHead>
                                                                        <TableHead>Plage</TableHead>
                                                                        <TableHead>Défaut</TableHead>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {subsystem.control_panel.programmable_parameters.map((param, idx) => (
                                                                        <TableRow key={idx}>
                                                                            <TableCell className="font-mono font-bold">{param.code}</TableCell>
                                                                            <TableCell>{param.description}</TableCell>
                                                                            <TableCell className="text-muted-foreground">{param.range || '-'}</TableCell>
                                                                            <TableCell>{param.default_value ?? '-'}</TableCell>
                                                                        </TableRow>
                                                                    ))}
                                                                </TableBody>
                                                            </Table>
                                                        </div>
                                                    )}
                                            </div>
                                        </TabsContent>
                                    )}

                                    {/* Alarm Codes Tab */}
                                    {subsystem.alarm_codes && subsystem.alarm_codes.length > 0 && (
                                        <TabsContent value="alarms">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Code</TableHead>
                                                        <TableHead>Description</TableHead>
                                                        <TableHead>Action</TableHead>
                                                        <TableHead>Réinit.</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {subsystem.alarm_codes.map((alarm, idx) => (
                                                        <TableRow key={idx}>
                                                            <TableCell className="font-mono font-bold">{alarm.code}</TableCell>
                                                            <TableCell>{alarm.description}</TableCell>
                                                            <TableCell className="text-sm">{alarm.action || '-'}</TableCell>
                                                            <TableCell className="text-sm text-muted-foreground">
                                                                {alarm.reset_condition || '-'}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TabsContent>
                                    )}

                                    {/* Maintenance Tab */}
                                    {subsystem.maintenance && (
                                        <TabsContent value="maintenance">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {subsystem.maintenance.daily && subsystem.maintenance.daily.length > 0 && (
                                                    <Card>
                                                        <CardHeader className="pb-2">
                                                            <CardTitle className="text-sm">Quotidien</CardTitle>
                                                        </CardHeader>
                                                        <CardContent>
                                                            <ul className="list-disc list-inside space-y-1 text-sm">
                                                                {subsystem.maintenance.daily.map((task, idx) => (
                                                                    <li key={idx}>{task}</li>
                                                                ))}
                                                            </ul>
                                                        </CardContent>
                                                    </Card>
                                                )}
                                                {subsystem.maintenance.weekly && subsystem.maintenance.weekly.length > 0 && (
                                                    <Card>
                                                        <CardHeader className="pb-2">
                                                            <CardTitle className="text-sm">Hebdomadaire</CardTitle>
                                                        </CardHeader>
                                                        <CardContent>
                                                            <ul className="list-disc list-inside space-y-1 text-sm">
                                                                {subsystem.maintenance.weekly.map((task, idx) => (
                                                                    <li key={idx}>{task}</li>
                                                                ))}
                                                            </ul>
                                                        </CardContent>
                                                    </Card>
                                                )}
                                                {subsystem.maintenance.monthly && subsystem.maintenance.monthly.length > 0 && (
                                                    <Card>
                                                        <CardHeader className="pb-2">
                                                            <CardTitle className="text-sm">Mensuel</CardTitle>
                                                        </CardHeader>
                                                        <CardContent>
                                                            <ul className="list-disc list-inside space-y-1 text-sm">
                                                                {subsystem.maintenance.monthly.map((task, idx) => (
                                                                    <li key={idx}>{task}</li>
                                                                ))}
                                                            </ul>
                                                        </CardContent>
                                                    </Card>
                                                )}
                                                {subsystem.maintenance.yearly && subsystem.maintenance.yearly.length > 0 && (
                                                    <Card>
                                                        <CardHeader className="pb-2">
                                                            <CardTitle className="text-sm">Annuel</CardTitle>
                                                        </CardHeader>
                                                        <CardContent>
                                                            <ul className="list-disc list-inside space-y-1 text-sm">
                                                                {subsystem.maintenance.yearly.map((task, idx) => (
                                                                    <li key={idx}>{task}</li>
                                                                ))}
                                                            </ul>
                                                        </CardContent>
                                                    </Card>
                                                )}
                                            </div>
                                        </TabsContent>
                                    )}
                                </Tabs>
                            </AccordionContent>
                        </AccordionItem>
                    </Card>
                ))}
            </Accordion>
        </div>
    )
}
