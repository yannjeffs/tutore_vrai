from django.db import models
from core.models import BaseModel
from django.utils import timezone
import datetime

class Patient(BaseModel):
    # System generated Medical Record Number (e.g. MDK-2026-00001)
    mrn = models.CharField(max_length=20, unique=True, editable=False)
    
    # Personal Info
    first_name = models.CharField(max_length=150, null=True, blank=True)
    last_name = models.CharField(max_length=150, null=True, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=10, null=True, blank=True, choices=[
        ('M', 'Masculin'),
        ('F', 'Féminin')
    ])
    blood_group = models.CharField(max_length=5, null=True, blank=True, choices=[
        ('A+', 'A+'), ('A-', 'A-'),
        ('B+', 'B+'), ('B-', 'B-'),
        ('AB+', 'AB+'), ('AB-', 'AB-'),
        ('O+', 'O+'), ('O-', 'O-'),
    ])
    
    # Financial Info
    outstanding_balance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
    # Contact Info
    phone = models.CharField(max_length=30, null=True, blank=True)
    email = models.EmailField(null=True, blank=True)
    address = models.TextField(null=True, blank=True)
    city = models.CharField(max_length=100, null=True, blank=True)
    
    # Identifiers
    national_id = models.CharField(max_length=50, null=True, blank=True)
    
    # Flags
    is_deceased = models.BooleanField(default=False)
    date_of_death = models.DateField(null=True, blank=True)
    
    # Statut spécial (patient inconscient)
    is_provisional = models.BooleanField(default=False)
    provisional_description = models.TextField(null=True, blank=True)
    
    # Archivage
    is_archived = models.BooleanField(default=False)
    archived_at = models.DateTimeField(null=True, blank=True)
    
    # Profile completeness and specific info
    occupation = models.CharField(max_length=100, null=True, blank=True)
    marital_status = models.CharField(max_length=20, null=True, blank=True, choices=[
        ('C', 'Célibataire'),
        ('M', 'Marié(e)'),
        ('D', 'Divorcé(e)'),
        ('V', 'Veuf/Veuve')
    ])
    
    # Financial/Insurance
    payment_type = models.CharField(max_length=20, default='CASH', choices=[
        ('CASH', 'Privé (Cash)'),
        ('INSURANCE', 'Assurance')
    ])

    @property
    def age(self):
        if not self.date_of_birth:
            return None
        today = datetime.date.today()
        return today.year - self.date_of_birth.year - ((today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day))

    def get_full_name(self):
        first = self.first_name or 'Patient'
        last = self.last_name or 'Inconnu'
        if self.is_provisional:
            return f"{first} {last} (PROVISOIRE)"
        return f"{first} {last}"

    def __str__(self):
        return f"{self.get_full_name()} ({self.mrn})"

class PatientContact(models.Model):
    patient = models.ForeignKey(Patient, related_name='emergency_contacts', on_delete=models.CASCADE)
    name = models.CharField(max_length=200)
    relationship = models.CharField(max_length=50) # Parent, Conjoint, Frère/Soeur, etc.
    phone = models.CharField(max_length=30)
    email = models.EmailField(null=True, blank=True)
    
    def __str__(self):
        return f"{self.name} ({self.relationship} de {self.patient.first_name})"

class Allergy(models.Model):
    patient = models.ForeignKey(Patient, related_name='allergies', on_delete=models.CASCADE)
    allergen = models.CharField(max_length=150)
    severity = models.CharField(max_length=20, choices=[
        ('LOW', 'Faible'),
        ('MODERATE', 'Modérée'),
        ('HIGH', 'Sévère'),
    ])
    reaction = models.TextField(null=True, blank=True)
    identified_date = models.DateField(null=True, blank=True)
    
    class Meta:
        verbose_name_plural = 'Allergies'

class Antecedent(models.Model):
    patient = models.ForeignKey(Patient, related_name='antecedents', on_delete=models.CASCADE)
    type = models.CharField(max_length=50, choices=[
        ('MEDICAL', 'Médical'),
        ('SURGICAL', 'Chirurgical'),
        ('FAMILY', 'Familial'),
        ('OBSTETRIC', 'Obstétrique'),
    ])
    condition = models.CharField(max_length=200)
    description = models.TextField(null=True, blank=True)
    diagnosis_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return f"{self.get_type_display()} - {self.condition}"


class VisitStatus(models.TextChoices):
    WAITING_NURSE = 'waiting_nurse', 'En attente constantes'
    IN_NURSE_CARE = 'in_nurse_care', 'Constantes en cours'
    WAITING_DOCTOR = 'waiting_doctor', 'En attente médecin'
    IN_DOCTOR_CARE = 'in_doctor_care', 'En consultation'
    WAITING_LAB = 'waiting_lab', 'En attente labo'
    LAB_RESULTS_READY = 'lab_results_ready', 'Résultats labo prêts'
    WAITING_HOSPITALIZATION = 'waiting_hospitalization', 'En attente hospitalisation'
    HOSPITALIZED = 'hospitalized', 'Hospitalisé'
    WAITING_NURSING_ACT = 'waiting_nursing_act', 'En attente acte infirmier'
    WAITING_CASHIER = 'waiting_cashier', 'En attente caisse'
    CLOSED = 'closed', 'Clôturé'


class VisitType(models.TextChoices):
    NORMAL = 'normal', 'Normal'
    NURSING_ONLY = 'nursing_only', 'Soins infirmiers uniquement'
    FOLLOW_UP_RESULTS = 'follow_up_results', 'Retour examens / Suivi'
    EMERGENCY = 'emergency', 'Urgence'


class Visit(BaseModel):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='visits')
    passage_number = models.CharField(max_length=20, unique=True, editable=False)
    
    status = models.CharField(
        max_length=30, 
        choices=VisitStatus.choices, 
        default=VisitStatus.WAITING_NURSE
    )
    visit_type = models.CharField(
        max_length=30, 
        choices=VisitType.choices, 
        default=VisitType.NORMAL
    )
    
    priority_level = models.IntegerField(
        default=4,
        choices=[
            (1, 'P1 - Urgence Vitale (Rouge)'),
            (2, 'P2 - Urgence Majeure'),
            (3, 'P3 - Urgence Modérée'),
            (4, 'P4 - Standard'),
            (5, 'P5 - Très faible priorité'),
        ]
    )
    
    reason_for_visit = models.TextField(blank=True, null=True)
    assigned_doctor = models.ForeignKey(
        'staff.Staff', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='assigned_visits'
    )
    department = models.CharField(max_length=100, blank=True, null=True)
    
    # Financial details for the visit
    invoice_created = models.BooleanField(default=False)
    is_paid = models.BooleanField(default=False)
    
    # Audit trail
    created_by = models.ForeignKey(
        'staff.Staff', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='created_visits'
    )
    
    def save(self, *args, **kwargs):
        if not self.passage_number:
            today = timezone.localdate()
            count = Visit.all_objects.filter(created_at__date=today).count() + 1
            self.passage_number = f"VIS-{today.strftime('%Y%m%d')}-{count:03d}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.passage_number} - {self.patient.get_full_name()} ({self.get_status_display()})"

