import React from 'react'
import cn from 'classnames'
import styles from './Card.module.scss'

const paddingMap = {
  sm: styles.paddingSm,
  md: styles.paddingMd,
  lg: styles.paddingLg,
}

export default function Card({
  children,
  padding = 'md',
  clickable = false,
  as: Component = 'div',
  className,
  ...rest
}) {
  return (
    <Component
      className={cn(
        styles.card,
        paddingMap[padding] ?? styles.paddingMd,
        clickable && styles.clickable,
        className
      )}
      {...rest}
    >
      {children}
    </Component>
  )
}
