from django.db import models


class Summary(models.Model):
    """Resumen generado por IA para un vínculo terapeuta–paciente."""

    link = models.ForeignKey(
        "links.TherapistPatientLink",
        on_delete=models.CASCADE,
        related_name="summaries",
    )
    body_ai = models.TextField(help_text="Texto generado por Claude")
    body_edited = models.TextField(
        blank=True,
        help_text="Texto editado por el paciente",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    undo_deadline = models.DateTimeField(
        null=True,
        blank=True,
        help_text="sent_at + 15 segundos",
    )
    is_sent = models.BooleanField(default=False)

    def __str__(self):
        return f"Resumen {self.id} – {self.link} ({self.created_at.date()})"

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Resumen"
        verbose_name_plural = "Resúmenes"


class GroupSummary(models.Model):
    """Resumen grupal generado por IA a partir de resúmenes individuales."""

    group = models.ForeignKey(
        "links.Group",
        on_delete=models.CASCADE,
        related_name="group_summaries",
    )
    body_ai = models.TextField(help_text="Texto generado por Claude")
    body_edited = models.TextField(blank=True)
    created_by = models.ForeignKey(
        "users.TherapistProfile",
        on_delete=models.CASCADE,
        related_name="created_group_summaries",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Resumen grupal {self.id} – {self.group}"

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Resumen grupal"
        verbose_name_plural = "Resúmenes grupales"


class SummaryEntry(models.Model):
    """Tabla intermedia entre Summary y JournalEntry."""

    summary = models.ForeignKey(
        Summary,
        on_delete=models.CASCADE,
        related_name="summary_entries",
    )
    journal_entry = models.ForeignKey(
        "journal.JournalEntry",
        on_delete=models.CASCADE,
        related_name="summary_entries",
    )
    included_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.summary} ← {self.journal_entry}"

    class Meta:
        ordering = ["-included_at"]
        verbose_name = "Entrada en resumen"
        verbose_name_plural = "Entradas en resumen"
        constraints = [
            models.UniqueConstraint(
                fields=["summary", "journal_entry"],
                name="summaries_summaryentry_unique_summary_journal",
            )
        ]
