import { Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

const titleByPath = {
  '/app/patient': 'Mi espacio',
  '/app/patient/journal': 'Diario',
  '/app/patient/tasks': 'Tareas',
  '/app/patient/summary': 'Resumen',
  '/app/therapist': 'Panel',
  '/app/therapist/patients': 'Pacientes',
  '/app/therapist/tasks': 'Tareas',
}

function getTitle(pathname) {
  if (titleByPath[pathname]) return titleByPath[pathname]
  if (pathname.startsWith('/app/therapist/patients/')) return 'Detalle de paciente'
  return 'Psicología'
}

export function PageWrapper() {
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const role = user?.role ?? 'patient'
  const title = getTitle(location.pathname)

  return (
    <div className="appLayout">
      <Sidebar role={role} />
      <div className="appMain">
        <Header title={title} />
        <main className="page">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
