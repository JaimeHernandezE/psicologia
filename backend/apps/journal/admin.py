from django.contrib import admin
from .models import JournalEntry


@admin.register(JournalEntry)
class JournalEntryAdmin(admin.ModelAdmin):
    list_display = ("patient", "visibility", "created_at", "updated_at")
    list_filter = ("visibility",)
    search_fields = ("body",)
    raw_id_fields = ("patient",)
    date_hierarchy = "created_at"
