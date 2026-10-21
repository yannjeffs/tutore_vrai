from django.db import models
from core.models import BaseModel

class NursingActType(models.Model):
    name = models.CharField(max_length=200)
    category = models.CharField(max_length=50, choices=[
        ('INJECTION', 'Injection'),
        ('DRESSING', 'Pansement'),
        ('INFUSION', 'Perfusion'),
        ('BLOOD_DRAW', 'Prélèvement'),
        ('OTHER', 'Autre')
    ])
    default_price = models.IntegerField(default=0, help_text="Prix par défaut en FCFA")
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} ({self.get_category_display()})"

class NursingActStatus(models.TextChoices):
    PENDING = 'pending', 'En attente'
    COMPLETED = 'completed', 'Terminé'

class NursingAct(BaseModel):
    visit = models.ForeignKey('patients.Visit', on_delete=models.CASCADE, related_name='nursing_acts')
    patient = models.ForeignKey('patients.Patient', on_delete=models.CASCADE, related_name='nursing_acts')
    act_type = models.ForeignKey(NursingActType, on_delete=models.RESTRICT)
    
    price = models.IntegerField(default=0, help_text="Prix facturé en FCFA")
    notes = models.TextField(blank=True, null=True)
    
    status = models.CharField(
        max_length=20, 
        choices=NursingActStatus.choices, 
        default=NursingActStatus.PENDING
    )
    
    performed_by = models.ForeignKey(
        'staff.Staff', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='performed_nursing_acts'
    )
    completed_at = models.DateTimeField(null=True, blank=True)
    is_paid = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.act_type.name} - {self.patient.get_full_name()} ({self.get_status_display()})"
