import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card } from '../../components/ui'
import { usePendingInvitations, useAcceptInvitation } from '../../hooks/useLinks'
import { formatDateLong } from '../../utils/dates'
import styles from './InvitationsPage.module.scss'

function therapistDisplayName(link) {
  const email = link.therapist?.user?.email
  const name = link.therapist?.user?.first_name || link.therapist?.user?.last_name
  if (name) return name
  return email || 'Psicólogo/a'
}

export default function InvitationsPage() {
  const navigate = useNavigate()
  const [successMessage, setSuccessMessage] = useState(null)
  const { data: invitations = [], isLoading, error } = usePendingInvitations()
  const acceptInvitation = useAcceptInvitation()

  const handleAccept = (linkId) => {
    acceptInvitation.mutate(linkId, {
      onSuccess: () => {
        setSuccessMessage('Invitación aceptada. Ya puedes trabajar con tu psicólogo/a.')
        setTimeout(() => {
          navigate('/app/patient', { replace: true, state: { invitationAccepted: true } })
        }, 1500)
      },
      onError: () => {
        setSuccessMessage(null)
      },
    })
  }

  if (isLoading) return <div className={styles.loading}>Cargando invitaciones…</div>
  if (error) return <div className={styles.error}>Error al cargar las invitaciones.</div>

  return (
    <div className="pageContent">
      <h1 className={styles.title}>Invitaciones</h1>
      {successMessage && (
        <div className={styles.successMessage} role="alert">
          {successMessage}
        </div>
      )}
      {invitations.length === 0 ? (
        <p className={styles.empty}>No tienes invitaciones pendientes.</p>
      ) : (
        <div className={styles.list}>
          {invitations.map((link) => (
            <Card key={link.id} padding="md" className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.therapistName}>
                  {therapistDisplayName(link)}
                </span>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleAccept(link.id)}
                  disabled={acceptInvitation.isPending}
                  loading={acceptInvitation.isPending}
                >
                  Aceptar
                </Button>
              </div>
              <p className={styles.meta}>
                Invitación enviada el {formatDateLong(link.invited_at)}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
