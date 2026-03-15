import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Card } from '../../components/ui'
import { useLinksList } from '../../hooks/useLinks'
import { useSummariesList } from '../../hooks/useSummaries'
import styles from './DashboardPage.module.scss'

export default function TherapistDashboardPage() {
  const { data: links = [], isLoading: linksLoading } = useLinksList()
  const { data: summaries = [], isLoading: summariesLoading } = useSummariesList()

  const activePatients = links.filter((l) => l.status === 'active')
  const totalSummaries = summaries.length

  const patientName = (link) =>
    link.patient?.user?.email ?? `Paciente #${link.id}`

  if (linksLoading) return <div className={styles.loading}>Cargando…</div>

  return (
    <div className="pageContent">
      <h1 className={styles.title}>Inicio</h1>
      <div className={styles.stats}>
        <Card padding="md">
          <p className={styles.cardTitle}>Pacientes activos</p>
          <p className={styles.cardValue}>{activePatients.length}</p>
        </Card>
        <Card padding="md">
          <p className={styles.cardTitle}>Resúmenes recibidos</p>
          <p className={styles.cardValue}>
            {summariesLoading ? '—' : totalSummaries}
          </p>
        </Card>
      </div>
      <h2 className={styles.sectionTitle}>Pacientes</h2>
      <div className={styles.patientList}>
        {activePatients.length === 0 ? (
          <p className={styles.empty}>
            Aún no tienes pacientes activos. Invita a un paciente desde Pacientes.
          </p>
        ) : (
          activePatients.map((link) => (
            <Link
              key={link.id}
              to={`/app/therapist/patients/${link.id}`}
              className={styles.patientCard}
            >
              <div>
                <p className={styles.patientName}>{patientName(link)}</p>
                <p className={styles.patientMeta}>
                  Última actividad: —
                </p>
              </div>
              <ChevronRight size={20} className={styles.chevron} />
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
