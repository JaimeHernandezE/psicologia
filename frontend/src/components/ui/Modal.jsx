import React, { useEffect, useRef } from 'react'
import styles from './Modal.module.scss'

function focusableSelector() {
  return 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
}

export default function Modal({ isOpen, onClose, title, children, maxWidth }) {
  const overlayRef = useRef(null)
  const contentRef = useRef(null)
  const previousActiveRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    previousActiveRef.current = document.activeElement
    const focusable = contentRef.current?.querySelectorAll(focusableSelector())
    const first = focusable?.[0]
    const last = focusable?.[focusable.length - 1]
    first?.focus()

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const focusable = contentRef.current?.querySelectorAll(focusableSelector())
      if (!focusable?.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      previousActiveRef.current?.focus?.()
    }
  }, [isOpen, onClose])

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) onClose()
  }

  if (!isOpen) return null

  return (
    <div
      ref={overlayRef}
      className={styles.overlay}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div
        ref={contentRef}
        className={styles.content}
        style={maxWidth != null ? { maxWidth: typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          {title && (
            <h2 id="modal-title" className={styles.title}>
              {title}
            </h2>
          )}
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
        <div className={styles.body}>
          {children}
        </div>
      </div>
    </div>
  )
}
