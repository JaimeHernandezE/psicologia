# Generated manually for analytics app (TimescaleDB)

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("feelings", "0001_initial"),
        ("journal", "0003_journalentry_group"),
        ("users", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="DailyPatientMetric",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("date", models.DateField(db_index=True)),
                ("journal_entries_count", models.PositiveIntegerField(default=0)),
                ("shareable_entries_count", models.PositiveIntegerField(default=0)),
                ("tasks_total", models.PositiveIntegerField(default=0)),
                ("tasks_completed", models.PositiveIntegerField(default=0)),
                ("tasks_completion_rate", models.FloatField(default=0.0)),
                ("positive_feelings_count", models.PositiveIntegerField(default=0)),
                ("negative_feelings_count", models.PositiveIntegerField(default=0)),
                ("neutral_feelings_count", models.PositiveIntegerField(default=0)),
                (
                    "dominant_feeling",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="daily_metrics_as_dominant",
                        to="feelings.feeling",
                    ),
                ),
                (
                    "patient",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="daily_metrics",
                        to="users.patientprofile",
                    ),
                ),
            ],
            options={
                "verbose_name": "métrica diaria paciente",
                "verbose_name_plural": "métricas diarias paciente",
                "ordering": ["-date"],
            },
        ),
        migrations.CreateModel(
            name="FeelingTimeSeries",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("recorded_at", models.DateTimeField(db_index=True)),
                (
                    "feeling",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="timeseries_records",
                        to="feelings.feeling",
                    ),
                ),
                (
                    "journal_entry",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="feeling_timeseries_records",
                        to="journal.journalentry",
                    ),
                ),
                (
                    "patient",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="feeling_timeseries",
                        to="users.patientprofile",
                    ),
                ),
            ],
            options={
                "verbose_name": "serie sentimiento",
                "verbose_name_plural": "series sentimientos",
                "ordering": ["-recorded_at"],
            },
        ),
        migrations.CreateModel(
            name="ResearchMetric",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("period_start", models.DateField(db_index=True)),
                ("period_end", models.DateField()),
                ("therapist_hash", models.CharField(max_length=64)),
                ("patient_hash", models.CharField(max_length=64)),
                ("avg_completion_rate", models.FloatField()),
                ("avg_positive_feeling_ratio", models.FloatField()),
                ("journal_frequency_per_week", models.FloatField()),
                ("treatment_week", models.PositiveIntegerField()),
                ("consented", models.BooleanField(default=True)),
            ],
            options={
                "verbose_name": "métrica investigación",
                "verbose_name_plural": "métricas investigación",
                "ordering": ["-period_start"],
            },
        ),
        migrations.AddConstraint(
            model_name="dailypatientmetric",
            constraint=models.UniqueConstraint(
                fields=("patient", "date"),
                name="analytics_dailypatientmetric_unique_patient_date",
            ),
        ),
        migrations.AddConstraint(
            model_name="researchmetric",
            constraint=models.UniqueConstraint(
                fields=("period_start", "period_end", "therapist_hash", "patient_hash"),
                name="analytics_researchmetric_unique_period_therapist_patient",
            ),
        ),
    ]
