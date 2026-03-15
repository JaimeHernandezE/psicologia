import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { LogIn } from 'lucide-react'
import { Button, Input, Card } from '../../components/ui'
import { useLogin } from '../../hooks/useAuth'
import { useAuthStore } from '../../stores/authStore'
import styles from './LoginPage.module.scss'

const schema = z.object({
  email: z.string().min(1, 'El email es obligatorio').email('Email no válido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
})

export default function LoginPage() {
  const navigate = useNavigate()
  const { user, accessToken } = useAuthStore()
  const login = useLogin()

  useEffect(() => {
    if (!accessToken || !user) return
    const to = user.role === 'patient' ? '/app/patient' : '/app/therapist'
    navigate(to, { replace: true })
  }, [accessToken, user, navigate])

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = (data) => {
    login.mutate(
      { email: data.email, password: data.password },
      {
        onError: (err) => {
          const msg = err.response?.data?.detail ?? err.response?.data?.email?.[0] ?? 'Error al iniciar sesión'
          setError('root', { type: 'server', message: msg })
        },
      }
    )
  }

  return (
    <div className={styles.wrap}>
      <Card padding="lg" className={styles.card}>
        <h1 className={styles.title}>Iniciar sesión</h1>
        <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
          {errors.root && (
            <div className={styles.errorBox} role="alert">
              {errors.root.message}
            </div>
          )}
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="Contraseña"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className={styles.submit}
            disabled={login.isPending}
            loading={login.isPending}
          >
            <LogIn size={18} />
            Entrar
          </Button>
        </form>
        <p className={styles.divider}>o</p>
        <Button
          type="button"
          variant="ghost"
          size="md"
          className={styles.googleBtn}
          disabled
          title="Próximamente"
        >
          Continuar con Google (próximamente)
        </Button>
        <p className={styles.footer}>
          ¿No tienes cuenta? <Link to="/register" className={styles.link}>Regístrate</Link>
        </p>
      </Card>
    </div>
  )
}
