from django.db import models


class JournalEntry(models.Model):
    """Entrada del diario del paciente."""

    class Visibility(models.TextChoices):
        PRIVATE = "private", "Privado"
        SHAREABLE = "shareable", "Compartible"

    patient = models.ForeignKey(
        "users.PatientProfile",
        on_delete=models.CASCADE,
        related_name="journal_entries",
    )
    body = models.TextField()
    visibility = models.CharField(
        max_length=20,
        choices=Visibility.choices,
        default=Visibility.PRIVATE,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        preview = self.body[:50] + "…" if len(self.body) > 50 else self.body
        return f"{self.patient} – {self.created_at.date()}: {preview}"

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Entrada de diario"
        verbose_name_plural = "Entradas de diario"
