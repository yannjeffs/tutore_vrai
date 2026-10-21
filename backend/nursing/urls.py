from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NursingActTypeViewSet, NursingActViewSet

router = DefaultRouter()
router.register(r'nursing-act-types', NursingActTypeViewSet, basename='nursing-act-type')
router.register(r'nursing-acts', NursingActViewSet, basename='nursing-act')

urlpatterns = [
    path('', include(router.urls)),
]
