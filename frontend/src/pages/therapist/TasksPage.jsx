import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTasksList } from '../../hooks/useTasks'
import { useLinksList } from '../../hooks/useLinks'
import { Card, Badge } from '../../components/ui'
import { formatDate } from '../../utils/dates'
import styles from './TasksPage.module.scss'

const statusLabel = { pending: 'Pendiente', in_progress: 'En progreso', done: 'Completada' }
const statusVariant = { pending: 'pending', in_progress: 'in_progress', done: 'done' }
const STATUS_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'done', label: 'Completada' },
]

export default function TherapistTasksPage() {
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const taskParams = useMemo(
    () => ({
      ...(searchInput.trim() && { search: searchInput.trim() }),
      ...(statusFilter && { status: statusFilter }),
    }),
    [searchInput, statusFilter]
  )
  const { data: tasks = [], isLoading, error } = useTasksList(taskParams)
  const { data: links = [] } = useLinksList()

  const linkById = {}
  links.forEach((l) => { linkById[l.id] = l })
  const patientName = (linkId) =>
    linkById[linkId]?.patient?.user?.email ?? `Paciente #${linkId}`

  if (isLoading) return <div className={styles.loading}>Cargando tareas…</div>
  if (error) return <div className={styles.error}>Error al cargar las tareas.</div>

  return (
    <div className="pageContent">
      <h1 className={styles.title}>Tareas</h1>
      <div className="searchBar filterRow" style={{ marginBottom: 16 }}>
        <input
          type="search"
          placeholder="Buscar por título"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8 }}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value || 'all'} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <div className={styles.list}>
        {tasks.length === 0 ? (
          <p className={styles.empty}>
            No hay tareas. Crea tareas desde el detalle de cada paciente.
          </p>
        ) : (
          tasks.map((task) => {
            const status = task.progress?.status ?? 'pending'
            return (
              <Card key={task.id} padding="md" className={styles.taskCard}>
                <div className={styles.taskHeader}>
                  <span className={styles.taskTitle}>{task.title}</span>
                  <Badge variant={statusVariant[status]}>{statusLabel[status]}</Badge>
                </div>
                <p className={styles.taskMeta}>
                  <Link
                    to={`/app/therapist/patients/${task.link}`}
                    className={styles.linkPatient}
                  >
                    {patientName(task.link)}
                  </Link>
                  {' · Fecha límite: '}
                  {formatDate(task.due_date)}
                </p>
                {task.description && (
                  <p className={styles.taskMeta} style={{ marginTop: 4 }}>
                    {task.description}
                  </p>
                )}
                {task.progress?.note && (
                  <p className={styles.taskMeta} style={{ marginTop: 4 }}>
                    Nota: {task.progress.note}
                  </p>
                )}
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
