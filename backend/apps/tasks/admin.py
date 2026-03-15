from django.contrib import admin
from .models import Task, TaskProgress


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ("title", "link", "order", "due_date", "created_at")
    list_filter = ("link",)
    raw_id_fields = ("link",)
    date_hierarchy = "created_at"
    search_fields = ("title", "description")


@admin.register(TaskProgress)
class TaskProgressAdmin(admin.ModelAdmin):
    list_display = ("task", "status", "updated_at", "completed_at")
    list_filter = ("status",)
    raw_id_fields = ("task",)
    date_hierarchy = "updated_at"
