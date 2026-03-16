from django.conf import settings
from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from drf_spectacular.utils import extend_schema

from .models import User, TherapistProfile, PatientProfile
from .serializers import (
    UserSerializer,
    RegisterSerializer,
    LoginSerializer,
    TherapistProfileSerializer,
    PatientProfileSerializer,
)


def _tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    data = UserSerializer(user).data
    if hasattr(user, "therapist_profile"):
        data["profile"] = TherapistProfileSerializer(user.therapist_profile).data
    elif hasattr(user, "patient_profile"):
        data["profile"] = PatientProfileSerializer(user.patient_profile).data
    else:
        data["profile"] = None
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "user": data,
    }


@extend_schema(summary="Registro de usuario", description="Crea un usuario (terapeuta o paciente) y su perfil; devuelve tokens JWT y datos del usuario.")
class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(_tokens_for_user(user), status=status.HTTP_201_CREATED)


@extend_schema(summary="Login con email y contraseña", description="Autentica con email y password; devuelve access, refresh y user.")
class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(
            request,
            username=serializer.validated_data["email"],
            password=serializer.validated_data["password"],
        )
        if user is None:
            return Response(
                {"detail": "Credenciales inválidas."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        return Response(_tokens_for_user(user))


@extend_schema(summary="Usuario actual", description="GET: devuelve el usuario autenticado con su perfil anidado. PATCH: permite actualizar avatar y bio.")
class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        data = UserSerializer(user).data
        if hasattr(user, "therapist_profile"):
            data["profile"] = TherapistProfileSerializer(user.therapist_profile).data
        elif hasattr(user, "patient_profile"):
            data["profile"] = PatientProfileSerializer(user.patient_profile).data
        else:
            data["profile"] = None
        return Response(data)

    def patch(self, request):
        user = request.user
        updated = False
        if "avatar" in request.data:
            user.avatar = request.data.get("avatar") or user.avatar
            user.save(update_fields=["avatar"])
            updated = True
        if "bio" in request.data and hasattr(user, "therapist_profile"):
            user.therapist_profile.bio = request.data["bio"]
            user.therapist_profile.save(update_fields=["bio"])
            updated = True
        if not updated:
            return Response(UserSerializer(user).data)
        data = UserSerializer(user).data
        if hasattr(user, "therapist_profile"):
            data["profile"] = TherapistProfileSerializer(user.therapist_profile).data
        elif hasattr(user, "patient_profile"):
            data["profile"] = PatientProfileSerializer(user.patient_profile).data
        else:
            data["profile"] = None
        return Response(data)


class GoogleLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get("token") or request.data.get("credential")
        if not token:
            return Response(
                {"detail": "Falta el token de Google."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            from google.oauth2 import id_token
            from google.auth.transport import requests as google_requests
        except ImportError:
            return Response(
                {"detail": "google-auth no instalado."},
                status=status.HTTP_501_NOT_IMPLEMENTED,
            )
        client_id = getattr(settings, "GOOGLE_CLIENT_ID", None) or request.data.get("client_id")
        if not client_id:
            return Response(
                {"detail": "GOOGLE_CLIENT_ID no configurado."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            idinfo = id_token.verify_oauth2_token(
                token, google_requests.Request(), client_id
            )
        except ValueError as e:
            return Response(
                {"detail": f"Token de Google inválido: {e}"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        email = idinfo.get("email")
        if not email:
            return Response(
                {"detail": "El token no incluye email."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "username": email,
                "auth_provider": User.AuthProvider.GOOGLE,
                "role": User.Role.PATIENT,
            },
        )
        if created:
            user.auth_provider = User.AuthProvider.GOOGLE
            user.set_unusable_password()
            user.save()
            PatientProfile.objects.create(user=user)
        return Response(_tokens_for_user(user))
