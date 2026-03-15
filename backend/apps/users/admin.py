from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


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
