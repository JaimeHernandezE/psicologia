from django.db import models


class Feeling(models.Model):
    title = models.CharField(max_length=50)
    description = models.TextField(blank=True)
    emoji = models.CharField(max_length=10, blank=True)
    color = models.CharField(max_length=7, blank=True)
    is_system = models.BooleanField(default=False)
    therapist = models.ForeignKey(
        "users.TherapistProfile",
        on_delete=models.CASCADE,
        related_name="custom_feelings",
        null=True,
        blank=True,
    )
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["order", "title"]
        verbose_name = "sentimiento"
        verbose_name_plural = "sentimientos"
        constraints = [
            models.UniqueConstraint(
                fields=["title", "therapist"],
                name="feelings_unique_feeling_per_therapist",
            )
        ]

    def __str__(self) -> str:
        who = "sistema" if self.is_system else (self.therapist or "—")
        return f"{self.title} ({who})"


class JournalEntryFeeling(models.Model):
    journal_entry = models.ForeignKey(
        "journal.JournalEntry",
        on_delete=models.CASCADE,
        related_name="journal_entry_feelings",
    )
    feeling = models.ForeignKey(
        Feeling,
        on_delete=models.CASCADE,
        related_name="journal_entry_feelings",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["journal_entry", "feeling"],
                name="feelings_unique_journalentry_feeling",
            )
        ]

    def __str__(self) -> str:
        return f"{self.journal_entry_id} – {self.feeling}"

