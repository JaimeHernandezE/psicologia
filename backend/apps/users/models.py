from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Usuario custom con role, avatar y proveedor de autenticación."""

    class Role(models.TextChoices):
        THERAPIST = "therapist", "Terapeuta"
        PATIENT = "patient", "Paciente"

    class AuthProvider(models.TextChoices):
        EMAIL = "email", "Email"
        GOOGLE = "google", "Google"

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.PATIENT,
    )
    avatar = models.ImageField(upload_to="avatars/", blank=True, null=True)
    auth_provider = models.CharField(
        max_length=20,
        choices=AuthProvider.choices,
        default=AuthProvider.EMAIL,
    )
