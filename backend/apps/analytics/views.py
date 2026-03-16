import hashlib
from datetime import timedelta
from django.db.models import Sum, Avg, Count, F
from django.db.models.functions import TruncWeek, TruncMonth, TruncDate
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response

from apps.core.permissions import IsTherapist
from apps.links.models import TherapistPatientLink
from apps.feelings.models import Feeling

from .models import DailyPatientMetric, FeelingTimeSeries
from .serializers import (
    PatientAnalyticsResponseSerializer,
    TherapistComparisonResponseSerializer,
)


def _feeling_to_minimal(feeling):
    """None-safe dict for Feeling: title, emoji, color."""
    if not feeling:
        return None
    return {
        "title": feeling.title,
        "emoji": getattr(feeling, "emoji", "") or "",
        "color": getattr(feeling, "color", "") or "",
    }


def _patient_hash(patient_id):
    """SHA-256 del patient id para comparativa anonimizada."""
    return hashlib.sha256(str(patient_id).encode()).hexdigest()[:16]


class PatientAnalyticsView(APIView):
    """
    GET /api/analytics/patient/<patient_id>/
    Params: date_from, date_to, granularity (day|week|month)
    Solo IsTherapist; el paciente debe pertenecer al tratante.
    """
    permission_classes = [IsAuthenticated, IsTherapist]

    def get(self, request, patient_id):
        therapist = getattr(request.user, "therapist_profile", None)
        if not therapist:
            return Response({"detail": "No autorizado."}, status=status.HTTP_403_FORBIDDEN)
        if not TherapistPatientLink.objects.filter(therapist=therapist, patient_id=patient_id).exists():
            return Response({"detail": "Paciente no encontrado o sin acceso."}, status=status.HTTP_404_NOT_FOUND)

        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")
        granularity = (request.query_params.get("granularity") or "day").strip().lower()
        if granularity not in ("day", "week", "month"):
            granularity = "day"

        # Default: Ãºltimos 60 dÃ­as
        today = timezone.now().date()
        if date_to:
            try:
                end_date = timezone.datetime.strptime(date_to, "%Y-%m-%d").date()
            except ValueError:
                end_date = today
        else:
            end_date = today
        if date_from:
            try:
                start_date = timezone.datetime.strptime(date_from, "%Y-%m-%d").date()
            except ValueError:
                start_date = end_date - timedelta(days=60)
        else:
            start_date = end_date - timedelta(days=60)
        if start_date > end_date:
            start_date, end_date = end_date, start_date

        # --- DailyPatientMetric en rango
        metrics = DailyPatientMetric.objects.filter(
            patient_id=patient_id,
            date__gte=start_date,
            date__lte=end_date,
        ).order_by("date")

        # --- Summary
        agg = metrics.aggregate(
            total_entries=Sum("journal_entries_count"),
            avg_rate=Avg("tasks_completion_rate"),
            pos=Sum("positive_feelings_count"),
            neg=Sum("negative_feelings_count"),
            neu=Sum("neutral_feelings_count"),
        )
        total_journal_entries = (agg["total_entries"] or 0)
        avg_completion_rate = round((agg["avg_rate"] or 0.0) * 100.0, 2)
        total_feel = (agg["pos"] or 0) + (agg["neg"] or 0) + (agg["neu"] or 0)
        positive_feeling_ratio = round((agg["pos"] or 0) / total_feel * 100.0, 2) if total_feel else 0.0

        # Sentimiento mÃ¡s frecuente: por dominant_feeling en mÃ©tricas
        from django.db.models import Count as CountRows
        dominant_qs = (
            metrics.exclude(dominant_feeling__isnull=True)
            .values("dominant_feeling")
            .annotate(c=CountRows("id"))
            .order_by("-c")[:1]
        )
        most_frequent_feeling = None
        if dominant_qs:
            fid = dominant_qs[0]["dominant_feeling"]
            if fid:
                try:
                    most_frequent_feeling = _feeling_to_minimal(Feeling.objects.get(pk=fid))
                except Feeling.DoesNotExist:
                    pass

        # Racha: dÃ­as consecutivos con al menos 1 entrada (hacia atrÃ¡s desde end_date)
        dates_with_journal = list(
            metrics.filter(journal_entries_count__gte=1).values_list("date", flat=True).distinct()
        )
        dates_with_journal.sort(reverse=True)
        journal_streak = 0
        expected = end_date
        for d in dates_with_journal:
            if d == expected:
                journal_streak += 1
                expected = expected - timedelta(days=1)
            else:
                break

        summary = {
            "total_journal_entries": total_journal_entries,
            "avg_completion_rate": avg_completion_rate,
            "most_frequent_feeling": most_frequent_feeling,
            "positive_feeling_ratio": positive_feeling_ratio,
            "journal_streak": journal_streak,
        }

        # --- task_vs_mood por perÃ­odo (granularity)
        if granularity == "day":
            period_values = metrics.values("date").annotate(
                period=F("date"),
                completion_rate=Avg("tasks_completion_rate"),
                positive_ratio_raw=Sum("positive_feelings_count"),
                total_f=Sum(F("positive_feelings_count") + F("negative_feelings_count") + F("neutral_feelings_count")),
                journal_count=Sum("journal_entries_count"),
            )
        elif granularity == "week":
            period_values = metrics.annotate(period=TruncWeek("date")).values("period").annotate(
                completion_rate=Avg("tasks_completion_rate"),
                positive_ratio_raw=Sum("positive_feelings_count"),
                total_f=Sum(F("positive_feelings_count") + F("negative_feelings_count") + F("neutral_feelings_count")),
                journal_count=Sum("journal_entries_count"),
            )
        else:
            period_values = metrics.annotate(period=TruncMonth("date")).values("period").annotate(
                completion_rate=Avg("tasks_completion_rate"),
                positive_ratio_raw=Sum("positive_feelings_count"),
                total_f=Sum(F("positive_feelings_count") + F("negative_feelings_count") + F("neutral_feelings_count")),
                journal_count=Sum("journal_entries_count"),
            )

        task_vs_mood = []
        for row in period_values:
            period = row["period"]
            if hasattr(period, "strftime"):
                period_str = period.strftime("%Y-%m-%d")
            else:
                period_str = str(period)[:10]
            total_f = row.get("total_f") or 0
            pos_raw = row.get("positive_ratio_raw") or 0
            positive_ratio = round(pos_raw / total_f * 100.0, 2) if total_f else 0.0
            task_vs_mood.append({
                "period": period_str,
                "completion_rate": round((row.get("completion_rate") or 0) * 100.0, 2),
                "positive_ratio": positive_ratio,
                "journal_count": row.get("journal_count") or 0,
            })
        task_vs_mood.sort(key=lambda x: x["period"])

        # --- feeling_frequency (FeelingTimeSeries en rango)
        from django.db.models.functions import TruncDate
        ts_range = FeelingTimeSeries.objects.filter(
            patient_id=patient_id,
            recorded_at__date__gte=start_date,
            recorded_at__date__lte=end_date,
        )
        total_ts = ts_range.count()
        feeling_counts = (
            ts_range.values("feeling_id")
            .annotate(c=Count("id"))
            .order_by("-c")[:8]
        )
        feeling_frequency = []
        for fc in feeling_counts:
            try:
                feeling = Feeling.objects.get(pk=fc["feeling_id"])
            except Feeling.DoesNotExist:
                continue
            ratio = round(fc["c"] / total_ts * 100.0, 2) if total_ts else 0.0
            feeling_frequency.append({
                "feeling": _feeling_to_minimal(feeling),
                "count": fc["c"],
                "ratio": ratio,
            })

        # --- feeling_timeline: por perÃ­odo, sentimientos con count
        if granularity == "day":
            ts_by_period = (
                ts_range.annotate(period=TruncDate("recorded_at"))
                .values("period", "feeling_id")
                .annotate(c=Count("id"))
            )
        elif granularity == "week":
            ts_by_period = (
                ts_range.annotate(period=TruncWeek("recorded_at"))
                .values("period", "feeling_id")
                .annotate(c=Count("id"))
            )
        else:
            ts_by_period = (
                ts_range.annotate(period=TruncMonth("recorded_at"))
                .values("period", "feeling_id")
                .annotate(c=Count("id"))
            )

        from collections import defaultdict
        period_feelings = defaultdict(list)
        feeling_cache = {}
        for row in ts_by_period:
            period = row["period"]
            if hasattr(period, "strftime"):
                period_str = period.strftime("%Y-%m-%d")
            else:
                period_str = str(period)[:10]
            fid = row["feeling_id"]
            if fid not in feeling_cache:
                try:
                    feeling_cache[fid] = Feeling.objects.get(pk=fid)
                except Feeling.DoesNotExist:
                    continue
            period_feelings[period_str].append({
                "title": feeling_cache[fid].title,
                "emoji": getattr(feeling_cache[fid], "emoji", "") or "",
                "color": getattr(feeling_cache[fid], "color", "") or "",
                "count": row["c"],
            })
        feeling_timeline = [{"period": p, "feelings": period_feelings[p]} for p in sorted(period_feelings.keys())]

        payload = {
            "summary": summary,
            "task_vs_mood": task_vs_mood,
            "feeling_frequency": feeling_frequency,
            "feeling_timeline": feeling_timeline,
        }
        serializer = PatientAnalyticsResponseSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data)


