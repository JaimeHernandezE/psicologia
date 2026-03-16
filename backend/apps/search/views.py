from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsTherapist

from .claude import (
    build_patient_corpus,
    build_group_corpus,
    format_corpus_for_prompt,
    get_sources_from_chunks,
    ask_claude_contextual,
)


class AiSearchView(APIView):
    """
    POST /api/search/ai/
    Body: { query, patient_id?, group_id?, context_type: 'patient' | 'group' }
    Solo IsTherapist. Construye corpus según context_type y devuelve respuesta de Claude + sources.
    """
    permission_classes = [IsAuthenticated, IsTherapist]

    def post(self, request):
        query = (request.data.get("query") or "").strip()
        if not query:
            return Response(
                {"detail": "Indica 'query'."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        context_type = request.data.get("context_type") or "patient"
        if context_type not in ("patient", "group"):
            return Response(
                {"detail": "context_type debe ser 'patient' o 'group'."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        chunks = []
        if context_type == "patient":
            patient_id = request.data.get("patient_id")
            if not patient_id:
                return Response(
                    {"detail": "Para context_type 'patient' indica 'patient_id'."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            try:
                patient_id = int(patient_id)
            except (TypeError, ValueError):
                return Response(
                    {"detail": "patient_id debe ser un entero."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            chunks = build_patient_corpus(request.user, patient_id)
        else:
            group_id = request.data.get("group_id")
            if not group_id:
                return Response(
                    {"detail": "Para context_type 'group' indica 'group_id'."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            try:
                group_id = int(group_id)
            except (TypeError, ValueError):
                return Response(
                    {"detail": "group_id debe ser un entero."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            chunks = build_group_corpus(request.user, group_id)

        corpus_text = format_corpus_for_prompt(chunks)
        try:
            answer = ask_claude_contextual(query, corpus_text)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {"detail": f"Error al consultar IA: {e}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        sources = get_sources_from_chunks(chunks)
        return Response({"answer": answer, "sources": sources})
