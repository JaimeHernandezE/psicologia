from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.permissions import IsTherapist, IsPatient, IsTherapistOrPatient
from apps.users.models import User

from .models import Group, GroupMembership, TherapistPatientLink
from .serializers import (
    TherapistPatientLinkSerializer,
    LinkInviteSerializer,
    GroupSerializer,
)


class LinkViewSet(viewsets.ModelViewSet):
    serializer_class = TherapistPatientLinkSerializer
    permission_classes = [IsTherapistOrPatient]

    def get_queryset(self):
        user = self.request.user
        if user.role == User.Role.THERAPIST:
            return TherapistPatientLink.objects.filter(therapist__user=user).select_related(
                "therapist__user", "patient__user", "group"
            )
        return TherapistPatientLink.objects.filter(
            patient__user=user, status=TherapistPatientLink.Status.ACTIVE
        ).select_related("therapist__user", "patient__user", "group")

    def get_permissions(self):
        if self.action == "create":
            return [IsTherapist()]
        return super().get_permissions()

    def create(self, request, *args, **kwargs):
        serializer = LinkInviteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        try:
            patient_user = User.objects.get(email=email, role=User.Role.PATIENT)
        except User.DoesNotExist:
            return Response(
                {"detail": "No existe un paciente con ese email."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        patient = patient_user.patient_profile
        therapist = request.user.therapist_profile
        if TherapistPatientLink.objects.filter(therapist=therapist, patient=patient).exists():
            return Response(
                {"detail": "Ya existe un vínculo con ese paciente."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        link = TherapistPatientLink.objects.create(
            therapist=therapist,
            patient=patient,
            status=TherapistPatientLink.Status.PENDING,
        )
        return Response(
            TherapistPatientLinkSerializer(link).data,
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        if request.user.role != User.Role.THERAPIST:
            return Response({"detail": "Solo el tratante puede editar el vínculo."}, status=status.HTTP_403_FORBIDDEN)
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if request.user.role != User.Role.THERAPIST:
            return Response({"detail": "Solo el tratante puede eliminar el vínculo."}, status=status.HTTP_403_FORBIDDEN)
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"], permission_classes=[IsPatient])
    def activate(self, request, pk=None):
        link = self.get_object()
        if link.patient_id != request.user.patient_profile_id:
            return Response({"detail": "No es tu invitación."}, status=status.HTTP_403_FORBIDDEN)
        if link.status != TherapistPatientLink.Status.PENDING:
            return Response(
                {"detail": "Este vínculo ya no está pendiente."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        link.status = TherapistPatientLink.Status.ACTIVE
        link.activated_at = timezone.now()
        link.save(update_fields=["status", "activated_at"])
        return Response(TherapistPatientLinkSerializer(link).data)


class GroupViewSet(viewsets.ModelViewSet):
    serializer_class = GroupSerializer
    permission_classes = [IsTherapist]

    def get_queryset(self):
        return Group.objects.filter(therapist__user=self.request.user).prefetch_related(
            "memberships__patient__user"
        )

    def perform_create(self, serializer):
        serializer.save(therapist=self.request.user.therapist_profile)
