from rest_framework import serializers
from .models import JournalEntry


class JournalEntrySerializer(serializers.ModelSerializer):
    patient = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = JournalEntry
        fields = ("id", "patient", "group", "body", "visibility", "created_at", "updated_at")
        read_only_fields = ("created_at", "updated_at")
