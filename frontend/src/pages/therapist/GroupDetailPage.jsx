import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Plus, ChevronDown, ChevronRight } from 'lucide-react'
import { Button, Card, Input, Textarea, Badge } from '../../components/ui'
import { useGroup, useAddGroupMember, useRemoveGroupMember, useGroupSummaries, useGenerateGroupSummary, useUpdateGroupSummary } from '../../hooks/useGroups'
import { useLinksList } from '../../hooks/useLinks'
import { useTasksList, useTaskCreate } from '../../hooks/useTasks'
import { useAiSearch } from '../../hooks/useSearch'
import { formatDate, formatDateTime } from '../../utils/dates'
import styles from './GroupDetailPage.module.scss'

const taskSchema = z.object({
  title: z.string().min(1, 'Título obligatorio'),
  description: z.string().optional(),
  due_date: z.string().optional(),
})

const TABS = ['Miembros', 'Tareas', 'Resúmenes', 'Búsqueda IA']

export default function TherapistGroupDetailPage() {
  const { id } = useParams()
  const [activeTab, setActiveTab] = useState('Miembros')
  const [selectedSummaryIds, setSelectedSummaryIds] = useState([])
  const [removeConfirm, setRemoveConfirm] = useState(null)
  const [editedSummaryBodies, setEditedSummaryBodies] = useState({})
  const [aiQuery, setAiQuery] = useState('')
  const [sourcesOpen, setSourcesOpen] = useState(false)

  const { data: group, isLoading: groupLoading, error: groupError } = useGroup(id)
  const aiSearchMutation = useAiSearch()
  const { data: links = [] } = useLinksList()
  const { data: allTasks = [] } = useTasksList()
  const { data: summariesByPatient = [] } = useGroupSummaries(id)
  const addMember = useAddGroupMember()
  const removeMember = useRemoveGroupMember()
  const generateSummary = useGenerateGroupSummary()
  const updateGroupSummary = useUpdateGroupSummary()
  const createTask = useTaskCreate()

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(taskSchema),
    defaultValues: { title: '', description: '', due_date: '' },
  })

  const groupTasks = (allTasks || []).filter((t) => t.group === parseInt(id, 10))
  const memberPatientIds = (group?.members || []).map((m) => m.patient?.id ?? m.patient)
  const activePatientsNotInGroup = (links || []).filter(
    (l) => l.status === 'active' && !memberPatientIds.includes(l.patient?.id ?? l.patient)
  )

  const toggleSummarySelection = (summaryId) => {
    setSelectedSummaryIds((prev) =>
      prev.includes(summaryId) ? prev.filter((s) => s !== summaryId) : [...prev, summaryId]
    )
  }

  const handleGenerateGroupSummary = () => {
    if (selectedSummaryIds.length === 0) return
    generateSummary.mutate(
      { groupId: id, summaryIds: selectedSummaryIds },
      { onSuccess: () => setSelectedSummaryIds([]) }
    )
  }

  const handleAddMember = (patientId) => {
    addMember.mutate({ groupId: id, patientId })
  }

  const handleRemoveMember = (membershipId) => {
    removeMember.mutate(
      { groupId: id, membershipId },
      { onSuccess: () => setRemoveConfirm(null) }
    )
  }

  const onCreateTask = (data) => {
    createTask.mutate(
      {
        group: parseInt(id, 10),
        title: data.title,
        description: data.description || '',
        due_date: data.due_date || null,
      },
      { onSuccess: () => reset() }
    )
  }

  const handleAiConsult = () => {
    if (!aiQuery.trim()) return
    aiSearchMutation.mutate({
      query: aiQuery.trim(),
      groupId: parseInt(id, 10),
      contextType: 'group',
    })
  }

  if (groupLoading) return <div className={styles.loading}>Cargando grupo…</div>
  if (groupError || !group) return <div className={styles.error}>No se encontró el grupo.</div>

  return (
    <div className="pageContent">
      <Link to="/app/therapist/groups" className={styles.back}>
        <ArrowLeft size={18} />
        Volver a Grupos
      </Link>
      <h1 className={styles.title}>{group.name}</h1>

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
        {activeTab === 'Miembros' && (
          <>
            <div className={styles.sectionTitle}>Miembros activos</div>
            {(group.members || []).map((m) => (
              <div key={m.id} className={styles.memberRow}>
                <span className={styles.memberEmail}>
                  {m.patient?.user?.email ?? `Paciente #${m.patient}`}
                </span>
                {removeConfirm === m.id ? (
                  <span className={styles.memberActions}>
                    <span className={styles.confirmText}>¿Desactivar?</span>
                    <Button variant="ghost" size="sm" onClick={() => setRemoveConfirm(null)}>
                      Cancelar
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleRemoveMember(m.id)}
                      disabled={removeMember.isPending}
                    >
                      Sí, desactivar
                    </Button>
                  </span>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRemoveConfirm(m.id)}
                    disabled={removeMember.isPending}
                  >
                    Desactivar
                  </Button>
                )}
              </div>
            ))}
            <div className={styles.dropdown}>
              <label className={styles.patientLabel}>Agregar miembro</label>
              <select
                onChange={(e) => {
                  const v = e.target.value
                  if (v) handleAddMember(parseInt(v, 10))
                  e.target.value = ''
                }}
                style={{ padding: 8, borderRadius: 8, minWidth: 200 }}
              >
                <option value="">— Selecciona un paciente —</option>
                {activePatientsNotInGroup.map((link) => (
                  <option key={link.id} value={link.patient?.id ?? link.patient}>
                    {link.patient?.user?.email ?? `Paciente #${link.patient}`}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {activeTab === 'Tareas' && (
          <>
            <div className={styles.sectionTitle}>Crear tarea grupal</div>
            <form onSubmit={handleSubmit(onCreateTask)}>
              <div className={styles.formRow}>
                <Input label="Título" {...register('title')} error={errors.title?.message} />
              </div>
              <div className={styles.formRow}>
                <Textarea label="Descripción (opcional)" {...register('description')} rows={2} />
              </div>
              <div className={styles.formRow}>
                <Input label="Fecha límite (opcional)" type="date" lang="es-CL" {...register('due_date')} />
              </div>
              <div className={styles.formActions}>
                <Button type="submit" variant="primary" size="sm" disabled={createTask.isPending}>
                  <Plus size={16} />
                  Crear tarea
                </Button>
              </div>
            </form>
            <div className={styles.sectionTitle} style={{ marginTop: 24 }}>Tareas del grupo</div>
            {groupTasks.length === 0 ? (
              <p className={styles.empty}>No hay tareas en este grupo.</p>
            ) : (
              groupTasks.map((task) => {
                const progressList = task.progress_list || []
                const done = progressList.filter((p) => p.status === 'done').length
                return (
                  <Card key={task.id} padding="md" className={styles.taskCard}>
                    <div className={styles.taskHeader}>
                      <span className={styles.taskTitle}>{task.title}</span>
                      <Badge variant="in_progress">
                        {done}/{progressList.length} completadas
                      </Badge>
                    </div>
                    <p className={styles.taskProgress}>
                      Fecha límite: {formatDate(task.due_date)}
                    </p>
                    {progressList.map((p) => (
                      <p key={p.id} className={styles.taskProgress}>
                        Paciente {p.patient}: {p.status} {p.note ? `— ${p.note}` : ''}
                      </p>
                    ))}
                  </Card>
                )
              })
            )}
          </>
        )}

        {activeTab === 'Resúmenes' && (
          <>
            <div className={styles.sectionTitle}>Resúmenes por paciente</div>
            {Array.isArray(summariesByPatient) && summariesByPatient.length === 0 ? (
              <p className={styles.empty}>No hay resúmenes enviados por los miembros.</p>
            ) : (
              (summariesByPatient || []).map((item) => (
                <div key={item.patient_id} className={styles.patientBlock}>
                  <p className={styles.patientLabel}>{item.patient_email}</p>
                  {(item.summaries || []).map((s) => (
                    <label key={s.id} className={styles.summaryItem}>
                      <input
                        type="checkbox"
                        className={styles.summaryCheckbox}
                        checked={selectedSummaryIds.includes(s.id)}
                        onChange={() => toggleSummarySelection(s.id)}
                      />
                      {formatDateTime(s.sent_at)} — {(s.body_edited || s.body_ai || '').slice(0, 80)}…
                    </label>
                  ))}
                </div>
              ))
            )}
            <Button
              variant="primary"
              size="md"
              onClick={handleGenerateGroupSummary}
              disabled={selectedSummaryIds.length === 0 || generateSummary.isPending}
              loading={generateSummary.isPending}
              style={{ marginTop: 16 }}
            >
              Generar resumen grupal con los seleccionados
            </Button>
            <div className={styles.sectionTitle} style={{ marginTop: 32 }}>
              Resúmenes grupales
            </div>
            {(group.group_summaries || []).length === 0 ? (
              <p className={styles.empty}>Aún no hay resúmenes grupales.</p>
            ) : (
              (group.group_summaries || []).map((gs) => {
                const currentBody =
                  editedSummaryBodies[gs.id] !== undefined
                    ? editedSummaryBodies[gs.id]
                    : (gs.body_edited ?? gs.body_ai ?? '')
                return (
                  <div key={gs.id} className={styles.groupSummaryCard}>
                    <p className={styles.groupSummaryMeta}>
                      Creado: {formatDateTime(gs.created_at)}
                    </p>
                    <Textarea
                      value={currentBody}
                      onChange={(e) =>
                        setEditedSummaryBodies((prev) => ({ ...prev, [gs.id]: e.target.value }))
                      }
                      rows={6}
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      style={{ marginTop: 8 }}
                      disabled={
                        updateGroupSummary.isPending ||
                        currentBody === (gs.body_edited ?? gs.body_ai ?? '')
                      }
                      onClick={() => {
                        updateGroupSummary.mutate(
                          { groupId: id, summaryPk: gs.id, body_edited: currentBody },
                          {
                            onSuccess: () =>
                              setEditedSummaryBodies((prev) => {
                                const next = { ...prev }
                                delete next[gs.id]
                                return next
                              }),
                          }
                        )
                      }}
                    >
                      Guardar cambios
                    </Button>
                  </div>
                )
              })
            )}
          </>
        )}

        {activeTab === 'Búsqueda IA' && (
          <section className={styles.searchSection}>
            <p className="searchSectionLabel">Consulta contextual con IA (grupo)</p>
            <Textarea
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              placeholder="Ej: ¿Qué temas se repiten entre los miembros? ¿Patrones comunes este mes?"
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
        )}
      </div>
    </div>
  )
}
