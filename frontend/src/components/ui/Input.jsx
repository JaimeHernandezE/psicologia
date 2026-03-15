import React, { forwardRef } from 'react'
import cn from 'classnames'
import styles from './Input.module.scss'

const Input = forwardRef(function Input({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  id,
  className,
  ...rest
}, ref) {
  const inputId = id ?? `input-${Math.random().toString(36).slice(2)}`
  return (
    <div className={cn(styles.wrapper, error && styles.error, className)}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}
      <div className={styles.inputWrapper}>
        {leftIcon && <span className={styles.leftIcon} aria-hidden>{leftIcon}</span>}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            styles.input,
            leftIcon && styles.hasLeftIcon,
            rightIcon && styles.hasRightIcon
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...rest}
        />
        {rightIcon && <span className={styles.rightIcon} aria-hidden>{rightIcon}</span>}
      </div>
      {error && (
        <p id={`${inputId}-error`} className={styles.errorMessage} role="alert">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={`${inputId}-hint`} className={styles.hint}>
          {hint}
        </p>
      )}
    </div>
  )
})

Input.displayName = 'Input'

export default Input
