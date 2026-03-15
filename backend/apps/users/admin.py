from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User, TherapistProfile, PatientProfile


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("email", "username", "role", "auth_provider", "is_staff")
    list_filter = ("role", "auth_provider", "is_staff")
    fieldsets = BaseUserAdmin.fieldsets + (
        (None, {"fields": ("role", "avatar", "auth_provider")}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        (None, {"fields": ("role", "avatar", "auth_provider")}),
    )


@admin.register(TherapistProfile)
class TherapistProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "license_number")
    search_fields = ("user__email", "user__first_name", "user__last_name", "license_number")
    raw_id_fields = ("user",)


@admin.register(PatientProfile)
class PatientProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "onboarded_at")
    search_fields = ("user__email", "user__first_name", "user__last_name")
    raw_id_fields = ("user",)
    list_filter = ("onboarded_at",)
