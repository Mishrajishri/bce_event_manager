import React from 'react';
import { Chip, Tooltip, Box, Typography } from '@mui/material';
import { AccessTime, CheckCircle, Cancel, Schedule } from '@mui/icons-material';

export type WaitlistStatus = 'confirmed' | 'waitlisted' | 'cancelled' | 'pending';

interface WaitlistBadgeProps {
    status: WaitlistStatus;
    position?: number;
    totalWaitlist?: number;
    waitTimeHours?: number;
    showDetails?: boolean;
}

/**
 * WaitlistBadge Component
 * 
 * Displays registration status with visual indicators for:
 * - Confirmed registrations (green checkmark)
 * - Waitlisted users (orange clock with position)
 * - Cancelled registrations (grey X)
 * - Pending registrations (blue schedule icon)
 */
export const WaitlistBadge: React.FC<WaitlistBadgeProps> = ({
    status,
    position,
    totalWaitlist,
    waitTimeHours,
    showDetails = false
}) => {
    // Confirmed status
    if (status === 'confirmed') {
        return (
            <Tooltip title="Registration confirmed">
                <Chip
                    icon={<CheckCircle />}
                    label="Confirmed"
                    color="success"
                    size="small"
                    sx={{ fontWeight: 500 }}
                />
            </Tooltip>
        );
    }

    // Waitlisted status
    if (status === 'waitlisted') {
        const tooltipText = totalWaitlist
            ? `You're #${position} of ${totalWaitlist} on the waitlist`
            : `You're #${position} on the waitlist`;

        return (
            <Box>
                <Tooltip title={tooltipText}>
                    <Chip
                        icon={<AccessTime />}
                        label={`Waitlist #${position}`}
                        color="warning"
                        size="small"
                        sx={{ fontWeight: 500 }}
                    />
                </Tooltip>

                {showDetails && (
                    <Box sx={{ mt: 0.5, ml: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                            {waitTimeHours !== undefined && (
                                <>Waiting for {Math.round(waitTimeHours)} hours</>
                            )}
                            {totalWaitlist && position && (
                                <>
                                    <br />
                                    Estimated: {Math.ceil((totalWaitlist - position) * 0.5)} days
                                </>
                            )}
                        </Typography>
                    </Box>
                )}
            </Box>
        );
    }

    // Cancelled status
    if (status === 'cancelled') {
        return (
            <Tooltip title="Registration cancelled">
                <Chip
                    icon={<Cancel />}
                    label="Cancelled"
                    color="default"
                    size="small"
                    sx={{ fontWeight: 500 }}
                />
            </Tooltip>
        );
    }

    // Pending status (default)
    return (
        <Tooltip title="Registration pending confirmation">
            <Chip
                icon={<Schedule />}
                label="Pending"
                color="info"
                size="small"
                sx={{ fontWeight: 500 }}
            />
        </Tooltip>
    );
};

interface WaitlistPositionCardProps {
    position: number;
    totalOnWaitlist: number;
    waitTimeHours: number;
    eventName: string;
}

/**
 * WaitlistPositionCard
 * 
 * Detailed card showing user's waitlist status with:
 * - Current position
 * - Total people waiting
 * - Time spent on waitlist
 * - Encouraging message
 */
export const WaitlistPositionCard: React.FC<WaitlistPositionCardProps> = ({
    position,
    totalOnWaitlist,
    waitTimeHours,
    eventName
}) => {
    const progress = ((totalOnWaitlist - position + 1) / totalOnWaitlist) * 100;

    return (
        <Box
            sx={{
                p: 2,
                bgcolor: 'background.paper',
                borderRadius: 2,
                border: 1,
                borderColor: 'divider'
            }}
        >
            <Typography variant="h6" gutterBottom>
                You're on the waitlist
            </Typography>

            <Typography variant="body2" color="text.secondary" gutterBottom>
                for <strong>{eventName}</strong>
            </Typography>

            <Box sx={{ mt: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                        Position
                    </Typography>
                    <Typography variant="h4" color="warning.main" fontWeight="bold">
                        #{position}
                    </Typography>
                </Box>

                {/* Progress bar showing position in queue */}
                <Box
                    sx={{
                        width: '100%',
                        height: 8,
                        bgcolor: 'grey.200',
                        borderRadius: 4,
                        overflow: 'hidden'
                    }}
                >
                    <Box
                        sx={{
                            width: `${progress}%`,
                            height: '100%',
                            bgcolor: 'warning.main',
                            borderRadius: 4,
                            transition: 'width 0.5s ease'
                        }}
                    />
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                        {totalOnWaitlist} people waiting
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {Math.round(waitTimeHours)}h waiting
                    </Typography>
                </Box>
            </Box>

            <Typography variant="caption" color="text.secondary">
                {position === 1
                    ? "You're first in line! You'll be notified when a spot opens up."
                    : `You'll be automatically promoted when spots open up. Stay tuned!`
                }
            </Typography>
        </Box>
    );
};

export default WaitlistBadge;
