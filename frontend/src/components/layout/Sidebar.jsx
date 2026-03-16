import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  BookOpen,
  ListTodo,
  FileText,
  Users,
  UsersRound,
  Mail,
} from 'lucide-react'
import { useLinksList } from '../../hooks/useLinks'
import { usePatientGroups } from '../../hooks/useGroups'

const patientNav = [
  { to: '/app/patient', icon: LayoutDashboard, label: 'Inicio' },
  { to: '/app/patient/journal', icon: BookOpen, label: 'Diario' },
  { to: '/app/patient/tasks', icon: ListTodo, label: 'Tareas' },
  { to: '/app/patient/summary', icon: FileText, label: 'Resumen' },
]

const therapistNav = [
  { to: '/app/therapist', icon: LayoutDashboard, label: 'Inicio' },
  { to: '/app/therapist/patients', icon: Users, label: 'Pacientes' },
  { to: '/app/therapist/groups', icon: UsersRound, label: 'Grupos' },
  { to: '/app/therapist/tasks', icon: ListTodo, label: 'Tareas' },
]

export function Sidebar({ role }) {
  const { data: links = [] } = useLinksList()
  const { data: patientGroups = [] } = usePatientGroups()
  const pendingCount = role === 'patient' ? (links || []).filter((l) => l.status === 'pending').length : 0
  const nav = role === 'patient' ? patientNav : therapistNav
  const hasGroups = role === 'patient' && (patientGroups || []).length > 0

  return (
    <aside className="sidebar">
      <nav className="sidebarNav">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/app/patient' || to === '/app/therapist'}
            className={({ isActive }) => `sidebarLink ${isActive ? 'active' : ''}`}
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
        {role === 'patient' && pendingCount > 0 && (
          <NavLink
            to="/app/patient/invitations"
            end={false}
            className={({ isActive }) => `sidebarLink sidebarLinkWithBadge ${isActive ? 'active' : ''}`}
          >
            <Mail size={18} />
            Invitaciones
            <span className="sidebarBadge">{pendingCount}</span>
          </NavLink>
        )}
        {hasGroups && (
          <>
            <div className="sidebarSectionLabel">Grupos</div>
            {(patientGroups || []).map((g) => (
              <NavLink
                key={g.id}
                to={`/app/patient/groups/${g.id}`}
                end={false}
                className={({ isActive }) => `sidebarLink sidebarLinkGroup ${isActive ? 'active' : ''}`}
              >
                <UsersRound size={18} />
                {g.name}
              </NavLink>
            ))}
          </>
        )}
      </nav>
    </aside>
  )
}
