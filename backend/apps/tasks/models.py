from django.db import models


class Task(models.Model):
    """Tarea asignada a un vínculo (individual) o a un grupo (grupal)."""

    link = models.ForeignKey(
        "links.TherapistPatientLink",
        on_delete=models.CASCADE,
        related_name="tasks",
        null=True,
        blank=True,
    )
    group = models.ForeignKey(
        "links.Group",
        on_delete=models.CASCADE,
        related_name="tasks",
        null=True,
        blank=True,
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    due_date = models.DateField(null=True, blank=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} – {self.link}"

    class Meta:
        ordering = ["order", "-created_at"]
        verbose_name = "Tarea"
        verbose_name_plural = "Tareas"


class TaskProgress(models.Model):
    """Progreso/estado de una tarea (uno por paciente en tareas grupales)."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pendiente"
        IN_PROGRESS = "in_progress", "En progreso"
        DONE = "done", "Hecho"

    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name="progress_list",
    )
    patient = models.ForeignKey(
        "users.PatientProfile",
        on_delete=models.CASCADE,
        related_name="task_progress",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    note = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.task}: {self.get_status_display()}"

    class Meta:
        ordering = ["-updated_at"]
        verbose_name = "Progreso de tarea"
        verbose_name_plural = "Progresos de tarea"
        constraints = [
            models.UniqueConstraint(
                fields=["task", "patient"],
                name="tasks_taskprogress_unique_task_patient",
            )
        ]
