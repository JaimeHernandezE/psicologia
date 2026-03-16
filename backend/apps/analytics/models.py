from django.db import models


class DailyPatientMetric(models.Model):
    """Métrica diaria por paciente (hypertable TimescaleDB por date)."""

    patient = models.ForeignKey(
        "users.PatientProfile",
        on_delete=models.CASCADE,
        related_name="daily_metrics",
    )
    date = models.DateField(db_index=True)
    journal_entries_count = models.PositiveIntegerField(default=0)
    shareable_entries_count = models.PositiveIntegerField(default=0)
    tasks_total = models.PositiveIntegerField(default=0)
    tasks_completed = models.PositiveIntegerField(default=0)
    tasks_completion_rate = models.FloatField(default=0.0)
    dominant_feeling = models.ForeignKey(
        "feelings.Feeling",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="daily_metrics_as_dominant",
    )
    positive_feelings_count = models.PositiveIntegerField(default=0)
    negative_feelings_count = models.PositiveIntegerField(default=0)
    neutral_feelings_count = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-date"]
        verbose_name = "métrica diaria paciente"
        verbose_name_plural = "métricas diarias paciente"
        constraints = [
            models.UniqueConstraint(
                fields=["patient", "date"],
                name="analytics_dailypatientmetric_unique_patient_date",
            )
        ]

    def __str__(self):
        return f"{self.patient_id} – {self.date}"


class FeelingTimeSeries(models.Model):
    """Serie temporal de sentimientos (hypertable por recorded_at)."""

    patient = models.ForeignKey(
        "users.PatientProfile",
        on_delete=models.CASCADE,
        related_name="feeling_timeseries",
    )
    feeling = models.ForeignKey(
        "feelings.Feeling",
        on_delete=models.CASCADE,
        related_name="timeseries_records",
    )
    recorded_at = models.DateTimeField(db_index=True)
    journal_entry = models.ForeignKey(
        "journal.JournalEntry",
        on_delete=models.CASCADE,
        related_name="feeling_timeseries_records",
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ["-recorded_at"]
        verbose_name = "serie sentimiento"
        verbose_name_plural = "series sentimientos"

    def __str__(self):
        return f"{self.patient_id} – {self.feeling_id} @ {self.recorded_at}"


class ResearchMetric(models.Model):
    """Métricas anonimizadas para investigación (hypertable por period_start)."""

    period_start = models.DateField(db_index=True)
    period_end = models.DateField()
    therapist_hash = models.CharField(max_length=64)
    patient_hash = models.CharField(max_length=64)
    avg_completion_rate = models.FloatField()
    avg_positive_feeling_ratio = models.FloatField()
    journal_frequency_per_week = models.FloatField()
    treatment_week = models.PositiveIntegerField()
    consented = models.BooleanField(default=True)

    class Meta:
        ordering = ["-period_start"]
        verbose_name = "métrica investigación"
        verbose_name_plural = "métricas investigación"
        constraints = [
            models.UniqueConstraint(
                fields=["period_start", "period_end", "therapist_hash", "patient_hash"],
                name="analytics_researchmetric_unique_period_therapist_patient",
            )
        ]

    def __str__(self):
        return f"{self.period_start} – {self.patient_hash[:8]}…"
