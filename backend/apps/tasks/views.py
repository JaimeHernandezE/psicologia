from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response

from apps.core.permissions import IsTherapist, IsPatient, IsTherapistOrPatient
from apps.users.models import User

from .models import Task, TaskProgress
from .serializers import TaskSerializer, TaskProgressSerializer


class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [IsTherapistOrPatient]
    filter_backends = [OrderingFilter, SearchFilter]
    search_fields = ["title", "description"]
    ordering_fields = ["due_date", "created_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        user = self.request.user
        scope = self.request.query_params.get("scope")
        if user.role == User.Role.THERAPIST:
            qs = Task.objects.filter(
                Q(link__therapist__user=user) | Q(group__therapist__user=user)
            ).select_related("link", "group").prefetch_related("progress_list", "progress_list__patient")
            if scope == "individual":
                qs = qs.filter(group__isnull=True)
            elif scope == "group":
                qs = qs.filter(group__isnull=False)
        else:
            from apps.links.models import GroupMembership

            patient_id = user.patient_profile.id
            qs = Task.objects.filter(
                Q(link__patient__user=user)
                | Q(
                    group__memberships__patient_id=patient_id,
                    group__memberships__is_active=True,
                )
            ).select_related("link", "group").prefetch_related("progress_list", "progress_list__patient").distinct()
            if scope == "individual":
                qs = qs.filter(group__isnull=True)
            elif scope == "group":
                qs = qs.filter(group__isnull=False)
        return qs

    def filter_queryset(self, queryset):
        qs = super().filter_queryset(queryset)
        if self.request.user.role == User.Role.THERAPIST:
            link_id = self.request.query_params.get("link_id")
            if link_id:
                qs = qs.filter(link_id=link_id)
        status_param = self.request.query_params.get("status")
        if status_param in ("pending", "in_progress", "done"):
            qs = qs.filter(progress_list__status=status_param).distinct()
        date_from = self.request.query_params.get("date_from")
        if date_from:
            qs = qs.filter(due_date__date__gte=date_from)
        date_to = self.request.query_params.get("date_to")
        if date_to:
            qs = qs.filter(due_date__date__lte=date_to)
        return qs

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsTherapist()]
        return super().get_permissions()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        link = data.get("link")
        group = data.get("group")
        if not link and not group:
            return Response(
                {"detail": "Indica link (tarea individual) o group (tarea grupal)."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if link and group:
            return Response(
                {"detail": "Solo uno de link o group."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if link and link.therapist_id != request.user.therapist_profile.id:
            return Response({"detail": "No eres el tratante de este vínculo."}, status=status.HTTP_403_FORBIDDEN)
        if group and group.therapist_id != request.user.therapist_profile.id:
            return Response({"detail": "No eres el tratante de este grupo."}, status=status.HTTP_403_FORBIDDEN)
        task = serializer.save()
        return Response(TaskSerializer(task).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        therapist_id = (instance.link and instance.link.therapist_id) or (
            instance.group and instance.group.therapist_id
        )
        if therapist_id != request.user.therapist_profile.id:
            return Response({"detail": "Solo el tratante puede editar la tarea."}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        therapist_id = (instance.link and instance.link.therapist_id) or (
            instance.group and instance.group.therapist_id
        )
        if therapist_id != request.user.therapist_profile.id:
            return Response({"detail": "Solo el tratante puede eliminar la tarea."}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)


class TaskProgressViewSet(viewsets.ModelViewSet):
    serializer_class = TaskProgressSerializer
    permission_classes = [IsTherapistOrPatient]
    http_method_names = ["get", "put", "patch"]

    def get_queryset(self):
        user = self.request.user
        if user.role == User.Role.THERAPIST:
            return TaskProgress.objects.filter(
                Q(task__link__therapist__user=user) | Q(task__group__therapist__user=user)
            ).select_related("task", "task__link", "task__group", "patient")
        return TaskProgress.objects.filter(patient__user=user).select_related("task", "task__link", "task__group", "patient")

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        if request.user.role == User.Role.PATIENT and instance.patient_id != request.user.patient_profile.id:
            return Response({"detail": "No es tu tarea."}, status=status.HTTP_403_FORBIDDEN)
        if request.user.role == User.Role.THERAPIST:
            return Response({"detail": "El tratante no puede editar el progreso."}, status=status.HTTP_403_FORBIDDEN)
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def update(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)
