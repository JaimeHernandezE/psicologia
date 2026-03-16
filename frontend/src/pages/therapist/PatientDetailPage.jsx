import { useState, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Plus, ChevronDown, ChevronRight } from 'lucide-react'
import { Button, Card, Input, Textarea, Badge } from '../../components/ui'
import { useLink } from '../../hooks/useLinks'
import { useSummariesList } from '../../hooks/useSummaries'
import {
  useTasksList,
  useTaskCreate,
} from '../../hooks/useTasks'
import { useStandardSearch, useAiSearch } from '../../hooks/useSearch'
import styles from './PatientDetailPage.module.scss'

const taskSchema = z.object({
  title: z.string().min(1, 'Título obligatorio'),
  description: z.string().optional(),
  due_date: z.string().optional(),
})

function highlightText(text, word) {
  if (!text || !word || !word.trim()) return text
  const re = new RegExp(`(${word.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(re)
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} className="highlight">{part}</span>
    ) : (
      part
    )
  )
}

const tabs = ['Resúmenes', 'Tareas', 'Notas', 'Búsqueda IA']

const SEARCH_SCOPES = [
  { value: 'all', label: 'Todo' },
  { value: 'summaries', label: 'Resúmenes' },
  { value: 'tasks', label: 'Tareas' },
]

export default function TherapistPatientDetailPage() {
  const { linkId } = useParams()
  const [activeTab, setActiveTab] = useState('Resúmenes')
  const [expandedSummaryId, setExpandedSummaryId] = useState(null)
  const [notes, setNotes] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchDateFrom, setSearchDateFrom] = useState('')
  const [searchDateTo, setSearchDateTo] = useState('')
  const [searchScope, setSearchScope] = useState('all')
  const [submittedSearch, setSubmittedSearch] = useState(null)
  const [aiQuery, setAiQuery] = useState('')
  const [sourcesOpen, setSourcesOpen] = useState(false)

  const { data: link, isLoading: linkLoading, error: linkError } = useLink(linkId)
  const { data: summaries = [], isLoading: summariesLoading } = useSummariesList()
  const { data: tasks = [], isLoading: tasksLoading } = useTasksList()

  const summarySearchParams = useMemo(
    () =>
      submittedSearch && link?.patient
        ? {
            resource: 'summaries',
            search: submittedSearch.search,
            date_from: submittedSearch.date_from || undefined,
            date_to: submittedSearch.date_to || undefined,
            patient_id: link.patient.id,
          }
        : null,
    [submittedSearch, link?.patient]
  )
  const taskSearchParams = useMemo(
    () =>
      submittedSearch
        ? {
            resource: 'tasks',
            search: submittedSearch.search,
            date_from: submittedSearch.date_from || undefined,
            date_to: submittedSearch.date_to || undefined,
            link_id: linkId,
          }
        : null,
    [submittedSearch, linkId]
  )
  const { data: summaryResults = [], isLoading: summarySearchLoading } = useStandardSearch(
    summarySearchParams,
    {
      enabled:
        !!summarySearchParams &&
        (searchScope === 'all' || searchScope === 'summaries') &&
        (!!submittedSearch?.search || !!submittedSearch?.date_from || !!submittedSearch?.date_to),
    }
  )
  const { data: taskResults = [], isLoading: taskSearchLoading } = useStandardSearch(
    taskSearchParams,
    {
      enabled:
        !!taskSearchParams &&
        (searchScope === 'all' || searchScope === 'tasks') &&
        (!!submittedSearch?.search || !!submittedSearch?.date_from || !!submittedSearch?.date_to),
    }
  )
  const aiSearchMutation = useAiSearch()

  const standardResults = useMemo(() => {
    const items = []
    if (searchScope === 'all' || searchScope === 'summaries') {
      (Array.isArray(summaryResults) ? summaryResults : []).forEach((s) => {
        const body = (s.body_edited || s.body_ai || '').slice(0, 200)
        items.push({
          type: 'Resumen',
          date: s.sent_at,
          excerpt: body + (body.length >= 200 ? '…' : ''),
        })
      })
    }
    if (searchScope === 'all' || searchScope === 'tasks') {
      (Array.isArray(taskResults) ? taskResults : []).forEach((t) => {
        const text = [t.title, t.description].filter(Boolean).join(' — ')
        items.push({
          type: 'Tarea',
          date: t.due_date || t.created_at,
          excerpt: text.slice(0, 200) + (text.length >= 200 ? '…' : ''),
        })
      })
    }
    items.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    return items
  }, [searchScope, summaryResults, taskResults])

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

  const runStandardSearch = () => {
    setSubmittedSearch({
      search: searchKeyword.trim() || undefined,
      date_from: searchDateFrom || undefined,
      date_to: searchDateTo || undefined,
    })
  }

  const handleAiConsult = () => {
    if (!aiQuery.trim() || !link?.patient) return
    aiSearchMutation.mutate({
      query: aiQuery.trim(),
      patientId: link.patient.id,
      contextType: 'patient',
    })
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

        {activeTab === 'Búsqueda IA' && (
          <>
            <section className={styles.searchSection}>
              <p className="searchSectionLabel">Búsqueda estándar</p>
              <div className="searchBar">
                <input
                  type="text"
                  placeholder="Palabra clave"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                />
                <input type="date" placeholder="Desde" value={searchDateFrom} onChange={(e) => setSearchDateFrom(e.target.value)} />
                <input type="date" placeholder="Hasta" value={searchDateTo} onChange={(e) => setSearchDateTo(e.target.value)} />
                <select
                  value={searchScope}
                  onChange={(e) => setSearchScope(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: 8 }}
                >
                  {SEARCH_SCOPES.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <Button variant="primary" size="sm" onClick={runStandardSearch}>
                  Buscar
                </Button>
              </div>
              {(summarySearchLoading || taskSearchLoading) && <p className={styles.loading}>Buscando…</p>}
              {submittedSearch && !summarySearchLoading && !taskSearchLoading && (
                <ul className="searchResults">
                  {standardResults.length === 0 ? (
                    <li className={styles.empty}>Sin resultados.</li>
                  ) : (
                    standardResults.map((r, i) => (
                      <li key={i} className="resultItem">
                        <div className="resultItemMeta">
                          <Badge variant="in_progress">{r.type}</Badge>
                          <span>{formatDate(r.date)}</span>
                        </div>
                        <div className="resultItemExcerpt">{highlightText(r.excerpt, searchKeyword)}</div>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </section>
            <div className="searchDivider" />
            <section className={styles.searchSection}>
              <p className="searchSectionLabel">Consulta contextual con IA</p>
              <Textarea
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                placeholder="Ej: ¿En qué momentos aparece el tema del trabajo? ¿Qué patrones se repiten este mes?"
                rows={4}
                className={styles.aiTextarea}
              />
              <Button
                variant="primary"
                size="md"
                onClick={handleAiConsult}
                disabled={!aiQuery.trim() || aiSearchMutation.isPending}
                loading={aiSearchMutation.isPending}
                style={{ marginTop: 8 }}
              >
                Consultar
              </Button>
              {aiSearchMutation.isError && (
                <p className={styles.error}>
                  {aiSearchMutation.error?.response?.data?.detail ?? 'Error al consultar.'}
                </p>
              )}
              {aiSearchMutation.data?.answer && (
                <div className="aiResponse">
                  {aiSearchMutation.data.answer}
                  {(aiSearchMutation.data.sources?.length ?? 0) > 0 && (
                    <div className="aiSources">
                      <button type="button" className="aiSourcesToggle" onClick={() => setSourcesOpen((o) => !o)}>
                        {sourcesOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        Fuentes
                      </button>
                      {sourcesOpen && (
                        <ul className="aiSourcesList">
                          {aiSearchMutation.data.sources.map((src, i) => (
                            <li key={i}><strong>{src.date}</strong> — {src.excerpt}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
