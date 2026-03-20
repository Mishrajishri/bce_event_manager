import { Button as MuiButton, ButtonProps as MuiButtonProps, CircularProgress } from '@mui/material'
import { ReactNode } from 'react'

// Button variant types
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost' | 'outline'
export type ButtonSize = 'small' | 'medium' | 'large'

// Extended button props
export interface ButtonProps extends Omit<MuiButtonProps, 'variant' | 'size'> {
    variant?: ButtonVariant
    size?: ButtonSize
    isLoading?: boolean
    leftIcon?: ReactNode
    rightIcon?: ReactNode
}

// Color scheme for each variant
interface ButtonColorScheme {
    main: string
    light: string
    text: string
}

// Color mappings for variants
const variantColors: Record<ButtonVariant, ButtonColorScheme> = {
    primary: { main: '#4353EB', light: '#6366F1', text: '#fff' },
    secondary: { main: '#64748B', light: '#94A3B8', text: '#64748B' },
    danger: { main: '#EF4444', light: '#F87171', text: '#fff' },
    success: { main: '#10B981', light: '#34D399', text: '#fff' },
    ghost: { main: 'transparent', light: 'rgba(0,0,0,0.04)', text: 'inherit' },
    outline: { main: 'transparent', light: 'rgba(67, 83, 235, 0.08)', text: '#4353EB' },
}

// Size mappings
const sizeMappings: Record<ButtonSize, { padding: string; fontSize: string }> = {
    small: { padding: '6px 16px', fontSize: '0.8125rem' },
    medium: { padding: '10px 24px', fontSize: '0.875rem' },
    large: { padding: '14px 32px', fontSize: '1rem' },
}

export function Button({
    variant = 'primary',
    size = 'medium',
    isLoading = false,
    leftIcon,
    rightIcon,
    children,
    disabled,
    ...props
}: ButtonProps) {
    const colors = variantColors[variant]
    const sizeStyle = sizeMappings[size]

    // Determine base MUI variant
    const muiVariant: MuiButtonProps['variant'] =
        variant === 'ghost' ? 'text' : variant === 'outline' ? 'outlined' : 'contained'

    // Get variant styles
    const variantStyles = getVariantStyles(variant, colors)

    return (
        <MuiButton
            variant={muiVariant}
            disabled={disabled || isLoading}
            sx={{
                borderRadius: 2,
                textTransform: 'none' as const,
                fontWeight: 600,
                transition: 'all 0.2s ease-in-out',
                padding: sizeStyle.padding,
                fontSize: sizeStyle.fontSize,
                ...variantStyles,
                '&:hover': {
                    transform: 'translateY(-2px)',
                    ...(variant === 'ghost'
                        ? { backgroundColor: colors.light }
                        : variant === 'outline'
                            ? { borderColor: colors.main, backgroundColor: colors.light }
                            : { backgroundColor: colors.light }
                    ),
                },
                '&:active': {
                    transform: 'translateY(0)',
                },
                '&:disabled': {
                    opacity: 0.6,
                    transform: 'none',
                },
            }}
            {...props}
        >
            {isLoading ? (
                <CircularProgress size={size === 'small' ? 18 : size === 'large' ? 28 : 24} color="inherit" />
            ) : (
                <>
                    {leftIcon && <span style={{ marginRight: 8 }}>{leftIcon}</span>}
                    {children}
                    {rightIcon && <span style={{ marginLeft: 8 }}>{rightIcon}</span>}
                </>
            )}
        </MuiButton>
    )
}

function getVariantStyles(variant: ButtonVariant, colors: ButtonColorScheme): Record<string, unknown> {
    switch (variant) {
        case 'primary':
            return {
                backgroundColor: colors.main,
                color: colors.text,
                '&:hover': { backgroundColor: colors.light },
            }
        case 'danger':
            return {
                backgroundColor: colors.main,
                color: colors.text,
                '&:hover': { backgroundColor: colors.light },
            }
        case 'success':
            return {
                backgroundColor: colors.main,
                color: colors.text,
                '&:hover': { backgroundColor: colors.light },
            }
        case 'secondary':
            return {
                backgroundColor: 'transparent',
                border: '2px solid',
                borderColor: colors.main,
                color: colors.text,
                '&:hover': {
                    borderColor: colors.main,
                    backgroundColor: colors.light,
                },
            }
        case 'outline':
            return {
                backgroundColor: 'transparent',
                border: '2px solid #e2e8f0',
                color: '#1e293b',
                '&:hover': {
                    borderColor: colors.main,
                    backgroundColor: '#f1f5f9',
                },
            }
        case 'ghost':
            return {
                backgroundColor: 'transparent',
                border: 'none',
                boxShadow: 'none',
                color: colors.text,
                '&:hover': {
                    backgroundColor: colors.light,
                    boxShadow: 'none',
                },
            }
        default:
            return {}
    }
}

// Convenience components for common use cases
export const PrimaryButton = (buttonProps: ButtonProps) => <Button variant="primary" {...buttonProps} />
export const SecondaryButton = (buttonProps: ButtonProps) => <Button variant="secondary" {...buttonProps} />
export const DangerButton = (buttonProps: ButtonProps) => <Button variant="danger" {...buttonProps} />
export const SuccessButton = (buttonProps: ButtonProps) => <Button variant="success" {...buttonProps} />
export const GhostButton = (buttonProps: ButtonProps) => <Button variant="ghost" {...buttonProps} />
export const OutlineButton = (buttonProps: ButtonProps) => <Button variant="outline" {...buttonProps} />
