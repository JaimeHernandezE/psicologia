import { useState, useMemo } from 'react'
import { Card, Button, Textarea, Badge } from '../../components/ui'
import { useTasksList, useTaskProgressUpdate } from '../../hooks/useTasks'
import styles from './TasksPage.module.scss'

const statusVariant = { pending: 'pending', in_progress: 'in_progress', done: 'done' }
const statusLabel = { pending: 'Pendiente', in_progress: 'En progreso', done: 'Completada' }
const STATUS_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'done', label: 'Completada' },
]

export default function PatientTasksPage() {
  const [expandedId, setExpandedId] = useState(null)
  const [note, setNote] = useState({})
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
  const updateProgress = useTaskProgressUpdate()

  const progressMap = {}
  tasks.forEach((t) => {
    if (t.progress) progressMap[t.progress.id] = t.progress
  })

  const handleStatusChange = (task, newStatus) => {
    const prog = task.progress
    if (!prog) return
    updateProgress.mutate({
      id: prog.id,
      status: newStatus,
      note: note[task.id] ?? prog.note,
      completed_at: newStatus === 'done' ? new Date().toISOString() : null,
    })
  }

  const handleSaveNote = (task) => {
    const prog = task.progress
    if (!prog) return
    updateProgress.mutate({
      id: prog.id,
      status: prog.status,
      note: note[task.id] ?? prog.note,
    })
  }

  const formatDate = (d) => (d ? new Date(d).toLocaleDateString('es-ES', { dateStyle: 'medium' }) : '—')

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
          <p className={styles.empty}>No tienes tareas asignadas.</p>
        ) : (
          tasks.map((task) => {
            const prog = task.progress
            const status = prog?.status ?? 'pending'
            const isExpanded = expandedId === task.id
            return (
              <Card key={task.id} padding="md" className={styles.task}>
                <div
                  onClick={() => setExpandedId(isExpanded ? null : task.id)}
                  onKeyDown={(e) => e.key === 'Enter' && setExpandedId(isExpanded ? null : task.id)}
                  role="button"
                  tabIndex={0}
                >
                  <div className={styles.taskHeader}>
                    <span className={styles.taskTitle}>{task.title}</span>
                    <Badge variant={statusVariant[status]}>{statusLabel[status]}</Badge>
                  </div>
                  <p className={styles.taskMeta}>Fecha límite: {formatDate(task.due_date)}</p>
                  {task.description && (
                    <p className={styles.taskDescription}>{task.description}</p>
                  )}
                </div>
                {isExpanded && prog && (
                  <div className={styles.expanded}>
                    <label className={styles.expandedLabel}>Estado</label>
                    <select
                      value={status}
                      onChange={(e) => handleStatusChange(task, e.target.value)}
                      style={{ marginBottom: 16, padding: 8, borderRadius: 8 }}
                    >
                      <option value="pending">Pendiente</option>
                      <option value="in_progress">En progreso</option>
                      <option value="done">Completada</option>
                    </select>
                    <label className={styles.expandedLabel}>Nota</label>
                    <Textarea
                      defaultValue={prog.note}
                      onChange={(e) => setNote((n) => ({ ...n, [task.id]: e.target.value }))}
                      rows={3}
                      placeholder="Añade una nota para tu psicólogo/a"
                    />
                    <div className={styles.expandedActions}>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleSaveNote(task)}
                        disabled={updateProgress.isPending}
                      >
                        Guardar progreso
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
