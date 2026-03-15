import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { Button, Card, Modal, Input, Badge } from '../../components/ui'
import { useLinksList, useLinkInvite } from '../../hooks/useLinks'
import styles from './PatientsPage.module.scss'

const schema = z.object({
  email: z.string().email('Email no válido'),
})

export default function TherapistPatientsPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const { data: links = [], isLoading, error } = useLinksList()
  const inviteMutation = useLinkInvite()

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  })

  const onInvite = (data) => {
    inviteMutation.mutate(data.email, {
      onSuccess: () => {
        setModalOpen(false)
        reset({ email: '' })
      },
      onError: (err) => {
        const msg = err.response?.data?.detail ?? 'No se pudo enviar la invitación.'
        setError('root', { message: msg })
      },
    })
  }

  const patientName = (link) =>
    link.patient?.user?.email ?? `Paciente #${link.id}`

  const statusVariant = { pending: 'pending', active: 'active', paused: 'paused', ended: 'ended' }
  const statusLabel = {
    pending: 'Pendiente',
    active: 'Activo',
    paused: 'Pausado',
    ended: 'Finalizado',
  }

  if (isLoading) return <div className={styles.loading}>Cargando…</div>
  if (error) return <div className={styles.error}>Error al cargar pacientes.</div>

  return (
    <div className="pageContent">
      <div className={styles.header}>
        <h1 className={styles.title}>Pacientes</h1>
        <Button variant="primary" size="md" onClick={() => setModalOpen(true)}>
          <UserPlus size={18} />
          Invitar paciente
        </Button>
      </div>
      <div className={styles.list}>
        {links.length === 0 ? (
          <p className={styles.empty}>
            Aún no has invitado a ningún paciente. Usa &quot;Invitar paciente&quot; para añadir uno.
          </p>
        ) : (
          links.map((link) => (
            <div key={link.id} className={styles.row}>
              <div className={styles.rowLeft}>
                <div>
                  <Link
                    to={link.status === 'active' ? `/app/therapist/patients/${link.id}` : '#'}
                    className={styles.patientEmail}
                    style={link.status !== 'active' ? { pointerEvents: 'none', color: 'inherit' } : {}}
                  >
                    {patientName(link)}
                  </Link>
                  <p className={styles.linkMeta}>
                    Invitado: {link.invited_at ? new Date(link.invited_at).toLocaleDateString('es-ES') : '—'}
                  </p>
                </div>
                <Badge variant={statusVariant[link.status] ?? 'pending'}>
                  {statusLabel[link.status] ?? link.status}
                </Badge>
              </div>
            </div>
          ))
        )}
      </div>
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Invitar paciente"
      >
        <form onSubmit={handleSubmit(onInvite)}>
          <Input
            label="Email del paciente"
            type="email"
            {...register('email')}
            error={errors.email?.message}
            autoComplete="email"
          />
          {errors.root && (
            <p className={styles.error} style={{ marginTop: 8 }}>{errors.root.message}</p>
          )}
          <div className={styles.modalActions}>
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={inviteMutation.isPending}
              loading={inviteMutation.isPending}
            >
              Enviar invitación
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
