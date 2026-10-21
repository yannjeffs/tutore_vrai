from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import NursingActType, NursingAct
from .serializers import NursingActTypeSerializer, NursingActSerializer
from patients.models import Visit

class NursingActTypeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = NursingActType.objects.filter(is_active=True).order_by('category', 'name')
    serializer_class = NursingActTypeSerializer

    def get_queryset(self):
        # Auto-seed some default types if none exist
        if not NursingActType.objects.exists():
            defaults = [
                {'name': 'Injection IM', 'category': 'INJECTION', 'default_price': 1000},
                {'name': 'Injection IV', 'category': 'INJECTION', 'default_price': 1500},
                {'name': 'Pansement simple', 'category': 'DRESSING', 'default_price': 2000},
                {'name': 'Pansement complexe', 'category': 'DRESSING', 'default_price': 3500},
                {'name': 'Pose perfusion', 'category': 'INFUSION', 'default_price': 2500},
                {'name': 'Prélèvement sanguin externe', 'category': 'BLOOD_DRAW', 'default_price': 1500},
                {'name': 'Retrait de fils', 'category': 'OTHER', 'default_price': 2000},
                {'name': 'Aérosol', 'category': 'OTHER', 'default_price': 2500},
            ]
            for d in defaults:
                NursingActType.objects.create(**d)
        
        return super().get_queryset()

class NursingActViewSet(viewsets.ModelViewSet):
    queryset = NursingAct.objects.all().select_related('visit', 'patient', 'act_type', 'performed_by__user')
    serializer_class = NursingActSerializer
    filterset_fields = ['visit', 'patient', 'status']

    def perform_create(self, serializer):
        # Determine the user
        staff = getattr(self.request.user, 'staff_profile', None)
        
        # Determine price from the selected act type
        act_type = serializer.validated_data.get('act_type')
        price = act_type.default_price if act_type else 0
        
        serializer.save(performed_by=staff, price=price)

    @action(detail=True, methods=['post'], url_path='complete')
    def complete(self, request, pk=None):
        act = self.get_object()
        
        if act.status == 'completed':
            return Response({'detail': 'Cet acte est déjà terminé.'}, status=status.HTTP_400_BAD_REQUEST)
            
        act.status = 'completed'
        act.completed_at = timezone.now()
        
        # Override staff if doing it now
        staff = getattr(self.request.user, 'staff_profile', None)
        if staff:
            act.performed_by = staff
            
        act.save()
        
        # Check if the visit status needs to be updated (all acts done)
        visit = act.visit
        pending_acts = visit.nursing_acts.filter(status='pending').exists()
        
        # If visit was nursing_only and all acts are done, we move to cashier
        if not pending_acts and visit.visit_type == 'nursing_only' and visit.status == 'waiting_nursing_act':
            visit.status = 'waiting_cashier'
            visit.save()
            
        return Response(self.get_serializer(act).data)
