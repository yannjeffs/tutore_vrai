from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Patient, Visit
from .serializers import PatientListSerializer, PatientDetailSerializer, VisitSerializer
from .filters import PatientFilter
from core.permissions import HasPermission
from django.utils import timezone

from consultations.models import Consultation
from laboratory.models import LabRequest
from hospitalization.models import Hospitalization
from nursing.models import NursingAct

class PatientViewSet(viewsets.ModelViewSet):
    # permission_classes = [HasPermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = PatientFilter
    search_fields = ['first_name', 'last_name', 'mrn', 'phone', 'national_id']
    ordering_fields = ['created_at', 'last_name', 'first_name']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = Patient.objects.all().prefetch_related('emergency_contacts', 'allergies', 'antecedents')
        archived_param = self.request.query_params.get('is_archived')
        if archived_param != 'all':
            if archived_param in ['true', 'True', '1']:
                qs = qs.filter(is_archived=True)
            else:
                qs = qs.filter(is_archived=False)
        return qs

    def get_serializer_class(self):
        if self.action == 'list':
            return PatientListSerializer
        return PatientDetailSerializer



    @property
    def required_permission(self):
        if self.action in ['create', 'update', 'partial_update']:
            return 'patients_write'
        if self.action == 'destroy':
            return 'patients_delete'
        return 'patients_read'

    def perform_destroy(self, instance):
        instance.soft_delete()

    @action(detail=True, methods=['get'])
    def timeline(self, request, pk=None):
        patient = self.get_object()
        events = []
        
        visits = patient.visits.all()
        for v in visits:
            events.append({
                'id': f"visit-{v.id}",
                'type': 'visit',
                'date': v.created_at,
                'title': f"Visite ({v.get_visit_type_display()})",
                'description': v.reason_for_visit or 'Aucun motif',
                'status': v.get_status_display()
            })
            
            for c in v.consultations.all():
                desc_parts = []
                if c.chief_complaint: desc_parts.append(f"Motif: {c.chief_complaint}")
                if c.anamnesis: desc_parts.append(f"Anamnèse: {c.anamnesis}")
                if c.physical_examination: desc_parts.append(f"Examen: {c.physical_examination}")
                if c.conclusion: desc_parts.append(f"Conclusion: {c.conclusion}")
                
                prescriptions = c.prescriptions.all()
                if prescriptions.exists():
                    desc_parts.append("\nPrescriptions:")
                    for p in prescriptions:
                        for item in p.items.all():
                            desc_parts.append(f" - {item.medication_name}: {item.dosage} {item.frequency} ({item.duration})")
                
                desc = "\n\n".join(desc_parts) if desc_parts else 'Consultation sans notes cliniques'

                events.append({
                    'id': f"cons-{c.id}",
                    'type': 'consultation',
                    'date': c.created_at,
                    'title': f"Consultation avec {c.doctor.get_full_name() if c.doctor else 'Médecin'}",
                    'description': desc,
                    'status': 'Terminée' if c.status == 'completed' else 'En cours',
                    'reference_id': c.id
                })
            
            for l in v.lab_requests.all():
                desc_parts = [f"{l.items.count()} examen(s) demandé(s) :"]
                for item in l.items.all():
                    res = ""
                    if hasattr(item, 'result'):
                        res = f" -> Résultat: {item.result.value}"
                    exam_name = item.exam_type.name if item.exam_type else "Examen inconnu"
                    desc_parts.append(f"• {exam_name}{res}")
                    
                events.append({
                    'id': f"lab-{l.id}",
                    'type': 'lab',
                    'date': l.created_at,
                    'title': "Demande de Laboratoire",
                    'description': "\n".join(desc_parts),
                    'status': l.get_status_display(),
                    'reference_id': l.id
                })
                
            for n in v.nursing_acts.all():
                events.append({
                    'id': f"nurs-{n.id}",
                    'type': 'nursing',
                    'date': n.created_at,
                    'title': f"Soin Infirmier: {n.act_type.name if n.act_type else 'Soin'}",
                    'description': n.observations or '',
                    'status': n.get_status_display()
                })
                
            if hasattr(v, 'hospitalization'):
                h = v.hospitalization
                events.append({
                    'id': f"hosp-{h.id}",
                    'type': 'hospitalization',
                    'date': h.admitted_at,
                    'title': f"Hospitalisation ({h.bed.name if h.bed else ''})",
                    'description': h.reason or 'Admission',
                    'status': h.get_status_display()
                })

        events.sort(key=lambda x: x['date'], reverse=True)
        return Response(events)


