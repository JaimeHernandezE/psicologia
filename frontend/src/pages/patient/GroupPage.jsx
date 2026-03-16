import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Plus } from 'lucide-react'
import { Button, Card, Modal, Textarea, Badge, Spinner } from '../../components/ui'
import { usePatientGroups } from '../../hooks/useGroups'
import { useJournalList, useJournalCreate, useJournalUpdate } from '../../hooks/useJournal'
import { useTasksList, useTaskProgressUpdate } from '../../hooks/useTasks'
import { useLinksList } from '../../hooks/useLinks'
import {
  useSummariesList,
  useSummaryGenerate,
  useSummaryUpdate,
  useSummarySend,
} from '../../hooks/useSummaries'
import styles from './GroupPage.module.scss'

const journalSchema = z.object({
  body: z.string().min(1, 'Escribe algo'),
  visibility: z.enum(['private', 'shareable']),
})

const TABS = ['Notas', 'Tareas', 'Resumen']
const statusVariant = { pending: 'pending', in_progress: 'in_progress', done: 'done' }
const statusLabel = { pending: 'Pendiente', in_progress: 'En progreso', done: 'Completada' }
const SEND_UNDO_SECONDS = 15

export default function PatientGroupPage() {
  const { id } = useParams()
  const groupId = id ? parseInt(id, 10) : null
  const [activeTab, setActiveTab] = useState('Notas')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [expandedTaskId, setExpandedTaskId] = useState(null)
  const [note, setNote] = useState({})
  const [selectedIds, setSelectedIds] = useState([])
  const [lastGeneratedId, setLastGeneratedId] = useState(null)
  const [editedContent, setEditedContent] = useState('')
  const [sendCountdown, setSendCountdown] = useState(null)

  const { data: groups = [], isLoading: groupsLoading } = usePatientGroups()
  const group = groups.find((g) => g.id === groupId)

  const { data: entries = [], isLoading: entriesLoading } = useJournalList(
    groupId ? { group_id: groupId } : {}
  )
  const { data: tasks = [], isLoading: tasksLoading } = useTasksList(
    groupId ? { scope: 'group' } : {}
  )
  const { data: links = [] } = useLinksList()
  const { data: summaries = [] } = useSummariesList()

  const groupTasks = (tasks || []).filter((t) => t.group === groupId)
  const shareableEntries = entries.filter((e) => e.visibility === 'shareable')
  const activeLink = links.find((l) => l.status === 'active')
  const sentSummaries = summaries.filter((s) => s.is_sent || s.sent_at)
  const lastSummary = lastGeneratedId
    ? summaries.find((s) => s.id === lastGeneratedId)
    : summaries.find((s) => !s.is_sent)
  const summaryContent = (s) =>
    (s?.body_edited && s.body_edited.trim() !== '') ? s.body_edited : (s?.body_ai ?? '')

  const createEntry = useJournalCreate()
  const updateEntry = useJournalUpdate()
  const updateProgress = useTaskProgressUpdate()
  const generateMutation = useSummaryGenerate()
  const updateMutation = useSummaryUpdate()
  const sendMutation = useSummarySend()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(journalSchema),
    defaultValues: { body: '', visibility: 'private' },
  })

  useEffect(() => {
    if (!lastSummary) return
    setEditedContent(
      (lastSummary.body_edited && lastSummary.body_edited.trim())
        ? lastSummary.body_edited
        : (lastSummary.body_ai ?? '')
    )
  }, [lastSummary?.id, lastSummary?.body_ai, lastSummary?.body_edited])

  useEffect(() => {
    if (sendCountdown === null || sendCountdown <= 0) return
    const t = setTimeout(() => setSendCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [sendCountdown])

  const openCreate = () => {
    setEditingId(null)
    reset({ body: '', visibility: 'private' })
    setModalOpen(true)
  }

  const openEdit = (entry) => {
    setEditingId(entry.id)
    reset({ body: entry.body, visibility: entry.visibility })
    setModalOpen(true)
  }

  const onSaveEntry = (data) => {
    if (editingId) {
      updateEntry.mutate(
        { id: editingId, body: data.body, visibility: data.visibility },
        { onSuccess: () => setModalOpen(false) }
      )
    } else {
      createEntry.mutate(
        { body: data.body, visibility: data.visibility, group: groupId },
        { onSuccess: () => setModalOpen(false) }
      )
    }
  }

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

  const toggleEntry = (eid) => {
    setSelectedIds((prev) =>
      prev.includes(eid) ? prev.filter((x) => x !== eid) : [...prev, eid]
    )
  }

  const handleGenerate = () => {
    if (!activeLink?.id || selectedIds.length === 0) return
    generateMutation.mutate(
      { linkId: activeLink.id, journalEntryIds: selectedIds },
      {
        onSuccess: (data) => {
          setLastGeneratedId(data?.id ?? null)
          setEditedContent(
            (data?.body_edited && data.body_edited.trim()) ? data.body_edited : (data?.body_ai ?? '')
          )
        },
      }
    )
  }

  const handleSaveEdit = () => {
    if (!lastSummary?.id) return
    updateMutation.mutate(
      { id: lastSummary.id, body_edited: editedContent },
      { onSuccess: () => setLastGeneratedId(lastSummary.id) }
    )
  }

  const handleSend = () => {
    if (!lastSummary?.id) return
    sendMutation.mutate(lastSummary.id, {
      onSuccess: () => {
        setSendCountdown(SEND_UNDO_SECONDS)
        setLastGeneratedId(null)
      },
    })
  }

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('es-ES', { dateStyle: 'medium' }) : '—'
  const formatDateLong = (d) =>
    d ? new Date(d).toLocaleDateString('es-ES', { dateStyle: 'long' }) : '—'
  const formatSentDate = (d) =>
    d ? new Date(d).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

  const memberNames = (group?.members || [])
    .map((m) => m.patient?.user?.email ?? m.patient?.user?.first_name ?? `#${m.patient}`)
    .filter(Boolean)
  const membersText = memberNames.length > 0 ? memberNames.join(', ') : '—'

  if (groupsLoading || !groupId) {
    return <div className={styles.loading}>Cargando…</div>
  }
  if (!group) {
    return (
      <div className={styles.error}>
        No tienes acceso a este grupo. <Link to="/app/patient">Volver al inicio</Link>
      </div>
    )
  }

  return (
    <div className="pageContent">
      <Link to="/app/patient" className={styles.back}>
        <ArrowLeft size={18} />
        Volver al inicio
      </Link>
      <header className={styles.header}>
        <h1 className={styles.title}>{group.name}</h1>
        <p className={styles.members}>Miembros: {membersText}</p>
      </header>

      <div className={styles.tabs}>
        {TABS.map((tab) => (
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
        {activeTab === 'Notas' && (
          <>
            <div className={styles.sectionTitle}>Notas del grupo</div>
            <Button variant="primary" size="md" onClick={openCreate} style={{ marginBottom: 16 }}>
              <Plus size={18} />
              Nueva entrada
            </Button>
            {entriesLoading ? (
              <div className={styles.loading}>Cargando entradas…</div>
            ) : entries.length === 0 ? (
              <p className={styles.empty}>Aún no hay entradas en este grupo.</p>
            ) : (
              <div className={styles.list}>
                {entries.map((entry) => (
                  <Card
                    key={entry.id}
                    padding="md"
                    clickable
                    onClick={() => openEdit(entry)}
                    className={styles.task}
                  >
                    <div className={styles.entryMeta}>
                      <time>{formatDateLong(entry.created_at)}</time>
                      <Badge variant={entry.visibility === 'shareable' ? 'shareable' : 'private'}>
                        {entry.visibility === 'shareable' ? 'Compartible' : 'Privada'}
                      </Badge>
                    </div>
                    <p className={styles.entryBody}>
                      {entry.body.length > 100 ? `${entry.body.slice(0, 100)}…` : entry.body}
                    </p>
                  </Card>
                ))}
              </div>
            )}
            <Modal
              isOpen={modalOpen}
              onClose={() => setModalOpen(false)}
              title={editingId ? 'Editar entrada' : 'Nueva entrada'}
            >
              <form onSubmit={handleSubmit(onSaveEntry)}>
                <div className={styles.formRow}>
                  <Textarea
                    label="¿Qué quieres contar?"
                    {...register('body')}
                    error={errors.body?.message}
                    rows={6}
                    autoResize
                  />
                </div>
                <div className={styles.visibilityRow}>
                  <span className={styles.visibilityLabel}>Visibilidad:</span>
                  <label>
                    <input type="radio" value="private" {...register('visibility')} />
                    {' '}Privada
                  </label>
                  <label>
                    <input type="radio" value="shareable" {...register('visibility')} />
                    {' '}Compartible
                  </label>
                </div>
                <div className={styles.modalActions}>
                  <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={createEntry.isPending || updateEntry.isPending}
                    loading={createEntry.isPending || updateEntry.isPending}
                  >
                    Guardar
                  </Button>
                </div>
              </form>
            </Modal>
          </>
        )}

        {activeTab === 'Tareas' && (
          <>
            <div className={styles.sectionTitle}>Tareas del grupo</div>
            {tasksLoading ? (
              <div className={styles.loading}>Cargando tareas…</div>
            ) : groupTasks.length === 0 ? (
              <p className={styles.empty}>No hay tareas en este grupo.</p>
            ) : (
              <div className={styles.list}>
                {groupTasks.map((task) => {
                  const prog = task.progress
                  const status = prog?.status ?? 'pending'
                  const isExpanded = expandedTaskId === task.id
                  return (
                    <Card key={task.id} padding="md" className={styles.task}>
                      <div
                        onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                        onKeyDown={(e) =>
                          e.key === 'Enter' && setExpandedTaskId(isExpanded ? null : task.id)
                        }
                        role="button"
                        tabIndex={0}
                      >
                        <div className={styles.taskHeader}>
                          <span className={styles.taskTitle}>{task.title}</span>
                          <Badge variant={statusVariant[status]}>{statusLabel[status]}</Badge>
                        </div>
                        <p className={styles.taskMeta}>Fecha límite: {formatDate(task.due_date)}</p>
                        {task.description && (
                          <p className={styles.entryBody}>{task.description}</p>
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
                            onChange={(e) =>
                              setNote((n) => ({ ...n, [task.id]: e.target.value }))
                            }
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
                })}
              </div>
            )}
          </>
        )}

        {activeTab === 'Resumen' && (
          <>
            <div className={styles.sectionTitle}>Resumen a partir de las notas del grupo</div>
            <section className={styles.section}>
              {shareableEntries.length === 0 ? (
                <p className={styles.empty}>
                  No hay entradas compartibles en este grupo. Crea o edita una entrada y márcala
                  como compartible.
                </p>
              ) : (
                <>
                  <div className={styles.entryList}>
                    {shareableEntries.map((entry) => (
                      <label key={entry.id} className={styles.entryItem}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(entry.id)}
                          onChange={() => toggleEntry(entry.id)}
                        />
                        <span className={styles.entryPreview}>
                          {entry.body.length > 120
                            ? `${entry.body.slice(0, 120)}…`
                            : entry.body}
                        </span>
                      </label>
                    ))}
                  </div>
                  <div className={styles.generateBlock}>
                    <Button
                      variant="primary"
                      onClick={handleGenerate}
                      disabled={
                        !activeLink?.id ||
                        selectedIds.length === 0 ||
                        generateMutation.isPending
                      }
                      loading={generateMutation.isPending}
                    >
                      {generateMutation.isPending
                        ? 'Generando con IA…'
                        : 'Generar resumen con IA'}
                    </Button>
                  </div>
                </>
              )}
            </section>
            {generateMutation.isPending && (
              <div className={styles.loading}>
                <Spinner />
                <p>Generando resumen…</p>
              </div>
            )}
            {lastSummary && !generateMutation.isPending && (
              <section className={`${styles.section} ${styles.resultBlock}`}>
                <h2 className={styles.sectionTitle}>Resumen generado</h2>
                <div className={styles.resultLabel}>Puedes editarlo antes de enviar:</div>
                <Textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  rows={10}
                  className={styles.resultTextarea}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={
                    updateMutation.isPending ||
                    editedContent === summaryContent(lastSummary)
                  }
                >
                  Guardar cambios
                </Button>
                <div className={styles.sendBlock}>
                  <Button
                    variant="primary"
                    onClick={handleSend}
                    disabled={sendMutation.isPending}
                    loading={sendMutation.isPending}
                  >
                    Enviar a mi psicólogo/a
                  </Button>
                  {sendCountdown !== null && sendCountdown > 0 && (
                    <span className={styles.undoCountdown}>Enviado. ({sendCountdown}s)</span>
                  )}
                </div>
              </section>
            )}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Resúmenes enviados</h2>
              {sentSummaries.length === 0 ? (
                <p className={styles.empty}>Aún no has enviado ningún resumen.</p>
              ) : (
                <div className={styles.sentList}>
                  {sentSummaries
                    .slice()
                    .sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at))
                    .map((s) => (
                      <Card key={s.id} padding="md" className={styles.sentItem}>
                        <p className={styles.sentMeta}>Enviado: {formatSentDate(s.sent_at)}</p>
                        <div className={styles.sentContent}>{summaryContent(s) || '—'}</div>
                      </Card>
                    ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
