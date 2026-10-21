from django.db import models
from patients.models import Patient
from staff.models import Staff

class AppointmentStatus(models.TextChoices):
    SCHEDULED = 'SCHEDULED', 'Programmé'
    COMPLETED = 'COMPLETED', 'Terminé'
    CANCELLED = 'CANCELLED', 'Annulé'

class Appointment(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='appointments')
    doctor = models.ForeignKey(Staff, on_delete=models.SET_NULL, null=True, blank=True, related_name='appointments')
    appointment_date = models.DateTimeField()
    reason = models.CharField(max_length=255)
    notes = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=AppointmentStatus.choices, default=AppointmentStatus.SCHEDULED)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['appointment_date']

    def __str__(self):
        return f"{self.patient} - {self.appointment_date}"
