import { useQuery } from '@tanstack/react-query'
import { feelingsApi } from '../../api/feelings'
import styles from './FeelingSelector.module.scss'

/**
 * Selector de sentimientos: grid de pills clickeables, selección múltiple.
 * Props: selectedIds (array de feeling id), onChange (function(ids)).
 */
export default function FeelingSelector({ selectedIds = [], onChange }) {
  const { data: feelings = [], isLoading } = useQuery({
    queryKey: ['feelings'],
    queryFn: () => feelingsApi.list(),
  })

  if (!isLoading && (!feelings || feelings.length === 0)) {
    return null
  }

  const toggle = (id) => {
    const set = new Set(selectedIds)
    if (set.has(id)) set.delete(id)
    else set.add(id)
    onChange(Array.from(set))
  }

  return (
    <div className={styles.wrapper}>
      {isLoading ? (
        <div className={styles.grid}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <span key={i} className={styles.pillSkeleton} />
          ))}
        </div>
      ) : (
        <div className={styles.grid}>
          {feelings.map((f) => {
            const selected = selectedIds.includes(f.id)
            const color = f.color || '#8a827a'
            const bg = `${color}26` // ~15% opacity (hex)
            const border = `${color}99` // ~60% opacity
            const bgSelected = `${color}4D` // ~30% opacity
            return (
              <button
                key={f.id}
                type="button"
                className={`${styles.pill} ${selected ? styles.pillSelected : ''}`}
                style={{
                  backgroundColor: selected ? bgSelected : bg,
                  borderColor: border,
                  borderWidth: selected ? '2px' : '1px',
                }}
                onClick={() => toggle(f.id)}
              >
                {f.emoji && <span className={styles.emoji}>{f.emoji}</span>}
                <span>{f.title}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
