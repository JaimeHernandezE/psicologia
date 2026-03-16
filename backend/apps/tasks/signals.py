from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Task, TaskProgress


@receiver(post_save, sender=Task)
def create_task_progress_for_members(sender, instance, created, **kwargs):
    if not created:
        return
    if instance.link_id:
        TaskProgress.objects.get_or_create(
            task=instance,
            patient_id=instance.link.patient_id,
            defaults={"status": TaskProgress.Status.PENDING},
        )
    elif instance.group_id:
        from apps.links.models import GroupMembership

        for membership in GroupMembership.objects.filter(group_id=instance.group_id, is_active=True):
            TaskProgress.objects.get_or_create(
                task=instance,
                patient_id=membership.patient_id,
                defaults={"status": TaskProgress.Status.PENDING},
            )
