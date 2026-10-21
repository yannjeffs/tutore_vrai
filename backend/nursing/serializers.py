from rest_framework import serializers
from .models import NursingActType, NursingAct

class NursingActTypeSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)

    class Meta:
        model = NursingActType
        fields = ['id', 'name', 'category', 'category_display', 'default_price', 'is_active']

class NursingActSerializer(serializers.ModelSerializer):
    act_type_name = serializers.CharField(source='act_type.name', read_only=True)
    patient_name = serializers.CharField(source='patient.get_full_name', read_only=True)
    performed_by_name = serializers.CharField(source='performed_by.user.get_full_name', read_only=True)

    class Meta:
        model = NursingAct
        fields = [
            'id', 'visit', 'patient', 'patient_name', 'act_type', 'act_type_name',
            'price', 'notes', 'status', 'performed_by', 'performed_by_name',
            'completed_at', 'is_paid', 'created_at', 'updated_at'
        ]
        read_only_fields = ['status', 'performed_by', 'completed_at', 'is_paid', 'price']
