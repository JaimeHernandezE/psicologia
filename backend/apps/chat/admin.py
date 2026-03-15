from django.contrib import admin
from .models import ChatMessage


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ("link", "role", "created_at")
    list_filter = ("role",)
    raw_id_fields = ("link",)
    date_hierarchy = "created_at"
    search_fields = ("body",)
