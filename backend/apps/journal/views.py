from rest_framework import viewsets
from rest_framework.filters import OrderingFilter

from apps.core.permissions import IsPatient

from .models import JournalEntry
from .serializers import JournalEntrySerializer


class JournalEntryViewSet(viewsets.ModelViewSet):
    serializer_class = JournalEntrySerializer
    permission_classes = [IsPatient]
    filter_backends = [OrderingFilter]
    ordering_fields = ["created_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return JournalEntry.objects.filter(patient__user=self.request.user)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["patient"] = getattr(self.request.user, "patient_profile", None)
        return context

    def perform_create(self, serializer):
        serializer.save(patient=self.request.user.patient_profile)

    def filter_queryset(self, queryset):
        qs = super().filter_queryset(queryset)
        visibility = self.request.query_params.get("visibility")
        if visibility in ("private", "shareable"):
            qs = qs.filter(visibility=visibility)
        return qs
