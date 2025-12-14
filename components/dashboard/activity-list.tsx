import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Database } from '@/types/database.types'
import { formatDistanceToNow } from 'date-fns'

type WorkOrderActivity = Database['public']['Tables']['work_orders']['Row'] & {
    assets?: { name: string; code: string } | null
    profiles?: { full_name: string | null } | null
}

interface ActivityListProps {
    activities: WorkOrderActivity[]
}

export function ActivityList({ activities }: ActivityListProps) {
    const getStatusColor = (status: string | null) => {
        switch (status) {
            case 'open':
                return 'bg-primary hover:bg-primary/90'
            case 'in_progress':
                return 'bg-yellow-500 hover:bg-yellow-600'
            case 'closed':
                return 'bg-green-500 hover:bg-green-600'
            default:
                return 'bg-secondary hover:bg-secondary/80'
        }
    }

    return (
        <Card className="col-span-1">
            <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest work orders</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {activities.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No recent activity</p>
                    ) : (
                        activities.map((activity) => (
                            <div key={activity.id} className="flex items-start justify-between border-b pb-3 last:border-0">
                                <div className="space-y-1 flex-1">
                                    <p className="text-sm font-medium leading-none">
                                        {activity.assets?.name || 'Unknown Asset'}
                                    </p>
                                    <p className="text-xs text-muted-foreground line-clamp-1">
                                        {activity.description || 'No description'}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {activity.created_at
                                            ? formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })
                                            : 'Unknown time'
                                        }
                                    </p>
                                </div>
                                <Badge className={`ml-2 ${getStatusColor(activity.status)}`}>
                                    {activity.status || 'N/A'}
                                </Badge>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
