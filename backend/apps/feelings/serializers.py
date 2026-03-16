from rest_framework import serializers

from .models import Feeling, JournalEntryFeeling


class FeelingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feeling
        fields = ("id", "title", "description", "emoji", "color", "is_system", "order")


class FeelingCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feeling
        fields = ("title", "description", "emoji", "color")

    def create(self, validated_data):
        request = self.context["request"]
        therapist = request.user.therapist_profile
        return Feeling.objects.create(
            **validated_data,
            is_system=False,
            therapist=therapist,
        )


class JournalEntryFeelingSerializer(serializers.ModelSerializer):
    feeling = FeelingSerializer(read_only=True)

    class Meta:
        model = JournalEntryFeeling
        fields = ("id", "feeling", "created_at")

