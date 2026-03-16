from collections import defaultdict

from django.db.models import Count, Q
from django.db.models.functions import TruncDay, TruncMonth, TruncWeek
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsPatient, IsTherapist, IsTherapistOrPatient
from apps.journal.models import JournalEntry
from apps.links.models import TherapistPatientLink

from .models import Feeling
from .serializers import FeelingCreateSerializer, FeelingSerializer


class FeelingViewSet(viewsets.ModelViewSet):
    serializer_class = FeelingSerializer
    queryset = Feeling.objects.filter(is_active=True)
    permission_classes = [IsTherapistOrPatient]

    def get_queryset(self):
        user = self.request.user
        qs = Feeling.objects.filter(is_active=True)
        is_system_param = self.request.query_params.get("is_system")
        if user.role == user.Role.THERAPIST:
            qs = qs.filter(
                Q(is_system=True) | Q(therapist=user.therapist_profile),
            )
        else:
            # paciente: sentimientos del sistema + del terapeuta activo
            link = (
                TherapistPatientLink.objects.filter(
                    patient__user=user,
                    status=TherapistPatientLink.Status.ACTIVE,
                )
                .select_related("therapist")
                .first()
            )
            therapist = link.therapist if link else None
            qs = qs.filter(Q(is_system=True) | Q(therapist=therapist))
        if is_system_param in ("true", "false"):
            qs = qs.filter(is_system=(is_system_param == "true"))
        return qs.order_by("order", "title")

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsTherapist()]
        return super().get_permissions()

    def get_serializer_class(self):
        if self.action == "create":
            return FeelingCreateSerializer
        return FeelingSerializer

    def perform_create(self, serializer):
        serializer.save()

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_system or instance.therapist_id != request.user.therapist_profile.id:
            return Response(
                {"detail": "No puedes editar este sentimiento."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_system or instance.therapist_id != request.user.therapist_profile.id:
            return Response(
                {"detail": "No puedes eliminar este sentimiento."},
                status=status.HTTP_403_FORBIDDEN,
            )
        instance.is_active = False
        instance.save(update_fields=["is_active"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class FeelingChartView(APIView):
    permission_classes = [IsTherapist]

    def get(self, request):
        patient_id = request.query_params.get("patient_id")
        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")
        granularity = request.query_params.get("granularity", "day")

        if not patient_id:
            return Response(
                {"detail": "Indica patient_id."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        link = TherapistPatientLink.objects.filter(
            therapist=request.user.therapist_profile,
            patient_id=patient_id,
            status=TherapistPatientLink.Status.ACTIVE,
        ).first()
        if not link:
            return Response(
                {"detail": "Paciente no vinculado o no activo."},
                status=status.HTTP_404_NOT_FOUND,
            )

        qs = JournalEntry.objects.filter(
            patient_id=patient_id,
            visibility=JournalEntry.Visibility.SHAREABLE,
        )
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)

        if granularity == "week":
            trunc_fn = TruncWeek
        elif granularity == "month":
            trunc_fn = TruncMonth
        else:
            trunc_fn = TruncDay

        agg = (
            qs.values("feelings", "feelings__title", "feelings__color", "feelings__emoji")
            .annotate(period=trunc_fn("created_at"))
            .exclude(feelings__isnull=True)
            .values(
                "feelings",
                "feelings__title",
                "feelings__color",
                "feelings__emoji",
                "period",
            )
            .annotate(count=Count("id"))
            .order_by("period")
        )

        periods = sorted({row["period"].date() for row in agg})
        labels = [p.isoformat() for p in periods]

        dataset_map: dict[int, dict] = {}
        index_by_label = {label: idx for idx, label in enumerate(labels)}
        for row in agg:
            fid = row["feelings"]
            if fid not in dataset_map:
                dataset_map[fid] = {
                    "feeling": {
                        "title": row["feelings__title"],
                        "color": row["feelings__color"],
                        "emoji": row["feelings__emoji"],
                    },
                    "data": [0] * len(labels),
                }
            label = row["period"].date().isoformat()
            idx = index_by_label[label]
            dataset_map[fid]["data"][idx] = row["count"]

        datasets = list(dataset_map.values())
        return Response({"labels": labels, "datasets": datasets})

