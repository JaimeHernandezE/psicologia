from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import FeelingChartView, FeelingViewSet

app_name = "feelings"

router = DefaultRouter()
router.register(r"", FeelingViewSet, basename="feeling")

urlpatterns = router.urls + [
    path("chart_data/", FeelingChartView.as_view(), name="chart-data"),
]

