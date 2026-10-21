from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import (
    Consultation, ICD10Code, ConsultationDiagnosis, VitalSigns,
    Prescription, PrescriptionItem, EvolutionNote
)
from .serializers import (
    ConsultationSerializer, ICD10CodeSerializer, ConsultationDiagnosisSerializer,
    VitalSignsSerializer, PrescriptionSerializer, PrescriptionItemSerializer,
    EvolutionNoteSerializer
)

class ICD10CodeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ICD10Code.objects.filter(is_active=True)
    serializer_class = ICD10CodeSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['code', 'description']
    pagination_class = None # Or a specific paginator if large

class ConsultationViewSet(viewsets.ModelViewSet):
    queryset = Consultation.objects.select_related('patient', 'doctor')
    serializer_class = ConsultationSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_fields = ['patient', 'status', 'type']
    ordering_fields = ['started_at', 'created_at']
    search_fields = ['patient__first_name', 'patient__last_name', 'patient__mrn']

    def perform_create(self, serializer):
        profile = getattr(self.request.user, 'staff_profile', None)
        extra_kwargs = {}
        if profile and profile.role == 'doctor':
            extra_kwargs['doctor'] = profile
        
        # Save consultation
        consultation = serializer.save(**extra_kwargs)
        
        # Transition visit status
        visit = consultation.visit
        if visit:
            visit.status = 'in_doctor_care'
            visit.save()
            
            # Associate any vital signs recorded for this visit to this consultation
            from consultations.models import VitalSigns
            VitalSigns.objects.filter(visit=visit, consultation__isnull=True).update(consultation=consultation)

    @action(detail=True, methods=['post'], url_path='complete')
    def complete(self, request, pk=None):
        from django.utils import timezone
        consultation = self.get_object()
        consultation.status = 'completed'
        consultation.ended_at = timezone.now()
        consultation.save()

        visit = consultation.visit
        if visit:
            if consultation.hospitalization_required:
                visit.status = 'waiting_hospitalization'
            else:
                # Check if there are lab or imaging requests associated with this consultation
                has_lab = consultation.lab_requests.exists() or consultation.imaging_requests.exists()
                if has_lab:
                    visit.status = 'waiting_lab'
                else:
                    visit.status = 'waiting_cashier'
            visit.save()

        return Response(self.get_serializer(consultation).data)

class ConsultationDiagnosisViewSet(viewsets.ModelViewSet):
    queryset = ConsultationDiagnosis.objects.all()
    serializer_class = ConsultationDiagnosisSerializer

    def get_queryset(self):
        consultation_id = self.kwargs.get('consultation_pk')
        if consultation_id:
            return self.queryset.filter(consultation_id=consultation_id)
        return self.queryset

    def perform_create(self, serializer):
        consultation_id = self.kwargs.get('consultation_pk')
        consultation = Consultation.objects.get(pk=consultation_id)
        serializer.save(consultation=consultation)

class VitalSignsViewSet(viewsets.ModelViewSet):
    queryset = VitalSigns.objects.all()
    serializer_class = VitalSignsSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['patient', 'consultation']
    ordering_fields = ['created_at']

    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user.staff_profile)

class PrescriptionViewSet(viewsets.ModelViewSet):
    queryset = Prescription.objects.select_related('prescribed_by')
    serializer_class = PrescriptionSerializer

    def get_queryset(self):
        consultation_id = self.kwargs.get('consultation_pk')
        if consultation_id:
            return self.queryset.filter(consultation_id=consultation_id)
        return self.queryset

    def perform_create(self, serializer):
        consultation_id = self.kwargs.get('consultation_pk')
        consultation = Consultation.objects.get(pk=consultation_id)
        serializer.save(consultation=consultation, prescribed_by=self.request.user.staff_profile)

    @action(detail=True, methods=['get'])
    def download_pdf(self, request, pk=None, consultation_pk=None):
        from .services import PDFGenerationService
        from django.http import HttpResponse

        pdf_content = PDFGenerationService.generate_prescription_pdf(pk)
        if not pdf_content:
            return Response({'detail': 'Prescription not found.'}, status=404)

        response = HttpResponse(pdf_content, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="ordonnance_{pk}.pdf"'
        return response

class PrescriptionItemViewSet(viewsets.ModelViewSet):
    queryset = PrescriptionItem.objects.all()
    serializer_class = PrescriptionItemSerializer

    def get_queryset(self):
        prescription_id = self.kwargs.get('prescription_pk')
        if prescription_id:
            return self.queryset.filter(prescription_id=prescription_id)
        return self.queryset

    def perform_create(self, serializer):
        prescription_id = self.kwargs.get('prescription_pk')
        prescription = Prescription.objects.get(pk=prescription_id)
        serializer.save(prescription=prescription)

class EvolutionNoteViewSet(viewsets.ModelViewSet):
    queryset = EvolutionNote.objects.select_related('patient', 'doctor')
    serializer_class = EvolutionNoteSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['patient', 'consultation']
    ordering_fields = ['created_at']

    def perform_create(self, serializer):
        serializer.save(doctor=self.request.user.staff_profile)
