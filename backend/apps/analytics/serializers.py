from rest_framework import serializers


class FeelingMinimalSerializer(serializers.Serializer):
    """Sentimiento: título, emoji, color (para respuestas de analytics)."""
    title = serializers.CharField()
    emoji = serializers.CharField(allow_blank=True)
    color = serializers.CharField(allow_blank=True)


class PatientAnalyticsSummarySerializer(serializers.Serializer):
    total_journal_entries = serializers.IntegerField()
    avg_completion_rate = serializers.FloatField()
    most_frequent_feeling = FeelingMinimalSerializer(allow_null=True)
    positive_feeling_ratio = serializers.FloatField()
    journal_streak = serializers.IntegerField()


class TaskVsMoodItemSerializer(serializers.Serializer):
    period = serializers.CharField()
    completion_rate = serializers.FloatField()
    positive_ratio = serializers.FloatField()
    journal_count = serializers.IntegerField()


class FeelingFrequencyItemSerializer(serializers.Serializer):
    feeling = FeelingMinimalSerializer()
    count = serializers.IntegerField()
    ratio = serializers.FloatField()


class FeelingInPeriodSerializer(serializers.Serializer):
    title = serializers.CharField()
    emoji = serializers.CharField(allow_blank=True)
    color = serializers.CharField(allow_blank=True)
    count = serializers.IntegerField()


class FeelingTimelineItemSerializer(serializers.Serializer):
    period = serializers.CharField()
    feelings = FeelingInPeriodSerializer(many=True)


class PatientAnalyticsResponseSerializer(serializers.Serializer):
    summary = PatientAnalyticsSummarySerializer()
    task_vs_mood = TaskVsMoodItemSerializer(many=True)
    feeling_frequency = FeelingFrequencyItemSerializer(many=True)
    feeling_timeline = FeelingTimelineItemSerializer(many=True)


# --- Comparativa (anonimizada) ---


class ComparisonPatientSerializer(serializers.Serializer):
    patient_hash = serializers.CharField()
    avg_completion_rate = serializers.FloatField()
    positive_feeling_ratio = serializers.FloatField()
    journal_frequency_per_week = serializers.FloatField()
    treatment_weeks = serializers.IntegerField()


class ComparisonAveragesSerializer(serializers.Serializer):
    avg_completion_rate = serializers.FloatField()
    positive_feeling_ratio = serializers.FloatField()
    journal_frequency_per_week = serializers.FloatField()


class TherapistComparisonResponseSerializer(serializers.Serializer):
    patients = ComparisonPatientSerializer(many=True)
    averages = ComparisonAveragesSerializer()
