from rest_framework import viewsets, status
from rest_framework.response import Response

from apps.core.permissions import IsTherapist, IsPatient, IsTherapistOrPatient
from apps.users.models import User

from .models import Task, TaskProgress
from .serializers import TaskSerializer, TaskProgressSerializer


class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [IsTherapistOrPatient]

    def get_queryset(self):
        user = self.request.user
        if user.role == User.Role.THERAPIST:
            return Task.objects.filter(link__therapist__user=user).select_related("link").prefetch_related("progress")
        return Task.objects.filter(link__patient__user=user).select_related("link").prefetch_related("progress")

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsTherapist()]
        return super().get_permissions()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        link = serializer.validated_data["link"]
        if link.therapist_id != request.user.therapist_profile.id:
            return Response({"detail": "No eres el tratante de este vínculo."}, status=status.HTTP_403_FORBIDDEN)
        task = serializer.save()
        TaskProgress.objects.get_or_create(task=task, defaults={"status": TaskProgress.Status.PENDING})
        return Response(TaskSerializer(task).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.link.therapist_id != request.user.therapist_profile.id:
            return Response({"detail": "Solo el tratante puede editar la tarea."}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.link.therapist_id != request.user.therapist_profile.id:
            return Response({"detail": "Solo el tratante puede eliminar la tarea."}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)


class TaskProgressViewSet(viewsets.ModelViewSet):
    serializer_class = TaskProgressSerializer
    permission_classes = [IsTherapistOrPatient]
    http_method_names = ["get", "put", "patch"]

    def get_queryset(self):
        user = self.request.user
        if user.role == User.Role.THERAPIST:
            return TaskProgress.objects.filter(task__link__therapist__user=user).select_related("task", "task__link")
        return TaskProgress.objects.filter(task__link__patient__user=user).select_related("task", "task__link")

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        if request.user.role == User.Role.PATIENT and instance.task.link.patient_id != request.user.patient_profile.id:
            return Response({"detail": "No es tu tarea."}, status=status.HTTP_403_FORBIDDEN)
        if request.user.role == User.Role.THERAPIST:
            return Response({"detail": "El tratante no puede editar el progreso."}, status=status.HTTP_403_FORBIDDEN)
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def update(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)
