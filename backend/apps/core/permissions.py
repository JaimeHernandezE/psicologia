from rest_framework.permissions import BasePermission, IsAuthenticated


class IsTherapist(BasePermission):
    """Usuario autenticado con role therapist."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and getattr(request.user, "role", None) == "therapist"
        )


class IsPatient(BasePermission):
    """Usuario autenticado con role patient."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and getattr(request.user, "role", None) == "patient"
        )


class IsLinkTherapist(BasePermission):
    """El usuario es el tratante del link del objeto."""

    def has_object_permission(self, request, view, obj):
        link = getattr(obj, "link", obj)
        if link is None:
            return False
        therapist = getattr(link, "therapist", None)
        if therapist is None:
            return False
        return getattr(therapist, "user_id", None) == request.user.id


class IsLinkPatient(BasePermission):
    """El usuario es el paciente del link del objeto."""

    def has_object_permission(self, request, view, obj):
        link = getattr(obj, "link", obj)
        if link is None:
            return False
        patient = getattr(link, "patient", None)
        if patient is None:
            return False
        return getattr(patient, "user_id", None) == request.user.id


class IsTherapistOrPatient(BasePermission):
    """Usuario autenticado que sea terapeuta o paciente."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        role = getattr(request.user, "role", None)
        return role in ("therapist", "patient")
