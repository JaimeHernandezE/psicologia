from django.urls import path
from .views import PatientAnalyticsView, TherapistComparisonView

urlpatterns = [
    path("patient/<int:patient_id>/", PatientAnalyticsView.as_view(), name="analytics-patient"),
    path("comparison/", TherapistComparisonView.as_view(), name="analytics-comparison"),
]
