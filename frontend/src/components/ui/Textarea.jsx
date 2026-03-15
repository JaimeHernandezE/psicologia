import React, { forwardRef, useRef, useEffect } from 'react'
import cn from 'classnames'
import styles from './Textarea.module.scss'

function setRef(ref, el) {
  if (!ref) return
  if (typeof ref === 'function') ref(el)
  else ref.current = el
}

const Textarea = forwardRef(function Textarea({
  label,
  error,
  hint,
  autoResize = false,
  maxLength,
  id,
  className,
  value,
  ...rest
}, ref) {
  const inputId = id ?? `textarea-${Math.random().toString(36).slice(2)}`
  const internalRef = useRef(null)
  const textareaRef = (el) => {
    internalRef.current = el
    setRef(ref, el)
  }

  useEffect(() => {
    if (!autoResize || !internalRef.current) return
    internalRef.current.style.height = 'auto'
    internalRef.current.style.height = `${internalRef.current.scrollHeight}px`
  }, [autoResize, value])

  const length = value != null ? String(value).length : (rest.defaultValue != null ? String(rest.defaultValue).length : 0)
  const showCount = maxLength != null

  return (
    <div className={cn(styles.wrapper, error && styles.error, className)}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}
      <textarea
        ref={textareaRef}
        id={inputId}
        className={styles.textarea}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        maxLength={maxLength}
        value={value}
        {...rest}
      />
      {error && (
        <p id={`${inputId}-error`} className={styles.errorMessage} role="alert">
          {error}
        </p>
      )}
      {(hint || showCount) && !error && (
        <div className={styles.footer}>
          {hint && <span id={`${inputId}-hint`} className={styles.hint}>{hint}</span>}
          {showCount && (
            <span className={styles.charCount} aria-live="polite">
              {length} / {maxLength}
            </span>
          )}
        </div>
      )}
    </div>
  )
})

Textarea.displayName = 'Textarea'

export default Textarea
