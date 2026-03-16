import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus } from 'lucide-react'
import { Button, Card, Modal, Input } from '../../components/ui'
import { useGroupsList, useCreateGroup } from '../../hooks/useGroups'
import { formatDate } from '../../utils/dates'
import styles from './GroupsPage.module.scss'

const schema = z.object({ name: z.string().min(1, 'Nombre obligatorio') })

export default function TherapistGroupsPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const { data: groups = [], isLoading, error } = useGroupsList()
  const createGroup = useCreateGroup()

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '' },
  })

  const onSubmit = (data) => {
    createGroup.mutate(data.name, {
      onSuccess: () => {
        setModalOpen(false)
        reset({ name: '' })
      },
    })
  }

  if (isLoading) return <div className={styles.loading}>Cargando grupos…</div>
  if (error) return <div className={styles.error}>Error al cargar los grupos.</div>

  return (
    <div className="pageContent">
      <div className={styles.header}>
        <h1 className={styles.title}>Grupos</h1>
        <Button variant="primary" size="md" onClick={() => setModalOpen(true)}>
          <Plus size={18} />
          Nuevo grupo
        </Button>
      </div>
      <div className={styles.grid}>
        {groups.length === 0 ? (
          <p className={styles.empty}>Aún no tienes grupos. Crea uno para agrupar pacientes.</p>
        ) : (
          groups.map((g) => (
            <Link key={g.id} to={`/app/therapist/groups/${g.id}`} className={styles.card}>
              <p className={styles.cardName}>{g.name}</p>
              <p className={styles.cardMeta}>
                {g.members_count ?? g.members?.length ?? 0} miembros · {formatDate(g.created_at)}
              </p>
            </Link>
          ))
        )}
      </div>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo grupo">
        <form onSubmit={handleSubmit(onSubmit)}>
          <Input
            label="Nombre del grupo"
            {...register('name')}
            error={errors.name?.message}
            placeholder="Ej. Grupo de mañanas"
          />
          <div className={styles.modalActions}>
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={createGroup.isPending}>
              Crear
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
