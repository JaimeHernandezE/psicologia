from rest_framework import serializers
from apps.users.serializers import TherapistProfileSerializer, PatientProfileSerializer
from apps.summaries.serializers import GroupSummarySerializer

from .models import Group, GroupMembership, TherapistPatientLink


class TherapistPatientLinkSerializer(serializers.ModelSerializer):
    therapist = TherapistProfileSerializer(read_only=True)
    patient = PatientProfileSerializer(read_only=True)
    group_name = serializers.CharField(source="group.name", read_only=True, allow_null=True)

    class Meta:
        model = TherapistPatientLink
        fields = (
            "id",
            "therapist",
            "patient",
            "status",
            "invited_at",
            "activated_at",
            "chat_enabled",
            "session_frequency_days",
            "group",
            "group_name",
        )
        read_only_fields = ("invited_at", "activated_at")


class LinkInviteSerializer(serializers.Serializer):
    email = serializers.EmailField(help_text="Email del paciente a invitar")


class GroupMembershipSerializer(serializers.ModelSerializer):
    patient = PatientProfileSerializer(read_only=True)

    class Meta:
        model = GroupMembership
        fields = ("id", "patient", "joined_at", "is_active")
        read_only_fields = ("joined_at",)


class GroupSerializer(serializers.ModelSerializer):
    members = serializers.SerializerMethodField()
    members_count = serializers.SerializerMethodField()
    therapist = TherapistProfileSerializer(read_only=True)

    group_summaries = GroupSummarySerializer(many=True, read_only=True)

    class Meta:
        model = Group
        fields = (
            "id",
            "name",
            "therapist",
            "created_at",
            "members",
            "members_count",
            "is_active",
            "group_summaries",
        )
        read_only_fields = ("created_at",)

    def get_members(self, obj):
        qs = obj.memberships.filter(is_active=True)
        return GroupMembershipSerializer(qs, many=True).data

    def get_members_count(self, obj):
        return obj.memberships.filter(is_active=True).count()
