import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KpiCardProps {
    title: string
    value: number
    icon: LucideIcon
    description?: string
    trend?: {
        value: number
        isPositive: boolean
    }
    href?: string
    variant?: 'default' | 'critical' | 'warning' | 'success'
}

const variantStyles = {
    default: 'border-l-primary',
    critical: 'border-l-destructive',
    warning: 'border-l-orange-500',
    success: 'border-l-green-500',
}

const iconColorStyles = {
    default: 'text-primary',
    critical: 'text-destructive',
    warning: 'text-orange-500',
    success: 'text-green-500',
}

export function KpiCard({
    title,
    value,
    icon: Icon,
    description,
    trend,
    href,
    variant = 'default'
}: KpiCardProps) {
    const cardContent = (
        <Card className={cn(
            'border-l-4 transition-all',
            variantStyles[variant],
            href && 'cursor-pointer hover:shadow-lg hover:-translate-y-0.5'
        )}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className={cn('h-4 w-4', iconColorStyles[variant])} />
            </CardHeader>
            <CardContent>
                <div className="flex items-end justify-between">
                    <div className="text-2xl font-bold">{value}</div>
                    {trend && (
                        <div className={cn(
                            'flex items-center text-xs font-medium',
                            trend.isPositive ? 'text-green-600' : 'text-red-600'
                        )}>
                            {trend.isPositive ? (
                                <TrendingUp className="h-3 w-3 mr-1" />
                            ) : (
                                <TrendingDown className="h-3 w-3 mr-1" />
                            )}
                            {Math.abs(trend.value)}%
                        </div>
                    )}
                </div>
                {description && (
                    <p className="text-xs text-muted-foreground mt-1">{description}</p>
                )}
            </CardContent>
        </Card>
    )

    if (href) {
        return <Link href={href}>{cardContent}</Link>
    }

    return cardContent
}
