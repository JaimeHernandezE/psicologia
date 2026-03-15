from django.db import models


class ChatMessageManager(models.Manager):
    """Manager que impide crear mensajes si el vínculo no tiene chat habilitado."""

    def create(self, **kwargs):
        link = kwargs.get("link")
        if link is None and "link_id" in kwargs:
            from apps.links.models import TherapistPatientLink
            link = TherapistPatientLink.objects.filter(pk=kwargs["link_id"]).first()
        if link is not None and not getattr(link, "chat_enabled", False):
            raise NotImplementedError(
                "No se pueden crear mensajes de chat cuando link.chat_enabled es False."
            )
        return super().create(**kwargs)


class ChatMessage(models.Model):
    """Mensaje del chat con IA en un vínculo terapeuta–paciente."""

    class Role(models.TextChoices):
        USER = "user", "Usuario"
        ASSISTANT = "assistant", "Asistente"

    link = models.ForeignKey(
        "links.TherapistPatientLink",
        on_delete=models.CASCADE,
        related_name="chat_messages",
    )
    role = models.CharField(max_length=20, choices=Role.choices)
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    objects = ChatMessageManager()

    def __str__(self):
        preview = self.body[:40] + "…" if len(self.body) > 40 else self.body
        return f"{self.get_role_display()} – {self.created_at}: {preview}"

    class Meta:
        ordering = ["created_at"]
        verbose_name = "Mensaje de chat"
        verbose_name_plural = "Mensajes de chat"
