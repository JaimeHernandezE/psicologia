from rest_framework import viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.core.permissions import IsTherapist, IsPatient
from apps.users.models import User

from .models import SessionAlert, NotificationPreference
from .serializers import SessionAlertSerializer, NotificationPreferenceSerializer


class SessionAlertViewSet(viewsets.ModelViewSet):
    serializer_class = SessionAlertSerializer
    permission_classes = [IsTherapist]

    def get_queryset(self):
        return SessionAlert.objects.filter(link__therapist__user=self.request.user).select_related("link")

    def perform_create(self, serializer):
        link = serializer.validated_data["link"]
        if link.therapist_id != self.request.user.therapist_profile_id:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("No eres el tratante de este vínculo.")
        serializer.save()


class NotificationPreferenceView(APIView):
    permission_classes = [IsPatient]

    def get(self, request):
        try:
            pref = request.user.patient_profile.notification_preference
        except NotificationPreference.DoesNotExist:
            pref = NotificationPreference.objects.create(patient=request.user.patient_profile)
        return Response(NotificationPreferenceSerializer(pref).data)

    def patch(self, request):
        try:
            pref = request.user.patient_profile.notification_preference
        except NotificationPreference.DoesNotExist:
            pref = NotificationPreference.objects.create(patient=request.user.patient_profile)
        serializer = NotificationPreferenceSerializer(pref, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
