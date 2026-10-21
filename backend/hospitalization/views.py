from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.utils import timezone
from .models import Ward, Bed, Hospitalization, InpatientLog
from .serializers import WardSerializer, BedSerializer, HospitalizationSerializer, InpatientLogSerializer
from patients.models import Visit

class WardViewSet(viewsets.ModelViewSet):
    queryset = Ward.objects.all().prefetch_related('beds')
    serializer_class = WardSerializer

    def list(self, request, *args, **kwargs):
        # Auto-seed wards and beds if they don't exist
        if Ward.objects.count() == 0:
            with transaction.atomic():
                maternite = Ward.objects.create(name="Maternité", department="Gynéco-Obstétrique")
                pediatrie = Ward.objects.create(name="Pédiatrie", department="Pédiatrie")
                medecine_hommes = Ward.objects.create(name="Médecine Hommes", department="Médecine Interne")
                medecine_femmes = Ward.objects.create(name="Médecine Femmes", department="Médecine Interne")
                vip = Ward.objects.create(name="Pavillon VIP", department="Général")

                # Create beds
                for i in range(1, 6):
                    Bed.objects.create(name=f"Lit {i}", ward=maternite, price_per_day=8000)
                    Bed.objects.create(name=f"Lit {i}", ward=pediatrie, price_per_day=6000)
                    Bed.objects.create(name=f"Lit {i}", ward=medecine_hommes, price_per_day=7500)
                    Bed.objects.create(name=f"Lit {i}", ward=medecine_femmes, price_per_day=7500)
                
                Bed.objects.create(name="Chambre VIP 101", ward=vip, price_per_day=25000)
                Bed.objects.create(name="Chambre VIP 102", ward=vip, price_per_day=25000)
        
        return super().list(request, *args, **kwargs)

class BedViewSet(viewsets.ModelViewSet):
    queryset = Bed.objects.select_related('ward').all()
    serializer_class = BedSerializer

class HospitalizationViewSet(viewsets.ModelViewSet):
    queryset = Hospitalization.objects.select_related(
        'visit', 'patient', 'bed', 'bed__ward', 'admitted_by', 'discharged_by'
    ).prefetch_related('logs', 'logs__recorded_by').all()
    serializer_class = HospitalizationSerializer

    def perform_create(self, serializer):
        bed = serializer.validated_data['bed']
        visit = serializer.validated_data['visit']
        
        if bed.status != 'available':
            raise serializers.ValidationError({'bed': 'Ce lit n\'est pas disponible.'})

        with transaction.atomic():
            # Create hospitalization
            serializer.save(
                admitted_by=self.request.user.staff_profile,
                status='active'
            )
            # Update bed status
            bed.status = 'occupied'
            bed.save()
            # Update visit status
            visit.status = 'hospitalized'
            visit.save()

    @action(detail=True, methods=['post'], url_path='discharge')
    def discharge(self, request, pk=None):
        hospitalization = self.get_object()
        if hospitalization.status == 'discharged':
            return Response({'error': 'Le patient est déjà sorti.'}, status=status.HTTP_400_BAD_REQUEST)

        summary = request.data.get('discharge_summary', '')
        
        with transaction.atomic():
            hospitalization.status = 'discharged'
            hospitalization.discharged_at = timezone.now()
            hospitalization.discharged_by = request.user.staff_profile
            hospitalization.discharge_summary = summary
            hospitalization.save()

            # Free the bed
            bed = hospitalization.bed
            bed.status = 'available'
            bed.save()

            # Transition visit status to waiting_cashier
            visit = hospitalization.visit
            visit.status = 'waiting_cashier'
            visit.save()

        return Response(self.get_serializer(hospitalization).data)

    @action(detail=True, methods=['post'], url_path='add-log')
    def add_log(self, request, pk=None):
        hospitalization = self.get_object()
        if hospitalization.status == 'discharged':
            return Response({'error': 'Impossible de consigner un soin sur une hospitalisation clôturée.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = InpatientLogSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(
                hospitalization=hospitalization,
                recorded_by=request.user.staff_profile
            )
            # Return updated serialization with full prefetch
            return Response(self.get_serializer(hospitalization).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
