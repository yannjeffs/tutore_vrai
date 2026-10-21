from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models import BaseModel
from patients.models import Patient
from staff.models import Staff
from consultations.models import Consultation

class ExamCategory(models.TextChoices):
    BLOOD = 'blood', _('Sanguin')
    URINE = 'urine', _('Urinaire')
    STOOL = 'stool', _('Selles')
    IMAGING = 'imaging', _('Imagerie')
    OTHER = 'other', _('Autre')

class ExamType(models.Model):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, unique=True, blank=True, null=True)
    category = models.CharField(max_length=20, choices=ExamCategory.choices, default=ExamCategory.BLOOD)
    description = models.TextField(blank=True)
    normal_range_min = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    normal_range_max = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    unit = models.CharField(max_length=50, blank=True)
    price = models.IntegerField(default=2500)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} ({self.get_category_display()})"

class RequestStatus(models.TextChoices):
    PENDING = 'pending', _('En attente')
    IN_PROGRESS = 'in_progress', _('En cours')
    COMPLETED = 'completed', _('Terminé')
    CANCELLED = 'cancelled', _('Annulé')

class LabRequest(BaseModel):
    visit = models.ForeignKey('patients.Visit', on_delete=models.SET_NULL, null=True, blank=True, related_name='lab_requests')
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='lab_requests')
    consultation = models.ForeignKey(Consultation, on_delete=models.CASCADE, related_name='lab_requests', null=True, blank=True)
    requested_by = models.ForeignKey(Staff, on_delete=models.RESTRICT, related_name='lab_requests_made')
    exam_type = models.ForeignKey(ExamType, on_delete=models.RESTRICT)
    
    status = models.CharField(max_length=20, choices=RequestStatus.choices, default=RequestStatus.PENDING)
    clinical_notes = models.TextField(blank=True, help_text="Renseignements cliniques pertinents")
    priority = models.CharField(max_length=20, choices=[('normal', 'Normal'), ('urgent', 'Urgent')], default='normal')
    is_paid = models.BooleanField(default=False)
    
    # Track completion
    completed_at = models.DateTimeField(null=True, blank=True)
    completed_by = models.ForeignKey(Staff, on_delete=models.RESTRICT, related_name='lab_requests_completed', null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"LabReq {self.id} - {self.patient} - {self.exam_type.name}"

class ResultFlag(models.TextChoices):
    NORMAL = 'normal', _('Normal')
    LOW = 'low', _('Bas')
    HIGH = 'high', _('Élevé')
    CRITICAL = 'critical', _('Critique')

class LabResult(BaseModel):
    lab_request = models.OneToOneField(LabRequest, on_delete=models.CASCADE, related_name='result')
    value = models.CharField(max_length=255)
    numeric_value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    flag = models.CharField(max_length=20, choices=ResultFlag.choices, default=ResultFlag.NORMAL)
    notes = models.TextField(blank=True)
    attachment = models.FileField(upload_to='lab_results/', null=True, blank=True, help_text="Pièce jointe (PDF, Image)")
    
    validated_by = models.ForeignKey(Staff, on_delete=models.RESTRICT, related_name='validated_results')
    validated_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Result for {self.lab_request}"

class ImagingRequest(BaseModel):
    visit = models.ForeignKey('patients.Visit', on_delete=models.SET_NULL, null=True, blank=True, related_name='imaging_requests')
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='imaging_requests')
    consultation = models.ForeignKey(Consultation, on_delete=models.CASCADE, related_name='imaging_requests', null=True, blank=True)
    requested_by = models.ForeignKey(Staff, on_delete=models.RESTRICT)
    exam_type = models.ForeignKey(ExamType, on_delete=models.RESTRICT)
    
    status = models.CharField(max_length=20, choices=RequestStatus.choices, default=RequestStatus.PENDING)
    clinical_notes = models.TextField(blank=True)
    priority = models.CharField(max_length=20, choices=[('normal', 'Normal'), ('urgent', 'Urgent')], default='normal')
    is_paid = models.BooleanField(default=False)
    
    report = models.TextField(blank=True, help_text="Compte-rendu du radiologue")
    image_file = models.FileField(upload_to='imaging_results/', null=True, blank=True, help_text="Image médicale (Radio, Echo)")
    reported_by = models.ForeignKey(Staff, on_delete=models.RESTRICT, related_name='imaging_reports', null=True, blank=True)
    reported_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"ImagingReq {self.id} - {self.patient} - {self.exam_type.name}"
