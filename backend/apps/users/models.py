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
    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True)
    auth_provider = models.CharField(
        max_length=20,
        choices=AuthProvider.choices,
        default=AuthProvider.EMAIL,
    )

    def __str__(self):
        return self.email or self.username

    class Meta:
        ordering = ["-date_joined"]
        verbose_name = "Usuario"
        verbose_name_plural = "Usuarios"


class TherapistProfile(models.Model):
    """Perfil del terapeuta/tratante."""

    class DateFormat(models.TextChoices):
        DDMMYYYY = "dd/mm/yyyy", "dd/mm/aaaa"
        MMDDYYYY = "mm/dd/yyyy", "mm/dd/aaaa"
        YYYYMMDD = "yyyy-mm-dd", "aaaa-mm-dd"

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="therapist_profile",
        limit_choices_to={"role": User.Role.THERAPIST},
    )
    license_number = models.CharField(max_length=100, blank=True)
    bio = models.TextField(blank=True)
    chat_instructions_default = models.TextField(
        blank=True,
        help_text="Instrucciones base para Claude en el chat",
    )
    date_format = models.CharField(
        max_length=10,
        choices=DateFormat.choices,
        default=DateFormat.DDMMYYYY,
    )

    def __str__(self):
        return f"Terapeuta: {self.user.get_full_name() or self.user.email}"

    class Meta:
        ordering = ["user__email"]
        verbose_name = "Perfil de terapeuta"
        verbose_name_plural = "Perfiles de terapeuta"


class PatientProfile(models.Model):
    """Perfil del paciente."""

    class DateFormat(models.TextChoices):
        DDMMYYYY = "dd/mm/yyyy", "dd/mm/aaaa"
        MMDDYYYY = "mm/dd/yyyy", "mm/dd/aaaa"
        YYYYMMDD = "yyyy-mm-dd", "aaaa-mm-dd"

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="patient_profile",
        limit_choices_to={"role": User.Role.PATIENT},
    )
    onboarded_at = models.DateTimeField(null=True, blank=True)
    research_consent = models.BooleanField(default=False)
    research_consent_date = models.DateTimeField(null=True, blank=True)
    date_format = models.CharField(
        max_length=10,
        choices=DateFormat.choices,
        default=DateFormat.DDMMYYYY,
    )

    def __str__(self):
        return f"Paciente: {self.user.get_full_name() or self.user.email}"

    class Meta:
        ordering = ["user__email"]
        verbose_name = "Perfil de paciente"
        verbose_name_plural = "Perfiles de paciente"
