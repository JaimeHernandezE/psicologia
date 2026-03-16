import { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus } from 'lucide-react'
import { Button, Card, Modal, Textarea, Badge } from '../../components/ui'
import { useJournalList, useJournalCreate, useJournalUpdate } from '../../hooks/useJournal'
import styles from './JournalPage.module.scss'

const DEBOUNCE_MS = 400
const VISIBILITY_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'private', label: 'Privadas' },
  { value: 'shareable', label: 'Compartibles' },
]

const schema = z.object({
  body: z.string().min(1, 'Escribe algo'),
  visibility: z.enum(['private', 'shareable']),
})

export default function PatientJournalPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [visibilityFilter, setVisibilityFilter] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput), DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [searchInput])

  const listParams = useMemo(
    () => ({
      ...(debouncedSearch.trim() && { search: debouncedSearch.trim() }),
      ...(dateFrom && { date_from: dateFrom }),
      ...(dateTo && { date_to: dateTo }),
      ...(visibilityFilter && { visibility: visibilityFilter }),
    }),
    [debouncedSearch, dateFrom, dateTo, visibilityFilter]
  )
  const { data: entries = [], isLoading, error } = useJournalList(listParams)
  const createEntry = useJournalCreate()
  const updateEntry = useJournalUpdate()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { body: '', visibility: 'private' },
  })

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

  const onSave = (data) => {
    if (editingId) {
      updateEntry.mutate(
        { id: editingId, body: data.body, visibility: data.visibility },
        { onSuccess: () => setModalOpen(false) }
      )
    } else {
      createEntry.mutate(
        { body: data.body, visibility: data.visibility },
        { onSuccess: () => setModalOpen(false) }
      )
    }
  }

  const formatDate = (d) => new Date(d).toLocaleDateString('es-ES', { dateStyle: 'long' })

  if (isLoading) return <div className={styles.loading}>Cargando entradas…</div>
  if (error) return <div className={styles.error}>Error al cargar el diario.</div>

  return (
    <div className="pageContent">
      <div className={styles.header}>
        <h1 className={styles.title}>Diario</h1>
        <Button variant="primary" size="md" onClick={openCreate}>
          <Plus size={18} />
          Nueva entrada
        </Button>
      </div>
      <div className="searchBar filterRow" style={{ marginBottom: 16 }}>
        <input
          type="search"
          placeholder="Buscar por palabra clave"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} placeholder="Desde" />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} placeholder="Hasta" />
        <select
          value={visibilityFilter}
          onChange={(e) => setVisibilityFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8 }}
        >
          {VISIBILITY_OPTIONS.map((o) => (
            <option key={o.value || 'all'} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <div className={styles.list}>
        {entries.length === 0 ? (
          <p className={styles.empty}>Aún no hay entradas. Crea la primera.</p>
        ) : (
          entries.map((entry) => (
            <Card key={entry.id} padding="md" clickable onClick={() => openEdit(entry)}>
              <div className={styles.entryMeta}>
                <time>{formatDate(entry.created_at)}</time>
                <Badge variant={entry.visibility === 'shareable' ? 'shareable' : 'private'}>
                  {entry.visibility === 'shareable' ? 'Compartible' : 'Privada'}
                </Badge>
              </div>
              <p className={styles.entryBody}>
                {entry.body.length > 100 ? `${entry.body.slice(0, 100)}…` : entry.body}
              </p>
            </Card>
          ))
        )}
      </div>
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Editar entrada' : 'Nueva entrada'}
      >
        <form onSubmit={handleSubmit(onSave)}>
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
    </div>
  )
}
