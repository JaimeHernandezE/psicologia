"""
Funciones para poblar métricas diarias y series temporales.
Se ejecutan manualmente o vía señales; luego con Celery.
"""
from datetime import date, datetime, timedelta

from django.db.models import Count, Q
from django.utils import timezone

from apps.feelings.models import JournalEntryFeeling
from apps.journal.models import JournalEntry
from apps.links.models import TherapistPatientLink
from apps.tasks.models import Task, TaskProgress

from .models import DailyPatientMetric, FeelingTimeSeries, ResearchMetric


def calculate_daily_metrics(patient_id, day_date):
    """
    Calcula y guarda/actualiza DailyPatientMetric para un paciente en una fecha.
    Cruza JournalEntry, TaskProgress, JournalEntryFeeling del día.
    """
    if isinstance(day_date, str):
        day_date = date.fromisoformat(day_date)
    day_start = timezone.make_aware(
        datetime.combine(day_date, datetime.min.time())
    )
    day_end = day_start + timedelta(days=1)

    # Entradas de diario del día
    entries = JournalEntry.objects.filter(
        patient_id=patient_id,
        created_at__gte=day_start,
        created_at__lt=day_end,
    )
    journal_entries_count = entries.count()
    shareable_entries_count = entries.filter(
        visibility=JournalEntry.Visibility.SHAREABLE
    ).count()

    # Tareas: las asignadas al paciente (vía link o grupo) y su progreso
    from apps.links.models import GroupMembership

    patient_links = TherapistPatientLink.objects.filter(
        patient_id=patient_id, status=TherapistPatientLink.Status.ACTIVE
    ).values_list("id", flat=True)
    group_ids = GroupMembership.objects.filter(
        patient_id=patient_id, is_active=True
    ).values_list("group_id", flat=True)
    tasks_of_patient = Task.objects.filter(
        Q(link_id__in=patient_links) | Q(group_id__in=group_ids)
    ).filter(created_at__lt=day_end)
    tasks_total = tasks_of_patient.count()
    progress_done = TaskProgress.objects.filter(
        task__in=tasks_of_patient,
        patient_id=patient_id,
        status=TaskProgress.Status.DONE,
    )
    tasks_completed = progress_done.count()
    tasks_completion_rate = (
        (tasks_completed / tasks_total) if tasks_total else 0.0
    )

    # Sentimientos del día (vía JournalEntryFeeling en entradas del día)
    entry_ids = list(entries.values_list("id", flat=True))
    feeling_counts = (
        JournalEntryFeeling.objects.filter(journal_entry_id__in=entry_ids)
        .values("feeling_id")
        .annotate(c=Count("id"))
        .order_by("-c")
    )
    dominant_feeling_id = None
    if feeling_counts:
        dominant_feeling_id = feeling_counts[0]["feeling_id"]

    # Clasificación positivo/negativo/neutral: sin campo en Feeling, dejamos 0
    # o se puede extender el modelo Feeling con un tag después
    positive_feelings_count = 0
    negative_feelings_count = 0
    neutral_feelings_count = 0

    metric, _ = DailyPatientMetric.objects.update_or_create(
        patient_id=patient_id,
        date=day_date,
        defaults={
            "journal_entries_count": journal_entries_count,
            "shareable_entries_count": shareable_entries_count,
            "tasks_total": tasks_total,
            "tasks_completed": tasks_completed,
            "tasks_completion_rate": round(tasks_completion_rate, 4),
            "dominant_feeling_id": dominant_feeling_id,
            "positive_feelings_count": positive_feelings_count,
            "negative_feelings_count": negative_feelings_count,
            "neutral_feelings_count": neutral_feelings_count,
        },
    )
    return metric


def calculate_metrics_range(patient_id, date_from, date_to):
    """Llama a calculate_daily_metrics para cada día del rango."""
    if isinstance(date_from, str):
        date_from = date.fromisoformat(date_from)
    if isinstance(date_to, str):
        date_to = date.fromisoformat(date_to)
    current = date_from
    while current <= date_to:
        calculate_daily_metrics(patient_id, current)
        current += timedelta(days=1)


def update_feeling_timeseries(journal_entry_id):
    """
    Cuando se agrega un sentimiento a una entrada, inserta en FeelingTimeSeries.
    Llamar por cada JournalEntryFeeling creado (o en batch por entrada).
    """
    from apps.feelings.models import JournalEntryFeeling
    from apps.journal.models import JournalEntry

    entry = JournalEntry.objects.filter(pk=journal_entry_id).select_related("patient").first()
    if not entry:
        return
    now = timezone.now()
    for jef in JournalEntryFeeling.objects.filter(journal_entry_id=journal_entry_id).select_related("feeling"):
        FeelingTimeSeries.objects.get_or_create(
            patient=entry.patient,
            feeling=jef.feeling,
            journal_entry_id=journal_entry_id,
            defaults={"recorded_at": now},
        )


def generate_research_metrics(period_start, period_end):
    """
    Genera ResearchMetric anonimizadas para todos los pacientes con
    research_consent=True en el rango indicado.
    """
    import hashlib

    from django.db.models import Avg, Sum

    from apps.users.models import PatientProfile

    if isinstance(period_start, str):
        period_start = date.fromisoformat(period_start)
    if isinstance(period_end, str):
        period_end = date.fromisoformat(period_end)

    consented_patients = PatientProfile.objects.filter(
        research_consent=True
    ).select_related("user")
    for profile in consented_patients:
        link = (
            TherapistPatientLink.objects.filter(
                patient=profile,
                status=TherapistPatientLink.Status.ACTIVE,
            )
            .select_related("therapist")
            .first()
        )
        if not link or not link.activated_at:
            continue
        therapist_hash = hashlib.sha256(
            str(link.therapist_id).encode()
        ).hexdigest()
        patient_hash = hashlib.sha256(
            str(profile.id).encode()
        ).hexdigest()
        start = max(period_start, link.activated_at.date())
        if start > period_end:
            continue
        days = (period_end - start).days or 1
        treatment_week = (start - link.activated_at.date()).days // 7 + 1

        metrics = DailyPatientMetric.objects.filter(
            patient=profile,
            date__gte=start,
            date__lte=period_end,
        )
        agg = metrics.aggregate(
            avg_rate=Avg("tasks_completion_rate"),
            pos=Sum("positive_feelings_count"),
            neg=Sum("negative_feelings_count"),
            neu=Sum("neutral_feelings_count"),
        )
        total_feelings = (agg["pos"] or 0) + (agg["neg"] or 0) + (agg["neu"] or 0)
        avg_positive_ratio = (
            (agg["pos"] / total_feelings) if total_feelings else 0.0
        )
        journal_days = metrics.count()
        journal_frequency_per_week = (journal_days * 7.0) / days if days else 0.0

        ResearchMetric.objects.update_or_create(
            period_start=period_start,
            period_end=period_end,
            therapist_hash=therapist_hash,
            patient_hash=patient_hash,
            defaults={
                "treatment_week": treatment_week,
                "avg_completion_rate": float(agg["avg_rate"] or 0.0),
                "avg_positive_feeling_ratio": round(avg_positive_ratio, 4),
                "journal_frequency_per_week": round(journal_frequency_per_week, 4),
                "consented": True,
            },
        )
