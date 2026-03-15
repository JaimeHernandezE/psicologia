"""
URL configuration for psicologia backend.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/users/", include("apps.users.urls")),
    path("api/links/", include("apps.links.urls")),
    path("api/journal/", include("apps.journal.urls")),
    path("api/summaries/", include("apps.summaries.urls")),
    path("api/tasks/", include("apps.tasks.urls")),
    path("api/notifications/", include("apps.notifications.urls")),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
