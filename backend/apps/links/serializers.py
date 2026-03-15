from rest_framework import serializers
from apps.users.serializers import TherapistProfileSerializer, PatientProfileSerializer

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
        fields = ("id", "patient", "joined_at")
        read_only_fields = ("joined_at",)


class GroupSerializer(serializers.ModelSerializer):
    memberships = GroupMembershipSerializer(many=True, read_only=True)
    therapist = TherapistProfileSerializer(read_only=True)

    class Meta:
        model = Group
        fields = ("id", "therapist", "name", "created_at", "memberships")
        read_only_fields = ("created_at",)
