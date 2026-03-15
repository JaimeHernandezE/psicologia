import { useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { BookOpen, ListTodo, FileText } from 'lucide-react'
import { Card } from '../../components/ui'
import { useAuthStore } from '../../stores/authStore'
import { useTasksList } from '../../hooks/useTasks'
import { useLinksList } from '../../hooks/useLinks'
import styles from './DashboardPage.module.scss'

export default function PatientDashboardPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    if (!location.state?.invitationAccepted) return
    const t = setTimeout(() => {
      navigate(location.pathname, { replace: true, state: {} })
    }, 4000)
    return () => clearTimeout(t)
  }, [location.state?.invitationAccepted, location.pathname, navigate])
  const { data: tasks = [], isLoading: tasksLoading } = useTasksList()
  const { data: links = [], isLoading: linksLoading } = useLinksList()

  const invitationJustAccepted = location.state?.invitationAccepted === true
  const pendingInvitationCount = (links || []).filter((l) => l.status === 'pending').length

  const pendingCount = tasks.filter((t) => {
    const status = t.progress?.status ?? 'pending'
    return status !== 'done'
  }).length

  const activeLink = links.find((l) => l.status === 'active')
  const nextSession = null // Backend: no hay endpoint para "próxima sesión" del paciente aún

  const firstName = user?.email?.split('@')[0] ?? 'Usuario'

  return (
    <div className="pageContent">
      {invitationJustAccepted && (
        <div className={styles.successBanner} role="alert">
          Invitación aceptada. Ya puedes trabajar con tu psicólogo/a.
        </div>
      )}
      {pendingInvitationCount > 0 && (
        <div className={styles.invitationBanner}>
          <p className={styles.invitationBannerText}>
            Tienes {pendingInvitationCount} invitación{pendingInvitationCount !== 1 ? 'es' : ''} pendiente{pendingInvitationCount !== 1 ? 's' : ''} de un psicólogo/a.
          </p>
          <Link to="/app/patient/invitations" className={styles.invitationBannerBtn}>
            Ver invitaciones
          </Link>
        </div>
      )}
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
