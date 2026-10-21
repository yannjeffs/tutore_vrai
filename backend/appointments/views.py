from rest_framework import viewsets
from .models import Appointment
from .serializers import AppointmentSerializer

class AppointmentViewSet(viewsets.ModelViewSet):
    queryset = Appointment.objects.all()
    serializer_class = AppointmentSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        date = self.request.query_params.get('date', None)
        status = self.request.query_params.get('status', None)
        doctor_id = self.request.query_params.get('doctor_id', None)
        patient_id = self.request.query_params.get('patient_id', None)
        
        if date:
            queryset = queryset.filter(appointment_date__date=date)
        if status:
            queryset = queryset.filter(status=status)
        if doctor_id:
            queryset = queryset.filter(doctor_id=doctor_id)
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
            
        return queryset
