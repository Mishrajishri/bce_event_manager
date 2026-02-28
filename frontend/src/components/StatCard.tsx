import { Card, CardContent, Typography } from '@mui/material'
import { ReactNode } from 'react'

interface StatCardProps {
    title: string
    value: string | number
    icon?: ReactNode
}

/**
 * Reusable statistics card used across dashboard views.
 */
export default function StatCard({ title, value, icon }: StatCardProps) {
    return (
        <Card>
            <CardContent
                sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
                aria-label={`${title}: ${value}`}
            >
                {icon && icon}
                <div>
                    <Typography color="text.secondary" gutterBottom variant="body2">
                        {title}
                    </Typography>
                    <Typography variant="h4">{value}</Typography>
                </div>
            </CardContent>
        </Card>
    )
}
