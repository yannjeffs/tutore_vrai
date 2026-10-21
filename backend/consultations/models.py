from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models import BaseModel
from patients.models import Patient
from staff.models import Staff

class ConsultationStatus(models.TextChoices):
    PENDING_TRIAGE = 'pending_triage', _('En attente triage')
    WAITING_DOCTOR = 'waiting_doctor', _('En attente médecin')
    IN_PROGRESS = 'in_progress', _('En cours')
    COMPLETED = 'completed', _('Terminée')
    CANCELLED = 'cancelled', _('Annulée')

class ConsultationType(models.TextChoices):
    GENERAL = 'general', _('Médecine Générale')
    SPECIALIST = 'specialist', _('Spécialiste')
    FOLLOW_UP = 'follow_up', _('Suivi')
    EMERGENCY = 'emergency', _('Urgence')

class Consultation(BaseModel):
    visit = models.ForeignKey('patients.Visit', on_delete=models.SET_NULL, null=True, blank=True, related_name='consultations')
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='consultations')
    doctor = models.ForeignKey(Staff, on_delete=models.RESTRICT, related_name='consultations', null=True, blank=True)
    
    status = models.CharField(max_length=20, choices=ConsultationStatus.choices, default=ConsultationStatus.PENDING_TRIAGE)
    type = models.CharField(max_length=20, choices=ConsultationType.choices, default=ConsultationType.GENERAL)
    
    hospitalization_required = models.BooleanField(default=False)
    hospitalization_reason = models.TextField(blank=True, null=True)
    
    # SOAP Data
    chief_complaint = models.TextField(blank=True, verbose_name="Motif de consultation")
    anamnesis = models.TextField(blank=True, verbose_name="Histoire de la maladie / Anamnèse")
    physical_examination = models.TextField(blank=True, verbose_name="Examen physique")
    conclusion = models.TextField(blank=True, verbose_name="Conclusion / Plan")

    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Consultation {self.id} - {self.patient} - {self.started_at.date()}"

class ICD10Code(models.Model):
    code = models.CharField(max_length=20, unique=True)
    description = models.CharField(max_length=255)
    category = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.code} - {self.description}"

class ConsultationDiagnosis(BaseModel):
    consultation = models.ForeignKey(Consultation, on_delete=models.CASCADE, related_name='diagnoses')
    icd10_code = models.ForeignKey(ICD10Code, on_delete=models.SET_NULL, null=True, blank=True)
    description = models.CharField(max_length=255, help_text="Diagnostic texte libre si pas de code CIM-10")
    is_primary = models.BooleanField(default=False)
    notes = models.TextField(blank=True)

    def __str__(self):
        code_str = self.icd10_code.code if self.icd10_code else "No Code"
        return f"{code_str}: {self.description}"

class VitalSigns(BaseModel):
    visit = models.ForeignKey('patients.Visit', on_delete=models.SET_NULL, null=True, blank=True, related_name='vital_signs')
    consultation = models.ForeignKey(Consultation, on_delete=models.CASCADE, related_name='vital_signs', null=True, blank=True)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='vital_signs')
    recorded_by = models.ForeignKey(Staff, on_delete=models.RESTRICT)
    
    temperature = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True, help_text="En °C")
    blood_pressure_systolic = models.PositiveIntegerField(null=True, blank=True, help_text="mmHg")
    blood_pressure_diastolic = models.PositiveIntegerField(null=True, blank=True, help_text="mmHg")
    heart_rate = models.PositiveIntegerField(null=True, blank=True, help_text="bpm")
    respiratory_rate = models.PositiveIntegerField(null=True, blank=True, help_text="cpm")
    oxygen_saturation = models.PositiveIntegerField(null=True, blank=True, help_text="% (SpO2)")
    weight = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="En kg")
    height = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="En cm")
    
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']

class Prescription(BaseModel):
    consultation = models.ForeignKey(Consultation, on_delete=models.CASCADE, related_name='prescriptions')
    prescribed_by = models.ForeignKey(Staff, on_delete=models.RESTRICT)
    valid_until = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True, help_text="Instructions générales (ex: A prendre après les repas)")

class PrescriptionItem(BaseModel):
    prescription = models.ForeignKey(Prescription, on_delete=models.CASCADE, related_name='items')
    medication_name = models.CharField(max_length=255)
    dosage = models.CharField(max_length=100, help_text="ex: 500mg, 1 cuillère à soupe")
    frequency = models.CharField(max_length=100, help_text="ex: 3 fois par jour")
    duration = models.CharField(max_length=100, help_text="ex: 5 jours")
    instructions = models.TextField(blank=True, help_text="Instructions spécifiques au médicament")

class EvolutionNote(BaseModel):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='evolution_notes')
    doctor = models.ForeignKey(Staff, on_delete=models.RESTRICT)
    consultation = models.ForeignKey(Consultation, on_delete=models.CASCADE, null=True, blank=True)
    note = models.TextField()

    class Meta:
        ordering = ['-created_at']
