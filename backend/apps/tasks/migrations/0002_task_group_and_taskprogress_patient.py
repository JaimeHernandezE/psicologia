# Generated manually for group tasks

import django.db.models.deletion
from django.db import migrations, models


def backfill_taskprogress_patient(apps, schema_editor):
    TaskProgress = apps.get_model("tasks", "TaskProgress")
    for tp in TaskProgress.objects.select_related("task", "task__link").filter(task__link__isnull=False):
        tp.patient_id = tp.task.link.patient_id
        tp.save(update_fields=["patient_id"])


class Migration(migrations.Migration):

    dependencies = [
        ("tasks", "0001_initial"),
        ("links", "0003_add_group_and_membership_is_active"),
        ("users", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="task",
            name="group",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="tasks",
                to="links.group",
            ),
        ),
        migrations.AlterField(
            model_name="task",
            name="link",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="tasks",
                to="links.therapistpatientlink",
            ),
        ),
        migrations.AddField(
            model_name="taskprogress",
            name="patient",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="task_progress",
                to="users.patientprofile",
            ),
        ),
        migrations.RunPython(backfill_taskprogress_patient, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="taskprogress",
            name="patient",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="task_progress",
                to="users.patientprofile",
            ),
        ),
        migrations.AlterField(
            model_name="taskprogress",
            name="task",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="progress_list",
                to="tasks.task",
            ),
        ),
        migrations.AddConstraint(
            model_name="taskprogress",
            constraint=models.UniqueConstraint(fields=("task", "patient"), name="tasks_taskprogress_unique_task_patient"),
        ),
    ]
