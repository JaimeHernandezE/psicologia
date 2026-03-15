import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Plus } from 'lucide-react'
import { Button, Card, Input, Textarea, Badge } from '../../components/ui'
import { useLink } from '../../hooks/useLinks'
import { useSummariesList } from '../../hooks/useSummaries'
import {
  useTasksList,
  useTaskCreate,
} from '../../hooks/useTasks'
import styles from './PatientDetailPage.module.scss'

const taskSchema = z.object({
  title: z.string().min(1, 'Título obligatorio'),
  description: z.string().optional(),
  due_date: z.string().optional(),
})

const tabs = ['Resúmenes', 'Tareas', 'Notas']

export default function TherapistPatientDetailPage() {
  const { linkId } = useParams()
  const [activeTab, setActiveTab] = useState('Resúmenes')
  const [expandedSummaryId, setExpandedSummaryId] = useState(null)
  const [notes, setNotes] = useState('')

  const { data: link, isLoading: linkLoading, error: linkError } = useLink(linkId)
  const { data: summaries = [], isLoading: summariesLoading } = useSummariesList()
  const { data: tasks = [], isLoading: tasksLoading } = useTasksList()

  const createTask = useTaskCreate()

  const linkSummaries = summaries.filter((s) => s.link === parseInt(linkId, 10))
  const linkTasks = tasks.filter((t) => t.link === parseInt(linkId, 10))

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(taskSchema),
    defaultValues: { title: '', description: '', due_date: '' },
  })

  const onCreateTask = (data) => {
    createTask.mutate(
      {
        link: parseInt(linkId, 10),
        title: data.title,
        description: data.description || '',
        due_date: data.due_date || null,
      },
      { onSuccess: () => reset() }
    )
  }

  const summaryContent = (s) =>
    (s.body_edited && s.body_edited.trim()) ? s.body_edited : (s.body_ai ?? '')

  const formatDate = (d) =>
    d ? new Date(d).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

  const patientName = link?.patient?.user?.email ?? `Paciente #${linkId}`

  if (linkLoading) return <div className={styles.loading}>Cargando…</div>
  if (linkError || !link) return <div className={styles.error}>No se encontró el paciente.</div>

  return (
    <div className="pageContent">
      <Link to="/app/therapist/patients" className={styles.back}>
        <ArrowLeft size={18} />
        Volver a Pacientes
      </Link>
      <h1 className={styles.title}>{patientName}</h1>

      <div className={styles.tabs}>
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`${styles.tab} ${activeTab === tab ? styles.active : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className={styles.panel}>
        {activeTab === 'Resúmenes' && (
          <>
            {summariesLoading ? (
              <div className={styles.loading}>Cargando resúmenes…</div>
            ) : linkSummaries.length === 0 ? (
              <p className={styles.empty}>Aún no hay resúmenes enviados por este paciente.</p>
            ) : (
              linkSummaries.map((s) => (
                <div key={s.id} className={styles.summaryItem}>
                  <div
                    className={styles.summaryMeta}
                    onClick={() =>
                      setExpandedSummaryId(expandedSummaryId === s.id ? null : s.id)
                    }
                    onKeyDown={(e) =>
                      e.key === 'Enter' &&
                      setExpandedSummaryId(expandedSummaryId === s.id ? null : s.id)
                    }
                    role="button"
                    tabIndex={0}
                  >
                    <span>Enviado: {formatDate(s.sent_at)}</span>
                    <span>{expandedSummaryId === s.id ? '▼' : '▶'}</span>
                  </div>
                  {expandedSummaryId === s.id && (
                    <div className={styles.summaryContent}>{summaryContent(s) || '—'}</div>
                  )}
                </div>
              ))
            )}
          </>
        )}

        {activeTab === 'Tareas' && (
          <>
            <div className={styles.createTaskForm}>
              <form onSubmit={handleSubmit(onCreateTask)}>
                <div className={styles.formRow}>
                  <Input
                    label="Nueva tarea"
                    {...register('title')}
                    error={errors.title?.message}
                    placeholder="Título"
                  />
                </div>
                <div className={styles.formRow}>
                  <Textarea
                    label="Descripción (opcional)"
                    {...register('description')}
                    rows={2}
                  />
                </div>
                <div className={styles.formRow}>
                  <Input
                    label="Fecha límite (opcional)"
                    type="date"
                    {...register('due_date')}
                  />
                </div>
                <div className={styles.formActions}>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={createTask.isPending}
                  >
                    <Plus size={16} />
                    Crear tarea
                  </Button>
                </div>
              </form>
            </div>
            {tasksLoading ? (
              <div className={styles.loading}>Cargando tareas…</div>
            ) : linkTasks.length === 0 ? (
              <p className={styles.empty}>No hay tareas para este paciente.</p>
            ) : (
              linkTasks.map((task) => (
                <div key={task.id} className={styles.taskItem}>
                  <div className={styles.taskHeader}>
                    <span className={styles.taskTitle}>{task.title}</span>
                    <Badge variant={task.progress?.status === 'done' ? 'done' : 'in_progress'}>
                      {task.progress?.status === 'done' ? 'Completada' : 'En progreso'}
                    </Badge>
                  </div>
                  {task.description && (
                    <p className={styles.taskProgress}>{task.description}</p>
                  )}
                  {task.progress?.note && (
                    <p className={styles.taskProgress}>
                      Nota del paciente: {task.progress.note}
                    </p>
                  )}
                  <p className={styles.taskProgress}>
                    Fecha límite: {formatDate(task.due_date)}
                  </p>
                </div>
              ))
            )}
          </>
        )}

        {activeTab === 'Notas' && (
          <>
            <p className={styles.notesPlaceholder}>
              Notas clínicas privadas (TherapistNote). Próximamente persistidas en backend.
            </p>
            <Textarea
              className={styles.notesArea}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Escribe aquí tus notas sobre este paciente…"
              rows={10}
            />
          </>
        )}
      </div>
    </div>
  )
}
