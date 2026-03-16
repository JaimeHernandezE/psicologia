import { useState, useEffect } from 'react'
import { Button, Card, Textarea, Spinner } from '../../components/ui'
import { useJournalList } from '../../hooks/useJournal'
import { useLinksList } from '../../hooks/useLinks'
import {
  useSummariesList,
  useSummaryGenerate,
  useSummaryUpdate,
  useSummarySend,
} from '../../hooks/useSummaries'
import { formatDateTime } from '../../utils/dates'
import styles from './SummaryPage.module.scss'

const SEND_UNDO_SECONDS = 15

export default function PatientSummaryPage() {
  const [selectedIds, setSelectedIds] = useState([])
  const [lastGeneratedId, setLastGeneratedId] = useState(null)
  const [editedContent, setEditedContent] = useState('')
  const [sendCountdown, setSendCountdown] = useState(null)

  const { data: entries = [], isLoading: entriesLoading } = useJournalList()
  const { data: links = [] } = useLinksList()
  const { data: summaries = [], isLoading: summariesLoading } = useSummariesList()

  const shareableEntries = entries.filter((e) => e.visibility === 'shareable')
  const activeLink = links.find((l) => l.status === 'active')
  const sentSummaries = summaries.filter((s) => s.is_sent || s.sent_at)

  const generateMutation = useSummaryGenerate()
  const updateMutation = useSummaryUpdate()
  const sendMutation = useSummarySend()

  const lastSummary = lastGeneratedId
    ? summaries.find((s) => s.id === lastGeneratedId)
    : summaries.find((s) => !s.is_sent)

  const summaryContent = (s) => (s?.body_edited && s.body_edited.trim() !== '') ? s.body_edited : (s?.body_ai ?? '')

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

  const toggleEntry = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleGenerate = () => {
    if (!activeLink?.id || selectedIds.length === 0) return
    generateMutation.mutate(
      { linkId: activeLink.id, journalEntryIds: selectedIds },
      {
        onSuccess: (data) => {
          setLastGeneratedId(data?.id ?? null)
          setEditedContent((data?.body_edited && data.body_edited.trim()) ? data.body_edited : (data?.body_ai ?? ''))
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

  if (entriesLoading) return <div className={styles.loading}>Cargando…</div>

  return (
    <div className="pageContent">
      <h1 className={styles.title}>Resumen para tu psicólogo/a</h1>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Entradas compartibles</h2>
        {shareableEntries.length === 0 ? (
          <p className={styles.empty}>
            No tienes entradas con visibilidad &quot;compartible&quot;. Edita una entrada del diario
            y márcala como compartible.
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
                    {entry.body.length > 120 ? `${entry.body.slice(0, 120)}…` : entry.body}
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
                {generateMutation.isPending ? 'Generando con IA…' : 'Generar resumen con IA'}
              </Button>
              {generateMutation.isError && (
                <p className={styles.error}>
                  No se pudo generar el resumen. Intenta de nuevo.
                </p>
              )}
            </div>
          </>
        )}
      </section>

      {generateMutation.isPending && (
        <div className={styles.loading}>
          <Spinner />
          <p>Claude está generando tu resumen…</p>
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
            disabled={updateMutation.isPending || editedContent === summaryContent(lastSummary)}
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
              <span className={styles.undoCountdown}>
                Enviado. ({sendCountdown}s)
              </span>
            )}
          </div>
        </section>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Resúmenes enviados</h2>
        {summariesLoading ? (
          <div className={styles.loading}>Cargando…</div>
        ) : sentSummaries.length === 0 ? (
          <p className={styles.empty}>Aún no has enviado ningún resumen.</p>
        ) : (
          <div className={styles.sentList}>
            {sentSummaries
              .slice()
              .sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at))
              .map((s) => (
                <Card key={s.id} padding="md" className={styles.sentItem}>
                  <p className={styles.sentMeta}>Enviado: {formatDateTime(s.sent_at)}</p>
                  <div className={styles.sentContent}>{summaryContent(s) || '—'}</div>
                </Card>
              ))}
          </div>
        )}
      </section>
    </div>
  )
}
