from django.urls import path, include
from rest_framework_nested import routers
from .views import (
    ConsultationViewSet, ICD10CodeViewSet, ConsultationDiagnosisViewSet,
    VitalSignsViewSet, PrescriptionViewSet, PrescriptionItemViewSet,
    EvolutionNoteViewSet
)

# Main router
router = routers.DefaultRouter()
router.register(r'consultations', ConsultationViewSet, basename='consultation')
router.register(r'icd10', ICD10CodeViewSet, basename='icd10')
router.register(r'vitals', VitalSignsViewSet, basename='vitalsigns')
router.register(r'evolution-notes', EvolutionNoteViewSet, basename='evolutionnote')

# Nested router for Consultation -> Diagnoses and Prescriptions
consultation_router = routers.NestedDefaultRouter(router, r'consultations', lookup='consultation')
consultation_router.register(r'diagnoses', ConsultationDiagnosisViewSet, basename='consultation-diagnoses')
consultation_router.register(r'prescriptions', PrescriptionViewSet, basename='consultation-prescriptions')

# Nested router for Prescription -> Items
prescription_router = routers.NestedDefaultRouter(consultation_router, r'prescriptions', lookup='prescription')
prescription_router.register(r'items', PrescriptionItemViewSet, basename='prescription-items')

urlpatterns = [
    path('', include(router.urls)),
    path('', include(consultation_router.urls)),
    path('', include(prescription_router.urls)),
]
