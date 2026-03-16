from django.urls import path

from .views import AiSearchView

app_name = "search"

urlpatterns = [
    path("ai/", AiSearchView.as_view(), name="ai-search"),
]
