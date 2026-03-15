import React from 'react'
import cn from 'classnames'
import Spinner from './Spinner'
import styles from './Button.module.scss'

const variantMap = {
  primary: styles.primary,
  secondary: styles.secondary,
  ghost: styles.ghost,
  danger: styles.danger,
}

const sizeMap = {
  sm: styles.sm,
  md: styles.md,
  lg: styles.lg,
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  type = 'button',
  className,
  ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        styles.button,
        variantMap[variant] ?? styles.primary,
        sizeMap[size] ?? styles.md,
        loading && styles.loading,
        className
      )}
      {...rest}
    >
      {loading ? <Spinner size="sm" /> : children}
    </button>
  )
}
