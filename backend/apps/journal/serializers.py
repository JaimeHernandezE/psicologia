from rest_framework import serializers
from .models import JournalEntry


class JournalEntryFeelingNestedSerializer(serializers.Serializer):
    """Para lectura: id del JournalEntryFeeling + feeling con id, title, emoji, color."""
    id = serializers.IntegerField(read_only=True)
    feeling = serializers.SerializerMethodField()

    def get_feeling(self, obj):
        f = obj.feeling
        return {"id": f.id, "title": f.title, "emoji": f.emoji or "", "color": f.color or ""}


class JournalEntrySerializer(serializers.ModelSerializer):
    patient = serializers.PrimaryKeyRelatedField(read_only=True)
    feelings = serializers.SerializerMethodField()
    feeling_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True,
        write_only=True,
    )

    class Meta:
        model = JournalEntry
        fields = (
            "id", "patient", "group", "body", "visibility",
            "feelings", "feeling_ids",
            "created_at", "updated_at",
        )
        read_only_fields = ("created_at", "updated_at")

    def get_feelings(self, obj):
        return JournalEntryFeelingNestedSerializer(obj.journal_entry_feelings.all(), many=True).data

    def create(self, validated_data):
        feeling_ids = validated_data.pop("feeling_ids", []) or []
        instance = super().create(validated_data)
        if feeling_ids:
            self._set_feelings(instance, feeling_ids)
        return instance

    def update(self, instance, validated_data):
        feeling_ids = validated_data.pop("feeling_ids", None)
        instance = super().update(instance, validated_data)
        if feeling_ids is not None:
            self._set_feelings(instance, feeling_ids)
        return instance

    def _set_feelings(self, entry, feeling_ids):
        from apps.feelings.models import Feeling, JournalEntryFeeling
        JournalEntryFeeling.objects.filter(journal_entry=entry).delete()
        for fid in feeling_ids:
            if Feeling.objects.filter(pk=fid, is_active=True).exists():
                JournalEntryFeeling.objects.create(journal_entry=entry, feeling_id=fid)
