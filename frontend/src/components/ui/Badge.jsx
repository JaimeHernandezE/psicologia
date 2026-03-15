import React from 'react'
import cn from 'classnames'
import styles from './Badge.module.scss'

const variantMap = {
  private: styles.private,
  shareable: styles.shareable,
  pending: styles.pending,
  in_progress: styles.in_progress,
  done: styles.done,
  active: styles.active,
  paused: styles.paused,
  ended: styles.ended,
}

export default function Badge({ children, variant = 'pending', className, ...rest }) {
  return (
    <span
      className={cn(styles.badge, variantMap[variant] ?? styles.pending, className)}
      {...rest}
    >
      {children}
    </span>
  )
}
