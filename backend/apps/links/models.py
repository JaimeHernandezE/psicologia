from django.db import models


class Group(models.Model):
    """Grupo de pacientes (solo visible para el tratante)."""

    therapist = models.ForeignKey(
        "users.TherapistProfile",
        on_delete=models.CASCADE,
        related_name="groups",
    )
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} ({self.therapist})"

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Grupo"
        verbose_name_plural = "Grupos"


class GroupMembership(models.Model):
    """Relación paciente–grupo."""

    group = models.ForeignKey(
        Group,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    patient = models.ForeignKey(
        "users.PatientProfile",
        on_delete=models.CASCADE,
        related_name="group_memberships",
    )
    joined_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.patient} en {self.group}"

    class Meta:
        ordering = ["-joined_at"]
        verbose_name = "Miembro del grupo"
        verbose_name_plural = "Miembros del grupo"
        constraints = [
            models.UniqueConstraint(
                fields=["group", "patient"],
                name="links_groupmembership_unique_group_patient",
            )
        ]


class TherapistPatientLink(models.Model):
    """Vínculo terapeuta–paciente."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pendiente"
        ACTIVE = "active", "Activo"
        PAUSED = "paused", "Pausado"
        ENDED = "ended", "Finalizado"

    therapist = models.ForeignKey(
        "users.TherapistProfile",
        on_delete=models.CASCADE,
        related_name="patient_links",
    )
    patient = models.ForeignKey(
        "users.PatientProfile",
        on_delete=models.CASCADE,
        related_name="therapist_links",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    invited_at = models.DateTimeField(auto_now_add=True)
    activated_at = models.DateTimeField(null=True, blank=True)
    chat_enabled = models.BooleanField(
        default=False,
        help_text="Feature flag global del chat con IA",
    )
    session_frequency_days = models.IntegerField(default=14)
    group = models.ForeignKey(
        Group,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="links",
    )

    def __str__(self):
        return f"{self.therapist} – {self.patient} ({self.get_status_display()})"

    class Meta:
        ordering = ["-invited_at"]
        verbose_name = "Vínculo terapeuta–paciente"
        verbose_name_plural = "Vínculos terapeuta–paciente"
        constraints = [
            models.UniqueConstraint(
                fields=["therapist", "patient"],
                name="links_therapistpatientlink_unique_therapist_patient",
            )
        ]
