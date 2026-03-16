from django.db import transaction
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, extend_schema_view

from apps.core.permissions import IsTherapist, IsPatient, IsTherapistOrPatient
from apps.users.models import User
from apps.links.models import TherapistPatientLink
from apps.journal.models import JournalEntry

from .claude import generate_summary_from_entries
from .models import Summary, SummaryEntry
from .serializers import SummarySerializer, SummaryCreateSerializer


@extend_schema_view(
    list=extend_schema(summary="Listar resúmenes", description="Terapeuta: solo enviados (is_sent). Paciente: todos los suyos."),
    retrieve=extend_schema(summary="Detalle de resumen"),
    partial_update=extend_schema(summary="Editar resumen", description="El paciente puede editar body_edited antes de enviar."),
)
class SummaryViewSet(viewsets.ModelViewSet):
    serializer_class = SummarySerializer
    permission_classes = [IsTherapistOrPatient]
    filter_backends = [OrderingFilter, SearchFilter]
    search_fields = ["body_ai", "body_edited"]
    ordering_fields = ["sent_at", "created_at"]
    ordering = ["-sent_at"]

    def _therapist_queryset(self):
        return Summary.objects.filter(link__therapist__user=self.request.user).select_related("link")

    def _patient_queryset(self):
        return Summary.objects.filter(link__patient__user=self.request.user).select_related("link")

    def get_queryset(self):
        if self.request.user.role == User.Role.THERAPIST:
            return self._therapist_queryset().filter(is_sent=True)
        return self._patient_queryset()

    def filter_queryset(self, queryset):
        qs = super().filter_queryset(queryset)
        if self.request.user.role == User.Role.THERAPIST:
            patient_id = self.request.query_params.get("patient_id")
            if patient_id:
                qs = qs.filter(link__patient_id=patient_id)
            date_from = self.request.query_params.get("date_from")
            if date_from:
                qs = qs.filter(sent_at__date__gte=date_from)
            date_to = self.request.query_params.get("date_to")
            if date_to:
                qs = qs.filter(sent_at__date__lte=date_to)
        return qs

    def get_permissions(self):
        if self.action in ("generate", "send"):
            return [IsPatient()]
        return super().get_permissions()

    def create(self, request, *args, **kwargs):
        return Response(
            {"detail": "Usa POST /summaries/generate/ para crear un resumen."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    @extend_schema(summary="Generar resumen con IA", description="Envía entradas de diario (shareable) a Claude; crea el resumen con body_ai y lo devuelve para que el paciente edite body_edited.")
    @action(detail=False, methods=["post"], url_path="generate")
    def generate(self, request):
        serializer = SummaryCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        link_id = serializer.validated_data["link_id"]
        entry_ids = serializer.validated_data["journal_entry_ids"]

        try:
            link = TherapistPatientLink.objects.get(
                pk=link_id,
                patient__user=request.user,
            )
        except TherapistPatientLink.DoesNotExist:
            return Response(
                {"detail": "Vínculo no encontrado o no eres el paciente."},
                status=status.HTTP_404_NOT_FOUND,
            )

        entries = JournalEntry.objects.filter(
            pk__in=entry_ids,
            patient=link.patient,
            visibility=JournalEntry.Visibility.SHAREABLE,
        ).order_by("created_at")
        if entries.count() != len(entry_ids):
            return Response(
                {"detail": "Algunas entradas no existen, no son tuyas o no son compartibles."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            body_ai = generate_summary_from_entries([e.body for e in entries])
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {"detail": f"Error al generar resumen: {e}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        with transaction.atomic():
            summary = Summary.objects.create(link=link, body_ai=body_ai)
            for entry in entries:
                SummaryEntry.objects.create(summary=summary, journal_entry=entry)
        return Response(SummarySerializer(summary).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.link.patient_id != request.user.patient_profile.id:
            return Response({"detail": "No puedes editar este resumen."}, status=status.HTTP_403_FORBIDDEN)
        if "body_edited" not in request.data:
            return Response(SummarySerializer(instance).data)
        instance.body_edited = request.data.get("body_edited", instance.body_edited)
        instance.save(update_fields=["body_edited"])
        return Response(SummarySerializer(instance).data)

    @extend_schema(summary="Enviar resumen al terapeuta", description="Marca el resumen como enviado: sent_at=now, undo_deadline=now+15s, is_sent=True.")
    @action(detail=True, methods=["post"], url_path="send")
    def send(self, request, pk=None):
        summary = self.get_object()
        if summary.link.patient_id != request.user.patient_profile.id:
            return Response({"detail": "No puedes enviar este resumen."}, status=status.HTTP_403_FORBIDDEN)
        now = timezone.now()
        from datetime import timedelta
        summary.sent_at = now
        summary.undo_deadline = now + timedelta(seconds=15)
        summary.is_sent = True
        summary.save(update_fields=["sent_at", "undo_deadline", "is_sent"])
        return Response(SummarySerializer(summary).data)
