from django.db import models
from django.utils import timezone
from core.models import BaseModel
from patients.models import Patient, Visit
from staff.models import Staff

class Ward(BaseModel):
    name = models.CharField(max_length=100, unique=True)
    department = models.CharField(max_length=100, default='Général')

    def __str__(self):
        return self.name

class BedStatus(models.TextChoices):
    AVAILABLE = 'available', 'Disponible'
    OCCUPIED = 'occupied', 'Occupé'
    MAINTENANCE = 'maintenance', 'Maintenance'

class Bed(BaseModel):
    name = models.CharField(max_length=50)
    ward = models.ForeignKey(Ward, on_delete=models.CASCADE, related_name='beds')
    status = models.CharField(max_length=20, choices=BedStatus.choices, default=BedStatus.AVAILABLE)
    price_per_day = models.IntegerField(default=10000)

    class Meta:
        unique_together = ('ward', 'name')
        ordering = ['name']

    def __str__(self):
        return f"{self.ward.name} - {self.name}"

class HospitalizationStatus(models.TextChoices):
    ACTIVE = 'active', 'En cours'
    DISCHARGED = 'discharged', 'Sorti'

class Hospitalization(BaseModel):
    visit = models.OneToOneField(Visit, on_delete=models.CASCADE, related_name='hospitalization')
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='hospitalizations')
    bed = models.ForeignKey(Bed, on_delete=models.RESTRICT, related_name='hospitalizations')
    reason = models.TextField(blank=True, null=True)
    
    admitted_by = models.ForeignKey(Staff, on_delete=models.RESTRICT, related_name='hospitalizations_admitted')
    admitted_at = models.DateTimeField(default=timezone.now)
    
    discharged_by = models.ForeignKey(Staff, on_delete=models.SET_NULL, null=True, blank=True, related_name='hospitalizations_discharged')
    discharged_at = models.DateTimeField(null=True, blank=True)
    discharge_summary = models.TextField(blank=True, null=True)
    
    status = models.CharField(max_length=20, choices=HospitalizationStatus.choices, default=HospitalizationStatus.ACTIVE)
    is_paid = models.BooleanField(default=False)

    def __str__(self):
        return f"Hosp #{self.id} - {self.patient} ({self.status})"

class InpatientLog(BaseModel):
    hospitalization = models.ForeignKey(Hospitalization, on_delete=models.CASCADE, related_name='logs')
    recorded_by = models.ForeignKey(Staff, on_delete=models.RESTRICT)
    recorded_at = models.DateTimeField(default=timezone.now)
    
    temperature = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    blood_pressure = models.CharField(max_length=20, null=True, blank=True) # e.g. "120/80"
    pulse_rate = models.IntegerField(null=True, blank=True)
    
    notes = models.TextField()
    medication_administered = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-recorded_at']

    def __str__(self):
        return f"Log by {self.recorded_by} at {self.recorded_at}"
