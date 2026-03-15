from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r"", views.TaskViewSet, basename="task")
router.register(r"progress", views.TaskProgressViewSet, basename="task-progress")
urlpatterns = router.urls
