from rest_framework import serializers
from .models import Ward, Bed, Hospitalization, InpatientLog
from django.utils import timezone

class WardSerializer(serializers.ModelSerializer):
    beds_count = serializers.IntegerField(source='beds.count', read_only=True)
    available_beds_count = serializers.SerializerMethodField()

    class Meta:
        model = Ward
        fields = ['id', 'name', 'department', 'beds_count', 'available_beds_count', 'created_at']

    def get_available_beds_count(self, obj):
        return obj.beds.filter(status='available').count()

class BedSerializer(serializers.ModelSerializer):
    ward_name = serializers.CharField(source='ward.name', read_only=True)
    current_occupant = serializers.SerializerMethodField()

    class Meta:
        model = Bed
        fields = ['id', 'name', 'ward', 'ward_name', 'status', 'price_per_day', 'current_occupant']

    def get_current_occupant(self, obj):
        if obj.status == 'occupied':
            active_hosp = obj.hospitalizations.filter(status='active').first()
            if active_hosp:
                return {
                    'hospitalization_id': active_hosp.id,
                    'patient_id': active_hosp.patient.id,
                    'patient_name': active_hosp.patient.get_full_name(),
                    'patient_mrn': active_hosp.patient.mrn,
                    'visit_id': active_hosp.visit.id,
                    'visit_number': active_hosp.visit.passage_number,
                    'admitted_at': active_hosp.admitted_at,
                    'reason': active_hosp.reason,
                    'doctor_name': active_hosp.visit.assigned_doctor.get_full_name() if active_hosp.visit.assigned_doctor else 'Non assigné'
                }
        return None

class InpatientLogSerializer(serializers.ModelSerializer):
    recorded_by_name = serializers.CharField(source='recorded_by.get_full_name', read_only=True)

    class Meta:
        model = InpatientLog
        fields = [
            'id', 'hospitalization', 'recorded_by', 'recorded_by_name',
            'recorded_at', 'temperature', 'blood_pressure', 'pulse_rate',
            'notes', 'medication_administered'
        ]
        read_only_fields = ['recorded_by']

class HospitalizationSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.get_full_name', read_only=True)
    patient_mrn = serializers.CharField(source='patient.mrn', read_only=True)
    bed_name = serializers.CharField(source='bed.name', read_only=True)
    ward_name = serializers.CharField(source='bed.ward.name', read_only=True)
    admitted_by_name = serializers.CharField(source='admitted_by.get_full_name', read_only=True)
    discharged_by_name = serializers.CharField(source='discharged_by.get_full_name', read_only=True)
    
    days_count = serializers.SerializerMethodField()
    total_cost = serializers.SerializerMethodField()
    logs = InpatientLogSerializer(many=True, read_only=True)

    class Meta:
        model = Hospitalization
        fields = [
            'id', 'visit', 'patient', 'patient_name', 'patient_mrn', 
            'bed', 'bed_name', 'ward_name', 'reason', 
            'admitted_by', 'admitted_by_name', 'admitted_at',
            'discharged_by', 'discharged_by_name', 'discharged_at', 'discharge_summary',
            'status', 'is_paid', 'days_count', 'total_cost', 'logs'
        ]
        read_only_fields = ['admitted_by', 'discharged_by', 'discharged_at', 'status', 'is_paid']

    def get_days_count(self, obj):
        end_time = obj.discharged_at or timezone.now()
        duration = end_time - obj.admitted_at
        # Minimum of 1 day, round up if more than 2 hours into next day
        days = max(1, duration.days + (1 if duration.seconds > 3600 * 2 else 0))
        return days

    def get_total_cost(self, obj):
        days = self.get_days_count(obj)
        return days * obj.bed.price_per_day
