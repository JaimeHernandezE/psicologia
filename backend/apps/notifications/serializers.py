from rest_framework import serializers
from .models import SessionAlert, NotificationPreference


class SessionAlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = SessionAlert
        fields = ("id", "link", "session_date", "notify_before_days", "is_active")


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = (
            "id",
            "patient",
            "reminders_enabled",
            "reminder_frequency",
            "quiet_hours_start",
            "quiet_hours_end",
        )
        read_only_fields = ("patient",)
