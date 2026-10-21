from rest_framework import serializers
from .models import (
    Consultation, ICD10Code, ConsultationDiagnosis, VitalSigns,
    Prescription, PrescriptionItem, EvolutionNote
)

class ICD10CodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ICD10Code
        fields = ['id', 'code', 'description', 'category', 'is_active']

class ConsultationDiagnosisSerializer(serializers.ModelSerializer):
    icd10_code_details = ICD10CodeSerializer(source='icd10_code', read_only=True)

    class Meta:
        model = ConsultationDiagnosis
        fields = ['id', 'consultation', 'icd10_code', 'icd10_code_details', 'description', 'is_primary', 'notes']
        read_only_fields = ['consultation']

class VitalSignsSerializer(serializers.ModelSerializer):
    recorded_by_name = serializers.CharField(source='recorded_by.get_full_name', read_only=True)

    class Meta:
        model = VitalSigns
        fields = '__all__'
        read_only_fields = ['recorded_by', 'created_at', 'updated_at']

class PrescriptionItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrescriptionItem
        fields = ['id', 'prescription', 'medication_name', 'dosage', 'frequency', 'duration', 'instructions']
        read_only_fields = ['prescription']

class PrescriptionSerializer(serializers.ModelSerializer):
    items = PrescriptionItemSerializer(many=True, read_only=True)
    prescribed_by_name = serializers.CharField(source='prescribed_by.get_full_name', read_only=True)

    class Meta:
        model = Prescription
        fields = ['id', 'consultation', 'prescribed_by', 'prescribed_by_name', 'valid_until', 'notes', 'items', 'created_at']
        read_only_fields = ['consultation', 'prescribed_by']

class ConsultationSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.get_full_name', read_only=True)
    doctor_name = serializers.CharField(source='doctor.get_full_name', read_only=True)
    
    diagnoses = ConsultationDiagnosisSerializer(many=True, read_only=True)
    vital_signs = VitalSignsSerializer(many=True, read_only=True)
    prescriptions = PrescriptionSerializer(many=True, read_only=True)

    class Meta:
        model = Consultation
        fields = [
            'id', 'visit', 'patient', 'patient_name', 'doctor', 'doctor_name',
            'status', 'type', 'chief_complaint', 'anamnesis', 'physical_examination',
            'conclusion', 'started_at', 'ended_at', 'created_at', 'updated_at',
            'diagnoses', 'vital_signs', 'prescriptions',
            'hospitalization_required', 'hospitalization_reason'
        ]
        read_only_fields = []

class EvolutionNoteSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source='doctor.get_full_name', read_only=True)

    class Meta:
        model = EvolutionNote
        fields = ['id', 'patient', 'doctor', 'doctor_name', 'consultation', 'note', 'created_at']
        read_only_fields = ['doctor']
