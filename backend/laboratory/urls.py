from django.urls import path, include
from rest_framework import routers
from .views import ExamTypeViewSet, LabRequestViewSet, ImagingRequestViewSet

router = routers.DefaultRouter()
router.register(r'exam-types', ExamTypeViewSet, basename='examtype')
router.register(r'lab-requests', LabRequestViewSet, basename='labrequest')
router.register(r'imaging-requests', ImagingRequestViewSet, basename='imagingrequest')

urlpatterns = [
    path('', include(router.urls)),
]
