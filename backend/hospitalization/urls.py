from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WardViewSet, BedViewSet, HospitalizationViewSet

router = DefaultRouter()
router.register(r'wards', WardViewSet, basename='ward')
router.register(r'beds', BedViewSet, basename='bed')
router.register(r'hospitalizations', HospitalizationViewSet, basename='hospitalization')

urlpatterns = [
    path('', include(router.urls)),
]
