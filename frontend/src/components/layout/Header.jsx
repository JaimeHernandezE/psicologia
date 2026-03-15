import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useLogout } from '../../hooks/useAuth'
import { Button } from '../ui'

export function Header({ title }) {
  const user = useAuthStore((s) => s.user)
  const logout = useLogout()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="header">
      <h1 className="headerTitle">{title}</h1>
      <div className="headerActions">
        <span className="headerUser">{user?.email}</span>
        <Button variant="ghost" size="sm" onClick={handleLogout} aria-label="Cerrar sesión">
          <LogOut size={18} />
        </Button>
      </div>
    </header>
  )
}
