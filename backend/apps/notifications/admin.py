from django.contrib import admin
from .models import SessionAlert, NotificationPreference


@admin.register(SessionAlert)
class SessionAlertAdmin(admin.ModelAdmin):
    list_display = ("link", "session_date", "notify_before_days", "is_active")
    list_filter = ("is_active",)
    raw_id_fields = ("link",)
    date_hierarchy = "session_date"


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = ("patient", "reminders_enabled", "reminder_frequency", "quiet_hours_start", "quiet_hours_end")
    list_filter = ("reminders_enabled", "reminder_frequency")
    raw_id_fields = ("patient",)
