import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, Input, Card } from '../../components/ui'
import { useRegister } from '../../hooks/useAuth'
import { useAuthStore } from '../../stores/authStore'
import styles from './RegisterPage.module.scss'

const schema = z
  .object({
    email: z.string().min(1, 'El email es obligatorio').email('Email no válido'),
    password: z.string().min(8, 'Mínimo 8 caracteres'),
    password2: z.string().min(1, 'Confirma la contraseña'),
    role: z.enum(['patient', 'therapist']),
  })
  .refine((d) => d.password === d.password2, { message: 'Las contraseñas no coinciden', path: ['password2'] })

export default function RegisterPage() {
  const navigate = useNavigate()
  const { user, accessToken } = useAuthStore()
  const registerMutation = useRegister()

  useEffect(() => {
    if (!accessToken || !user) return
    const to = user.role === 'patient' ? '/app/patient' : '/app/therapist'
    navigate(to, { replace: true })
  }, [accessToken, user, navigate])

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', password2: '', role: 'patient' },
  })

  const role = watch('role')

  const onSubmit = (data) => {
    registerMutation.mutate(
      { email: data.email, password: data.password, password2: data.password2, role: data.role },
      {
        onError: (err) => {
          const detail = err.response?.data?.detail
          const emailMsg = err.response?.data?.email?.[0]
          setError('root', { type: 'server', message: emailMsg ?? detail ?? 'Error al registrarse' })
        },
      }
    )
  }

  return (
    <div className={styles.wrap}>
      <Card padding="lg" className={styles.card}>
        <h1 className={styles.title}>Crear cuenta</h1>
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
          <div className={styles.roleGroup}>
            <button
              type="button"
              className={`${styles.roleOption} ${role === 'patient' ? styles.selected : ''}`}
              onClick={() => setValue('role', 'patient')}
            >
              Paciente
            </button>
            <button
              type="button"
              className={`${styles.roleOption} ${role === 'therapist' ? styles.selected : ''}`}
              onClick={() => setValue('role', 'therapist')}
            >
              Terapeuta
            </button>
          </div>
          <Input
            label="Contraseña"
            type="password"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register('password')}
          />
          <Input
            label="Confirmar contraseña"
            type="password"
            autoComplete="new-password"
            error={errors.password2?.message}
            {...register('password2')}
          />
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className={styles.submit}
            disabled={registerMutation.isPending}
            loading={registerMutation.isPending}
          >
            Registrarme
          </Button>
        </form>
        <p className={styles.footer}>
          ¿Ya tienes cuenta? <Link to="/login" className={styles.link}>Inicia sesión</Link>
        </p>
      </Card>
    </div>
  )
}
