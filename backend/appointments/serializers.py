from rest_framework import serializers
from .models import Appointment

class AppointmentSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    patient_mrn = serializers.CharField(source='patient.mrn', read_only=True)
    doctor_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Appointment
        fields = '__all__'

    def get_patient_name(self, obj):
        return f"{obj.patient.first_name} {obj.patient.last_name}"
        
    def get_doctor_name(self, obj):
        if obj.doctor:
            return f"{obj.doctor.user.first_name} {obj.doctor.user.last_name}"
        return "Non assigné"
