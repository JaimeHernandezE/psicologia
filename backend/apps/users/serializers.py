from django.contrib.auth import authenticate
from rest_framework import serializers

from .models import User, TherapistProfile, PatientProfile


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "role", "avatar", "auth_provider")


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField(write_only=True)
    password = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True)
    role = serializers.ChoiceField(choices=User.Role.choices, write_only=True)

    def validate(self, data):
        if data["password"] != data["password2"]:
            raise serializers.ValidationError({"password2": "Las contraseñas no coinciden."})
        if User.objects.filter(email=data["email"]).exists():
            raise serializers.ValidationError({"email": "Ya existe un usuario con este email."})
        return data

    def create(self, validated_data):
        from django.db import transaction

        role = validated_data.pop("role")
        validated_data.pop("password2")
        password = validated_data.pop("password")

        with transaction.atomic():
            user = User.objects.create_user(
                username=validated_data["email"],
                email=validated_data["email"],
                password=password,
                role=role,
            )
            if role == User.Role.THERAPIST:
                TherapistProfile.objects.create(user=user)
            else:
                PatientProfile.objects.create(user=user)
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(write_only=True)
    password = serializers.CharField(write_only=True)


class TherapistProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = TherapistProfile
        fields = ("id", "user", "license_number", "bio", "chat_instructions_default")


class PatientProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = PatientProfile
        fields = ("id", "user", "onboarded_at")