class TherapistComparisonView(APIView):
    """
    GET /api/analytics/comparison/
    Params: date_from, date_to
    Comparativa anonimizada de pacientes del tratante. Nunca retorna nombre, email ni id real.
    """
    permission_classes = [IsAuthenticated, IsTherapist]

    def get(self, request):
        therapist = getattr(request.user, "therapist_profile", None)
        if not therapist:
            return Response({"detail": "No autorizado."}, status=status.HTTP_403_FORBIDDEN)

        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")
        today = timezone.now().date()
        if date_to:
            try:
                end_date = timezone.datetime.strptime(date_to, "%Y-%m-%d").date()
            except ValueError:
                end_date = today
        else:
            end_date = today
        if date_from:
            try:
                start_date = timezone.datetime.strptime(date_from, "%Y-%m-%d").date()
            except ValueError:
                start_date = end_date - timedelta(days=90)
        else:
            start_date = end_date - timedelta(days=90)
        if start_date > end_date:
            start_date, end_date = end_date, start_date

        links = TherapistPatientLink.objects.filter(therapist=therapist).select_related("patient")
        patient_ids = [link.patient_id for link in links]
        if not patient_ids:
            return Response({
                "patients": [],
                "averages": {
                    "avg_completion_rate": 0.0,
                    "positive_feeling_ratio": 0.0,
                    "journal_frequency_per_week": 0.0,
                },
            })

        # Por paciente: mÃ©tricas en rango
        metrics_qs = DailyPatientMetric.objects.filter(
            patient_id__in=patient_ids,
            date__gte=start_date,
            date__lte=end_date,
        )
        weeks_span = max(1, (end_date - start_date).days / 7.0)

        patients_data = []
        for pid in patient_ids:
            pm = metrics_qs.filter(patient_id=pid)
            agg = pm.aggregate(
                avg_rate=Avg("tasks_completion_rate"),
                pos=Sum("positive_feelings_count"),
                neg=Sum("negative_feelings_count"),
                neu=Sum("neutral_feelings_count"),
                total_journal=Sum("journal_entries_count"),
            )
            avg_rate = (agg["avg_rate"] or 0.0) * 100.0
            total_f = (agg["pos"] or 0) + (agg["neg"] or 0) + (agg["neu"] or 0)
            positive_ratio = (agg["pos"] or 0) / total_f * 100.0 if total_f else 0.0
            journal_count = agg["total_journal"] or 0
            journal_per_week = round(journal_count / weeks_span, 2) if weeks_span else 0.0

            # treatment_weeks: desde primera mÃ©trica o activated_at del link
            first_metric = pm.order_by("date").values_list("date", flat=True).first()
            link = next((l for l in links if l.patient_id == pid), None)
            if first_metric and link and link.activated_at:
                start_ref = min(first_metric, link.activated_at.date())
            elif first_metric:
                start_ref = first_metric
            elif link and link.activated_at:
                start_ref = link.activated_at.date()
            else:
                start_ref = start_date
            treatment_weeks = max(0, (end_date - start_ref).days // 7)

            patients_data.append({
                "patient_hash": _patient_hash(pid),
                "avg_completion_rate": round(avg_rate, 2),
                "positive_feeling_ratio": round(positive_ratio, 2),
                "journal_frequency_per_week": journal_per_week,
                "treatment_weeks": treatment_weeks,
            })

        n = len(patients_data)
        averages = {
            "avg_completion_rate": round(sum(p["avg_completion_rate"] for p in patients_data) / n, 2) if n else 0.0,
            "positive_feeling_ratio": round(sum(p["positive_feeling_ratio"] for p in patients_data) / n, 2) if n else 0.0,
            "journal_frequency_per_week": round(sum(p["journal_frequency_per_week"] for p in patients_data) / n, 2) if n else 0.0,
        }

        payload = {"patients": patients_data, "averages": averages}
        ser = TherapistComparisonResponseSerializer(data=payload)
        ser.is_valid(raise_exception=True)
        return Response(ser.validated_data)