class VisitViewSet(viewsets.ModelViewSet):
    queryset = Visit.objects.all().select_related('patient', 'assigned_doctor', 'created_by')
    serializer_class = VisitSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'visit_type', 'priority_level', 'patient', 'assigned_doctor']
    search_fields = ['passage_number', 'patient__first_name', 'patient__last_name', 'patient__mrn']
    ordering_fields = ['created_at', 'priority_level', 'passage_number']
    ordering = ['priority_level', '-created_at']

    def perform_create(self, serializer):
        staff = None
        if self.request.user.is_authenticated:
            try:
                staff = self.request.user.staff_profile
            except AttributeError:
                pass
        serializer.save(created_by=staff)

    @action(detail=True, methods=['post'], url_path='collect-payment')
    def collect_payment(self, request, pk=None):
        visit = self.get_object()
        
        # Solder la dette du patient si elle existe
        if visit.patient and visit.patient.outstanding_balance > 0:
            visit.patient.outstanding_balance = 0
            visit.patient.save()

        visit.is_paid = True
        visit.invoice_created = True
        
        if visit.status == 'waiting_cashier':
            visit.status = 'closed'
            
        visit.save()

        # Mark all associated lab & imaging requests as paid
        from laboratory.models import LabRequest, ImagingRequest
        LabRequest.objects.filter(visit=visit).update(is_paid=True)
        ImagingRequest.objects.filter(visit=visit).update(is_paid=True)

        # Mark hospitalization as paid if any exists
        if hasattr(visit, 'hospitalization'):
            visit.hospitalization.is_paid = True
            visit.hospitalization.save()

        # Mark nursing acts as paid
        visit.nursing_acts.update(is_paid=True)

        return Response(self.get_serializer(visit).data)

    @action(detail=False, methods=['post'], url_path='register-arrival')
    def register_arrival(self, request):
        """
        Specialized endpoint to register a patient arrival (creates a visit).
        Allows frontend to trigger arrival creation semantically.
        """
        patient_id = request.data.get('patient')
        force_emergency = request.data.get('force_emergency', False)
        force_cashier = request.data.get('force_cashier', False)

        if patient_id:
            from .models import Patient
            patient = Patient.objects.filter(id=patient_id).first()
            if patient and patient.outstanding_balance > 0 and not (force_emergency or force_cashier):
                return Response(
                    {
                        "error": "UNPAID_BALANCE",
                        "message": f"Le patient a une dette impayée de {patient.outstanding_balance} XAF.",
                        "outstanding_balance": patient.outstanding_balance
                    },
                    status=status.HTTP_402_PAYMENT_REQUIRED
                )

        data = request.data.copy() if hasattr(request.data, 'copy') else request.data
        if type(data) is dict:
            if force_cashier:
                data['status'] = 'waiting_cashier'
                data['reason_for_visit'] = "Recouvrement impayés antérieurs - " + data.get('reason_for_visit', '')
            elif force_emergency:
                data['reason_for_visit'] = "[URGENCE - DETTE FORCÉE] " + data.get('reason_for_visit', '')

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=['post'], url_path='record-vitals')
    def record_vitals(self, request, pk=None):
        """
        Endpoint for nurses to record vitals for a physical visit.
        Creates VitalSigns object, updates visit status, priority, and assigned doctor.
        """
        visit = self.get_object()
        
        # Get staff profile of recorder
        staff = None
        if request.user.is_authenticated:
            try:
                staff = request.user.staff_profile
            except AttributeError:
                pass
                
        if not staff:
            return Response({'detail': 'Profil de personnel de santé introuvable.'}, status=status.HTTP_400_BAD_REQUEST)

        # Deserialize and save vital signs
        from consultations.serializers import VitalSignsSerializer
        
        vitals_data = request.data.copy()
        vitals_data['patient'] = visit.patient.id
        vitals_data['visit'] = visit.id
        
        vitals_serializer = VitalSignsSerializer(data=vitals_data)
        if not vitals_serializer.is_valid():
            print("VITALS ERRORS:", vitals_serializer.errors)
        vitals_serializer.is_valid(raise_exception=True)
        vitals = vitals_serializer.save(recorded_by=staff)
        
        # Update visit priority and doctor if provided in the request
        priority_level = request.data.get('priority_level')
        if priority_level is not None:
            visit.priority_level = int(priority_level)
            
        assigned_doctor_id = request.data.get('assigned_doctor')
        if assigned_doctor_id:
            from staff.models import Staff
            try:
                visit.assigned_doctor = Staff.objects.get(id=assigned_doctor_id)
            except Staff.DoesNotExist:
                pass
                
        # Transition status:
        # If nursing_only (soins infirmiers uniquement), bypass the doctor and go to waiting_nursing_act.
        if visit.visit_type == 'nursing_only':
            visit.status = 'waiting_nursing_act'
        else:
            visit.status = 'waiting_doctor'
            
        visit.save()
        
        return Response({
            'visit': self.get_serializer(visit).data,
            'vitals': vitals_serializer.data
        }, status=status.HTTP_201_CREATED)


