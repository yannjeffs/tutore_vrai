from rest_framework import serializers
from .models import Patient, PatientContact, Allergy, Antecedent, Visit
from .services import generate_mrn

class PatientContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatientContact
        fields = ['id', 'name', 'relationship', 'phone', 'email']

class AllergySerializer(serializers.ModelSerializer):
    class Meta:
        model = Allergy
        fields = ['id', 'allergen', 'severity', 'reaction', 'identified_date']

class AntecedentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Antecedent
        fields = ['id', 'type', 'condition', 'description', 'diagnosis_date', 'is_active']

class PatientListSerializer(serializers.ModelSerializer):
    age = serializers.ReadOnlyField()

    class Meta:
        model = Patient
        fields = [
            'id', 'mrn', 'first_name', 'last_name', 'date_of_birth', 'age',
            'gender', 'phone', 'city', 'is_deceased', 'created_at',
            'is_provisional', 'provisional_description',
            'is_archived', 'archived_at'
        ]

class PatientDetailSerializer(serializers.ModelSerializer):
    age = serializers.ReadOnlyField()
    emergency_contacts = PatientContactSerializer(many=True, required=False)
    allergies = AllergySerializer(many=True, required=False)
    antecedents = AntecedentSerializer(many=True, required=False)

    class Meta:
        model = Patient
        fields = [
            'id', 'mrn', 'first_name', 'last_name', 'date_of_birth', 'age',
            'gender', 'blood_group', 'phone', 'email', 'address', 'city',
            'national_id', 'is_deceased', 'date_of_death', 'occupation',
            'marital_status', 'created_at', 'updated_at',
            'is_provisional', 'provisional_description',
            'is_archived', 'archived_at',
            'emergency_contacts', 'allergies', 'antecedents'
        ]
        read_only_fields = ['mrn', 'created_at', 'updated_at']

    def create(self, validated_data):
        contacts_data = validated_data.pop('emergency_contacts', [])
        allergies_data = validated_data.pop('allergies', [])
        antecedents_data = validated_data.pop('antecedents', [])

        validated_data['mrn'] = generate_mrn()
        patient = Patient.objects.create(**validated_data)

        for contact in contacts_data:
            PatientContact.objects.create(patient=patient, **contact)
        for allergy in allergies_data:
            Allergy.objects.create(patient=patient, **allergy)
        for antecedent in antecedents_data:
            Antecedent.objects.create(patient=patient, **antecedent)

        return patient

    def update(self, instance, validated_data):
        contacts_data = validated_data.pop('emergency_contacts', None)
        allergies_data = validated_data.pop('allergies', None)
        antecedents_data = validated_data.pop('antecedents', None)

        # Update basic info
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Simple nested update: delete existing and recreate
        # For a production app, we would sync by ID, but this works for simpler forms
        if contacts_data is not None:
            instance.emergency_contacts.all().delete()
            for contact in contacts_data:
                PatientContact.objects.create(patient=instance, **contact)

        if allergies_data is not None:
            instance.allergies.all().delete()
            for allergy in allergies_data:
                Allergy.objects.create(patient=instance, **allergy)

        if antecedents_data is not None:
            instance.antecedents.all().delete()
            for antecedent in antecedents_data:
                Antecedent.objects.create(patient=instance, **antecedent)

        return instance


class VisitSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.get_full_name', read_only=True)
    patient_mrn = serializers.CharField(source='patient.mrn', read_only=True)
    patient_outstanding_balance = serializers.DecimalField(source='patient.outstanding_balance', max_digits=10, decimal_places=2, read_only=True)
    assigned_doctor_name = serializers.SerializerMethodField(read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    active_consultation_id = serializers.SerializerMethodField(read_only=True)
    vital_signs = serializers.SerializerMethodField(read_only=True)
    prescribed_exams = serializers.SerializerMethodField(read_only=True)
    hospitalization_details = serializers.SerializerMethodField(read_only=True)
    nursing_acts = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Visit
        fields = [
            'id', 'patient', 'patient_name', 'patient_mrn', 'patient_outstanding_balance',
            'passage_number', 'status', 'visit_type', 'priority_level',
            'reason_for_visit', 'assigned_doctor', 'assigned_doctor_name',
            'department', 'invoice_created', 'is_paid', 'created_by',
            'created_by_name', 'created_at', 'updated_at', 'active_consultation_id', 
            'vital_signs', 'prescribed_exams', 'hospitalization_details', 'nursing_acts'
        ]
        read_only_fields = ['passage_number', 'invoice_created', 'is_paid', 'created_at', 'updated_at']

    def get_assigned_doctor_name(self, obj):
        if obj.assigned_doctor:
            return obj.assigned_doctor.get_full_name()
        return None

    def get_active_consultation_id(self, obj):
        consultation = obj.consultations.first()
        return consultation.id if consultation else None

    def get_vital_signs(self, obj):
        vitals = obj.vital_signs.first()
        if vitals:
            return {
                'id': vitals.id,
                'temperature': vitals.temperature,
                'blood_pressure_systolic': vitals.blood_pressure_systolic,
                'blood_pressure_diastolic': vitals.blood_pressure_diastolic,
                'heart_rate': vitals.heart_rate,
                'respiratory_rate': vitals.respiratory_rate,
                'oxygen_saturation': vitals.oxygen_saturation,
                'weight': vitals.weight,
                'height': vitals.height,
                'notes': vitals.notes,
                'recorded_by_name': vitals.recorded_by.get_full_name() if vitals.recorded_by else None,
                'created_at': vitals.created_at
            }
        return None

    def get_prescribed_exams(self, obj):
        exams = []
        for req in obj.lab_requests.select_related('exam_type').all():
            exams.append({
                'id': req.id,
                'name': req.exam_type.name,
                'category': 'laboratory',
                'price': req.exam_type.price,
                'is_paid': req.is_paid,
                'status': req.status
            })
        for req in obj.imaging_requests.select_related('exam_type').all():
            exams.append({
                'id': req.id,
                'name': req.exam_type.name,
                'category': 'imaging',
                'price': req.exam_type.price,
                'is_paid': req.is_paid,
                'status': req.status
            })
        return exams

    def get_hospitalization_details(self, obj):
        if hasattr(obj, 'hospitalization'):
            hosp = obj.hospitalization
            from django.utils import timezone
            end_time = hosp.discharged_at or timezone.now()
            duration = end_time - hosp.admitted_at
            days = max(1, duration.days + (1 if duration.seconds > 3600 * 2 else 0))
            return {
                'id': hosp.id,
                'bed_id': hosp.bed.id,
                'bed_name': hosp.bed.name,
                'ward_name': hosp.bed.ward.name,
                'price_per_day': hosp.bed.price_per_day,
                'days': days,
                'total_price': days * hosp.bed.price_per_day,
                'is_paid': hosp.is_paid,
                'status': hosp.status,
                'admitted_at': hosp.admitted_at,
                'discharged_at': hosp.discharged_at,
            }
        return None

    def get_nursing_acts(self, obj):
        acts = []
        # Utiliser prefetch_related dans viewset pour optimiser si possible
        for act in obj.nursing_acts.all():
            acts.append({
                'id': act.id,
                'name': act.act_type.name,
                'price': act.price,
                'status': act.status,
                'is_paid': act.is_paid
            })
        return acts

