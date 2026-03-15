"""
Llamadas a Claude API para generar resúmenes.
"""
from django.conf import settings


def generate_summary_from_entries(entries_text: list[str]) -> str:
    """
    Envía las entradas de diario a Claude y devuelve el texto del resumen.
    entries_text: lista de textos de JournalEntry (shareable).
    """
    api_key = getattr(settings, "ANTHROPIC_API_KEY", None) or getattr(
        settings, "DECOUPLE_ANTHROPIC_API_KEY", None
    )
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY no configurado")

    from anthropic import Anthropic

    client = Anthropic(api_key=api_key)
    model = getattr(settings, "ANTHROPIC_SUMMARY_MODEL", "claude-sonnet-4-20250514")

    combined = "\n\n---\n\n".join(
        f"Entrada {i+1}:\n{text}" for i, text in enumerate(entries_text, 1)
    )
    prompt = f"""Resume de forma clara y útil para un terapeuta las siguientes entradas de diario del paciente. 
Sé respetuoso y no inventes nada que no esté en el texto. El resumen debe servir para preparar la sesión.

{combined}

Resumen:"""

    message = client.messages.create(
        model=model,
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    if message.content and len(message.content) > 0:
        return message.content[0].text
    return ""
