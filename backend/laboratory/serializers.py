from rest_framework import serializers
from .models import ExamType, LabRequest, LabResult, ImagingRequest

class ExamTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamType
        fields = '__all__'

class LabResultSerializer(serializers.ModelSerializer):
    validated_by_name = serializers.CharField(source='validated_by.get_full_name', read_only=True)

    class Meta:
        model = LabResult
        fields = '__all__'
        read_only_fields = ['lab_request', 'validated_by']

class LabRequestSerializer(serializers.ModelSerializer):
    exam_type_details = ExamTypeSerializer(source='exam_type', read_only=True)
    requested_by_name = serializers.CharField(source='requested_by.get_full_name', read_only=True)
    patient_name = serializers.CharField(source='patient.get_full_name', read_only=True)
    patient_payment_type = serializers.CharField(source='patient.payment_type', read_only=True)
    result = LabResultSerializer(read_only=True)

    class Meta:
        model = LabRequest
        fields = '__all__'
        read_only_fields = ['requested_by', 'completed_by', 'completed_at']

class ImagingRequestSerializer(serializers.ModelSerializer):
    exam_type_details = ExamTypeSerializer(source='exam_type', read_only=True)
    requested_by_name = serializers.CharField(source='requested_by.get_full_name', read_only=True)
    patient_name = serializers.CharField(source='patient.get_full_name', read_only=True)
    patient_payment_type = serializers.CharField(source='patient.payment_type', read_only=True)
    reported_by_name = serializers.CharField(source='reported_by.get_full_name', read_only=True)

    class Meta:
        model = ImagingRequest
        fields = '__all__'
        read_only_fields = ['requested_by', 'reported_by', 'reported_at']
