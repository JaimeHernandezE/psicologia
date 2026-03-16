from rest_framework import serializers
from .models import Task, TaskProgress


class TaskProgressSerializer(serializers.ModelSerializer):
    patient = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = TaskProgress
        fields = ("id", "task", "patient", "status", "note", "updated_at", "completed_at")
        read_only_fields = ("updated_at",)


class TaskSerializer(serializers.ModelSerializer):
    progress_list = TaskProgressSerializer(many=True, read_only=True)
    progress = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = (
            "id",
            "link",
            "group",
            "title",
            "description",
            "due_date",
            "order",
            "created_at",
            "progress_list",
            "progress",
        )
        read_only_fields = ("created_at",)

    def get_progress(self, obj):
        """Progreso del paciente actual (para compatibilidad con frontend)."""
        request = self.context.get("request")
        if not request or not getattr(request.user, "patient_profile", None):
            return None
        pid = request.user.patient_profile.id
        for p in obj.progress_list.all():
            if p.patient_id == pid:
                return TaskProgressSerializer(p).data
        return None
