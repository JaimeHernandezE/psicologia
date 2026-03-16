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
            qs = TherapistPatientLink.objects.filter(therapist__user=user).select_related(
                "therapist__user", "patient__user", "group"
            )
        else:
            # Paciente: ve todos sus links (pending + active) para poder aceptar invitaciones
            qs = TherapistPatientLink.objects.filter(patient__user=user).select_related(
                "therapist__user", "patient__user", "group"
            )
        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)
        return qs

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
        if link.patient_id != request.user.patient_profile.id:
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
        return Group.objects.filter(
            therapist__user=self.request.user, is_active=True
        ).prefetch_related(
            "memberships__patient__user",
            "group_summaries",
        )

    def get_permissions(self):
        if self.action == "patient_groups":
            return [IsPatient()]
        return [IsTherapist()]

    def perform_create(self, serializer):
        serializer.save(therapist=self.request.user.therapist_profile)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_active = False
        instance.save(update_fields=["is_active"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, url_path="patient", methods=["get"], permission_classes=[IsPatient])
    def patient_groups(self, request):
        """Grupos donde el paciente es miembro activo."""
        qs = Group.objects.filter(
            memberships__patient=request.user.patient_profile,
            memberships__is_active=True,
            is_active=True,
        ).prefetch_related("memberships__patient__user").distinct()
        serializer = GroupSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="add_member")
    def add_member(self, request, pk=None):
        group = self.get_object()
        patient_id = request.data.get("patient_id")
        if not patient_id:
            return Response(
                {"detail": "Indica patient_id."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        link = TherapistPatientLink.objects.filter(
            therapist=group.therapist,
            patient_id=patient_id,
            status=TherapistPatientLink.Status.ACTIVE,
        ).first()
        if not link:
            return Response(
                {"detail": "No hay vínculo activo con ese paciente o no es tuyo."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        membership, created = GroupMembership.objects.get_or_create(
            group=group,
            patient_id=patient_id,
            defaults={"is_active": True},
        )
        if not created and not membership.is_active:
            membership.is_active = True
            membership.save(update_fields=["is_active"])
        serializer = GroupSerializer(group)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="remove_member")
    def remove_member(self, request, pk=None):
        group = self.get_object()
        membership_id = request.data.get("membership_id")
        if not membership_id:
            return Response(
                {"detail": "Indica membership_id."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        membership = GroupMembership.objects.filter(
            group=group, id=membership_id
        ).first()
        if not membership:
            return Response(
                {"detail": "Miembro no encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )
        membership.is_active = False
        membership.save(update_fields=["is_active"])
        serializer = GroupSerializer(group)
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="summaries")
    def summaries(self, request, pk=None):
        """Resúmenes is_sent de todos los miembros activos, agrupados por paciente."""
        from apps.summaries.models import Summary

        group = self.get_object()
        patient_ids = list(
            GroupMembership.objects.filter(
                group=group, is_active=True
            ).values_list("patient_id", flat=True)
        )
        from apps.links.models import TherapistPatientLink

        links = TherapistPatientLink.objects.filter(
            therapist=group.therapist,
            patient_id__in=patient_ids,
            status=TherapistPatientLink.Status.ACTIVE,
        ).select_related("patient__user")
        result = []
        for link in links:
            summaries_qs = Summary.objects.filter(
                link=link, is_sent=True
            ).order_by("-sent_at")
            result.append({
                "patient_id": link.patient_id,
                "patient_email": link.patient.user.email,
                "summaries": [
                    {
                        "id": s.id,
                        "body_ai": s.body_ai,
                        "body_edited": s.body_edited,
                        "sent_at": s.sent_at,
                    }
                    for s in summaries_qs
                ],
            })
        return Response(result)

    @action(detail=True, methods=["post"], url_path="generate_group_summary")
    def generate_group_summary(self, request, pk=None):
        """Genera resumen grupal con Claude a partir de summary_ids."""
        from apps.summaries.models import Summary, GroupSummary
        from apps.summaries.claude import generate_summary_from_entries  # reutilizar o crear función grupal

        group = self.get_object()
        summary_ids = request.data.get("summary_ids", [])
        if not summary_ids:
            return Response(
                {"detail": "Indica summary_ids."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        summaries = Summary.objects.filter(
            id__in=summary_ids,
            is_sent=True,
            link__therapist=group.therapist,
            link__patient__in=[m.patient for m in group.memberships.filter(is_active=True)],
        ).select_related("link__patient__user")
        if summaries.count() != len(summary_ids):
            return Response(
                {"detail": "Algunos resúmenes no existen o no pertenecen al grupo."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        texts = [s.body_edited.strip() or s.body_ai for s in summaries]
        try:
            body_ai = generate_summary_from_entries(texts)
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        gs = GroupSummary.objects.create(
            group=group,
            body_ai=body_ai,
            created_by=request.user.therapist_profile,
        )
        return Response({
            "id": gs.id,
            "body_ai": gs.body_ai,
            "body_edited": gs.body_edited,
            "created_at": gs.created_at,
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["patch"], url_path="group_summaries/(?P<summary_pk>[^/.]+)")
    def update_group_summary(self, request, pk=None, summary_pk=None):
        """Actualiza body_edited de un resumen grupal."""
        from apps.summaries.models import GroupSummary
        from apps.summaries.serializers import GroupSummarySerializer

        group = self.get_object()
        gs = GroupSummary.objects.filter(group=group, id=summary_pk).first()
        if not gs:
            return Response({"detail": "Resumen grupal no encontrado."}, status=status.HTTP_404_NOT_FOUND)
        body_edited = request.data.get("body_edited")
        if body_edited is not None:
            gs.body_edited = body_edited
            gs.save(update_fields=["body_edited"])
        return Response(GroupSummarySerializer(gs).data)
