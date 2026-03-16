"""
Construcción del corpus y llamada a Claude para consultas IA del tratante.
Solo incluye resúmenes enviados y resúmenes grupales; nunca notas privadas del paciente.
"""
from django.conf import settings

from apps.links.models import TherapistPatientLink, Group, GroupMembership
from apps.summaries.models import Summary, GroupSummary
from apps.journal.models import JournalEntry


def _excerpt(text: str, max_len: int = 400) -> str:
    if not text:
        return ""
    text = (text or "").strip()
    if len(text) <= max_len:
        return text
    return text[: max_len - 3].rsplit(maxsplit=1)[0] + "…" if text else ""


def build_patient_corpus(therapist_user, patient_id: int) -> list[dict]:
    """
    Corpus para context_type='patient'.
    Últimos 50 resúmenes enviados del paciente (is_sent=True).
    No se incluyen entradas de diario privadas.
    Retorna lista de { "date": str, "excerpt": str, "source": "summary" }.
    """
    link = TherapistPatientLink.objects.filter(
        therapist__user=therapist_user,
        patient_id=patient_id,
        status=TherapistPatientLink.Status.ACTIVE,
    ).first()
    if not link:
        return []
    summaries = (
        Summary.objects.filter(link=link, is_sent=True)
        .order_by("-sent_at")[:50]
        .select_related("link__patient__user")
    )
    chunks = []
    for s in summaries:
        body = (s.body_edited or s.body_ai or "").strip()
        if not body:
            continue
        date_str = s.sent_at.strftime("%Y-%m-%d") if s.sent_at else ""
        chunks.append({
            "date": date_str,
            "excerpt": _excerpt(body),
            "source": "summary",
            "full_text": body,
        })
    return chunks


def build_group_corpus(therapist_user, group_id: int) -> list[dict]:
    """
    Corpus para context_type='group'.
    Últimos resúmenes enviados de cada miembro activo del grupo +
    GroupSummaries del grupo.
    Retorna lista de { "date", "excerpt", "source": "summary"|"group_summary" }.
    """
    group = Group.objects.filter(
        pk=group_id,
        therapist__user=therapist_user,
        is_active=True,
    ).first()
    if not group:
        return []
    chunks = []
    member_ids = list(
        GroupMembership.objects.filter(group=group, is_active=True).values_list(
            "patient_id", flat=True
        )
    )
    summaries = (
        Summary.objects.filter(
            link__therapist=group.therapist,
            link__patient_id__in=member_ids,
            is_sent=True,
        )
        .order_by("-sent_at")[:100]
        .select_related("link__patient__user")
    )
    for s in summaries:
        body = (s.body_edited or s.body_ai or "").strip()
        if not body:
            continue
        date_str = s.sent_at.strftime("%Y-%m-%d") if s.sent_at else ""
        chunks.append({
            "date": date_str,
            "excerpt": _excerpt(body),
            "source": "summary",
            "full_text": body,
        })
    group_summaries = (
        GroupSummary.objects.filter(group=group)
        .order_by("-created_at")[:30]
        .select_related("created_by")
    )
    for gs in group_summaries:
        body = (gs.body_edited or gs.body_ai or "").strip()
        if not body:
            continue
        date_str = gs.created_at.strftime("%Y-%m-%d") if gs.created_at else ""
        chunks.append({
            "date": date_str,
            "excerpt": _excerpt(body),
            "source": "group_summary",
            "full_text": body,
        })
    return chunks


def format_corpus_for_prompt(chunks: list[dict]) -> str:
    """Formatea el corpus como texto para el prompt."""
    parts = []
    for i, c in enumerate(chunks, 1):
        label = "Resumen enviado" if c["source"] == "summary" else "Resumen grupal"
        date = c.get("date") or "Sin fecha"
        parts.append(f"[{i}] {label} ({date}):\n{c.get('full_text', c.get('excerpt', ''))}")
    return "\n\n---\n\n".join(parts) if parts else "(No hay contenido en el contexto.)"


def get_sources_from_chunks(chunks: list[dict], used_indices: list[int] | None = None) -> list[dict]:
    """
    Extrae sources para la respuesta. Si Claude no devuelve índices, usamos todos los chunks
    o los primeros N. Por simplicidad retornamos date y excerpt de cada chunk que incluimos en el prompt.
    """
    if used_indices is not None:
        selected = [c for i, c in enumerate(chunks) if i + 1 in used_indices]
    else:
        selected = chunks[:15]
    return [{"date": c.get("date", ""), "excerpt": c.get("excerpt", "")} for c in selected]


def ask_claude_contextual(query: str, corpus_text: str) -> str:
    """
    Llama a Claude con el query del tratante y el corpus formateado.
    Retorna el texto de la respuesta.
    """
    api_key = getattr(settings, "ANTHROPIC_API_KEY", None) or getattr(
        settings, "DECOUPLE_ANTHROPIC_API_KEY", None
    )
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY no configurado")
    from anthropic import Anthropic

    client = Anthropic(api_key=api_key)
    model = getattr(settings, "ANTHROPIC_SUMMARY_MODEL", "claude-sonnet-4-20250514")

    system = (
        "Eres un asistente clínico que ayuda a psicólogos a encontrar patrones y responder "
        "preguntas sobre el historial de sus pacientes. Responde siempre en español. "
        "Sé preciso, cita de qué período proviene la información cuando sea relevante. "
        "Nunca inventes información que no esté en el contexto."
    )
    user_content = f"Contexto (resúmenes y/o notas disponibles):\n\n{corpus_text}\n\n---\n\nPregunta del profesional:\n{query}"

    message = client.messages.create(
        model=model,
        max_tokens=1024,
        system=system,
        messages=[{"role": "user", "content": user_content}],
    )
    if message.content and len(message.content) > 0:
        return message.content[0].text
    return ""
