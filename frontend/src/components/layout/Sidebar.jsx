import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  BookOpen,
  ListTodo,
  FileText,
  Users,
  UserCircle,
} from 'lucide-react'

const patientNav = [
  { to: '/app/patient', icon: LayoutDashboard, label: 'Inicio' },
  { to: '/app/patient/journal', icon: BookOpen, label: 'Diario' },
  { to: '/app/patient/tasks', icon: ListTodo, label: 'Tareas' },
  { to: '/app/patient/summary', icon: FileText, label: 'Resumen' },
]

const therapistNav = [
  { to: '/app/therapist', icon: LayoutDashboard, label: 'Inicio' },
  { to: '/app/therapist/patients', icon: Users, label: 'Pacientes' },
  { to: '/app/therapist/tasks', icon: ListTodo, label: 'Tareas' },
]

export function Sidebar({ role }) {
  const nav = role === 'patient' ? patientNav : therapistNav
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
      </nav>
    </aside>
  )
}
