import { Link } from 'react-router-dom'
import { BookOpen, ListTodo, FileText, Calendar } from 'lucide-react'
import { Card } from '../../components/ui'
import { useAuthStore } from '../../stores/authStore'
import { useTasksList } from '../../hooks/useTasks'
import { useLinksList } from '../../hooks/useLinks'
import styles from './DashboardPage.module.scss'

export default function PatientDashboardPage() {
  const user = useAuthStore((s) => s.user)
  const { data: tasks = [], isLoading: tasksLoading } = useTasksList()
  const { data: links = [], isLoading: linksLoading } = useLinksList()

  const pendingCount = tasks.filter((t) => {
    const status = t.progress?.status ?? 'pending'
    return status !== 'done'
  }).length

  const activeLink = links.find((l) => l.status === 'active')
  const nextSession = null // Backend: no hay endpoint para "próxima sesión" del paciente aún

  const firstName = user?.email?.split('@')[0] ?? 'Usuario'

  return (
    <div className="pageContent">
      <h1 className={styles.greeting}>Hola, {firstName}</h1>
      <div className={styles.cards}>
        <Card padding="md">
          <p className={styles.cardTitle}>Tareas pendientes</p>
          <p className={styles.cardValue}>
            {tasksLoading ? '—' : pendingCount}
          </p>
        </Card>
        <Card padding="md">
          <p className={styles.cardTitle}>Próxima sesión</p>
          <p className={styles.cardValue}>
            {nextSession ? new Date(nextSession).toLocaleDateString('es-ES') : '—'}
          </p>
        </Card>
      </div>
      <h2 className={styles.sectionTitle}>Acceso rápido</h2>
      <div className={styles.quickLinks}>
        <Link to="/app/patient/journal" className={styles.quickLink}>
          <BookOpen size={24} />
          Nueva entrada de diario
        </Link>
        <Link to="/app/patient/tasks" className={styles.quickLink}>
          <ListTodo size={24} />
          Ver tareas
        </Link>
        <Link to="/app/patient/summary" className={styles.quickLink}>
          <FileText size={24} />
          Preparar resumen
        </Link>
      </div>
    </div>
  )
}
