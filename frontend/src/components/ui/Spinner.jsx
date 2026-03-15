import React from 'react'
import cn from 'classnames'
import styles from './Spinner.module.scss'

const sizeMap = {
  sm: styles.sm,
  md: styles.md,
  lg: styles.lg,
}

const colorMap = {
  primary: styles.colorPrimary,
  white: styles.colorWhite,
}

export default function Spinner({ size = 'md', color, className, ...rest }) {
  return (
    <span
      className={cn(
        styles.spinner,
        sizeMap[size] ?? styles.md,
        color && colorMap[color],
        className
      )}
      role="status"
      aria-label="Cargando"
      {...rest}
    />
  )
}
