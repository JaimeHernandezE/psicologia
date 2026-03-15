from django.contrib import admin
from .models import Group, GroupMembership, TherapistPatientLink


@admin.register(Group)
class GroupAdmin(admin.ModelAdmin):
    list_display = ("name", "therapist", "created_at")
    list_filter = ("therapist",)
    search_fields = ("name",)
    raw_id_fields = ("therapist",)
    date_hierarchy = "created_at"


@admin.register(GroupMembership)
class GroupMembershipAdmin(admin.ModelAdmin):
    list_display = ("group", "patient", "joined_at")
    list_filter = ("group",)
    raw_id_fields = ("group", "patient")
    date_hierarchy = "joined_at"


@admin.register(TherapistPatientLink)
class TherapistPatientLinkAdmin(admin.ModelAdmin):
    list_display = ("therapist", "patient", "status", "chat_enabled", "invited_at", "activated_at")
    list_filter = ("status", "chat_enabled")
    raw_id_fields = ("therapist", "patient", "group")
    date_hierarchy = "invited_at"
    search_fields = ("therapist__user__email", "patient__user__email")
