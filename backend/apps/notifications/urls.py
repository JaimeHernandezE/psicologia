from django.urls import path
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r"alerts", views.SessionAlertViewSet, basename="session-alert")
urlpatterns = [
    path("preferences/", views.NotificationPreferenceView.as_view()),
] + router.urls
