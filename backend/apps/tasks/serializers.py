from rest_framework import serializers
from .models import Task, TaskProgress


class TaskProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskProgress
        fields = ("id", "task", "status", "note", "updated_at", "completed_at")
        read_only_fields = ("updated_at",)


class TaskSerializer(serializers.ModelSerializer):
    progress = TaskProgressSerializer(read_only=True)

    class Meta:
        model = Task
        fields = (
            "id",
            "link",
            "title",
            "description",
            "due_date",
            "order",
            "created_at",
            "progress",
        )
        read_only_fields = ("created_at",)
