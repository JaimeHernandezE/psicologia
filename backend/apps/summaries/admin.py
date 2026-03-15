from django.contrib import admin
from .models import Summary, SummaryEntry


@admin.register(Summary)
class SummaryAdmin(admin.ModelAdmin):
    list_display = ("id", "link", "is_sent", "created_at", "sent_at", "undo_deadline")
    list_filter = ("is_sent",)
    raw_id_fields = ("link",)
    date_hierarchy = "created_at"
    search_fields = ("body_ai", "body_edited")


@admin.register(SummaryEntry)
class SummaryEntryAdmin(admin.ModelAdmin):
    list_display = ("summary", "journal_entry", "included_at")
    raw_id_fields = ("summary", "journal_entry")
    date_hierarchy = "included_at"
