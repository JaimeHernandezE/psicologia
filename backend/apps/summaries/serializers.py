from rest_framework import serializers
from .models import Summary, SummaryEntry


class SummarySerializer(serializers.ModelSerializer):
    journal_entry_ids = serializers.SerializerMethodField()

    class Meta:
        model = Summary
        fields = (
            "id",
            "link",
            "body_ai",
            "body_edited",
            "created_at",
            "sent_at",
            "undo_deadline",
            "is_sent",
            "journal_entry_ids",
        )
        read_only_fields = ("body_ai", "created_at", "sent_at", "undo_deadline", "is_sent")

    def get_journal_entry_ids(self, obj):
        return list(
            obj.summary_entries.values_list("journal_entry_id", flat=True).order_by("included_at")
        )


class SummaryCreateSerializer(serializers.Serializer):
    link_id = serializers.IntegerField()
    journal_entry_ids = serializers.ListField(child=serializers.IntegerField(), allow_empty=False)
