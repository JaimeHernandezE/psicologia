from django.db import models


class SessionAlert(models.Model):
    """Alerta de sesión para un vínculo (recordatorio antes de la cita)."""

    link = models.ForeignKey(
        "links.TherapistPatientLink",
        on_delete=models.CASCADE,
        related_name="session_alerts",
    )
    session_date = models.DateField()
    notify_before_days = models.PositiveIntegerField(
        default=1,
        help_text="Días antes de la sesión para notificar",
    )
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.link} – {self.session_date} (notif. -{self.notify_before_days}d)"

    class Meta:
        ordering = ["-session_date"]
        verbose_name = "Alerta de sesión"
        verbose_name_plural = "Alertas de sesión"


class NotificationPreference(models.Model):
    """Preferencias de notificación del paciente."""

    class ReminderFrequency(models.TextChoices):
        DAILY = "daily", "Diario"
        WEEKLY = "weekly", "Semanal"
        NEVER = "never", "Nunca"

    patient = models.OneToOneField(
        "users.PatientProfile",
        on_delete=models.CASCADE,
        related_name="notification_preference",
    )
    reminders_enabled = models.BooleanField(default=True)
    reminder_frequency = models.CharField(
        max_length=20,
        choices=ReminderFrequency.choices,
        default=ReminderFrequency.DAILY,
    )
    quiet_hours_start = models.TimeField(null=True, blank=True)
    quiet_hours_end = models.TimeField(null=True, blank=True)

    def __str__(self):
        return f"Notificaciones: {self.patient}"

    class Meta:
        ordering = ["patient"]
        verbose_name = "Preferencia de notificación"
        verbose_name_plural = "Preferencias de notificación"
