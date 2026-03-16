from django.contrib.postgres.search import SearchQuery, SearchRank, SearchVector
from rest_framework import viewsets
from rest_framework.filters import OrderingFilter

from apps.core.permissions import IsPatient
from apps.links.models import GroupMembership

from .models import JournalEntry
from .serializers import JournalEntrySerializer


class JournalEntryViewSet(viewsets.ModelViewSet):
    serializer_class = JournalEntrySerializer
    permission_classes = [IsPatient]
    filter_backends = [OrderingFilter]
    ordering_fields = ["created_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        qs = JournalEntry.objects.filter(patient__user=self.request.user)
        group_id = self.request.query_params.get("group_id")
        if group_id:
            try:
                gid = int(group_id)
            except (TypeError, ValueError):
                return qs.none()
            if not GroupMembership.objects.filter(
                group_id=gid, patient=self.request.user.patient_profile, is_active=True
            ).exists():
                return qs.none()
            qs = qs.filter(group_id=gid)
        return qs

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["patient"] = getattr(self.request.user, "patient_profile", None)
        return context

    def perform_create(self, serializer):
        patient = self.request.user.patient_profile
        group = serializer.validated_data.get("group")
        if group:
            if not GroupMembership.objects.filter(
                group=group, patient=patient, is_active=True
            ).exists():
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("No perteneces a este grupo.")
        serializer.save(patient=patient)

    def filter_queryset(self, queryset):
        qs = super().filter_queryset(queryset)
        visibility = self.request.query_params.get("visibility")
        if visibility in ("private", "shareable"):
            qs = qs.filter(visibility=visibility)
        date_from = self.request.query_params.get("date_from")
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)
        date_to = self.request.query_params.get("date_to")
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)
        search = self.request.query_params.get("search", "").strip()
        if search:
            vector = SearchVector("body", config="spanish")
            query = SearchQuery(search, config="spanish")
            qs = qs.annotate(rank=SearchRank(vector, query)).filter(rank__gt=0).order_by("-rank", "-created_at")
        return qs
