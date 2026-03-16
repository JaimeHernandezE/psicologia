"""
Señales para mantener métricas y series al día.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.feelings.models import JournalEntryFeeling
from apps.journal.models import JournalEntry
from apps.tasks.models import TaskProgress

from .tasks import calculate_daily_metrics, update_feeling_timeseries


@receiver(post_save, sender=TaskProgress)
def on_task_progress_save(sender, instance, created, **kwargs):
    """Recalcula métrica diaria del paciente para hoy."""
    if not instance.patient_id:
        return
    from django.utils import timezone
    today = timezone.localdate()
    calculate_daily_metrics(instance.patient_id, today)


@receiver(post_save, sender=JournalEntryFeeling)
def on_journal_entry_feeling_save(sender, instance, created, **kwargs):
    """Inserta en FeelingTimeSeries y recalcula métrica del día."""
    if created:
        update_feeling_timeseries(instance.journal_entry_id)
    entry = instance.journal_entry
    if entry and entry.patient_id:
        from django.utils import timezone
        today = timezone.localdate()
        calculate_daily_metrics(entry.patient_id, today)


@receiver(post_save, sender=JournalEntry)
def on_journal_entry_save(sender, instance, created, **kwargs):
    """Recalcula journal_entries_count (y shareable) del día."""
    if not instance.patient_id:
        return
    from django.utils import timezone
    today = timezone.localdate()
    calculate_daily_metrics(instance.patient_id, today)
