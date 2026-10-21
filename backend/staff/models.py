from django.db import models
from django.contrib.auth.models import User
from core.models import BaseModel

class Clinic(BaseModel):
    name = models.CharField(max_length=255)
    legal_name = models.CharField(max_length=255, null=True, blank=True)
    address = models.TextField(null=True, blank=True)
    phone = models.CharField(max_length=30, null=True, blank=True)
    email = models.EmailField(max_length=255, null=True, blank=True)
    logo_url = models.TextField(null=True, blank=True)
    license_number = models.CharField(max_length=100, null=True, blank=True)
    country_code = models.CharField(max_length=2, default='CM')
    currency_code = models.CharField(max_length=3, default='XAF')
    timezone = models.CharField(max_length=50, default='Africa/Douala')
    
    archive_after_years = models.IntegerField(default=5)
    retention_years = models.IntegerField(default=20)

    def __str__(self):
        return self.name

class Staff(BaseModel):
    ROLE_CHOICES = [
        ('doctor', 'Médecin'),
        ('nurse', 'Infirmier(e)'),
        ('receptionist', 'Réceptionniste'),
        ('lab_tech', 'Technicien Labo'),
        ('admin', 'Administrateur'),
    ]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='staff_profile')
    employee_number = models.CharField(max_length=30, unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='receptionist')
    title = models.CharField(max_length=20, null=True, blank=True)
    specialization = models.CharField(max_length=150, null=True, blank=True)
    phone = models.CharField(max_length=30, null=True, blank=True)
    avatar_url = models.TextField(null=True, blank=True)
    signature_url = models.TextField(null=True, blank=True)
    license_number = models.CharField(max_length=100, null=True, blank=True)
    is_active_staff = models.BooleanField(default=True)
    departure_date = models.DateField(null=True, blank=True)
    departed_reason = models.CharField(max_length=50, null=True, blank=True)

    def get_full_name(self):
        return f"{self.user.first_name} {self.user.last_name}".strip() or self.user.username

    def __str__(self):
        return f"{self.get_full_name()} ({self.employee_number})"

class Role(models.Model):
    id = models.CharField(max_length=36, primary_key=True)
    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=100)
    description = models.TextField(null=True, blank=True)
    is_system = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Permission(models.Model):
    id = models.CharField(max_length=36, primary_key=True)
    code = models.CharField(max_length=100, unique=True)
    module = models.CharField(max_length=50)
    action = models.CharField(max_length=30)
    description = models.TextField(null=True, blank=True)

    def __str__(self):
        return self.code

class RolePermission(models.Model):
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name='permissions')
    permission = models.ForeignKey(Permission, on_delete=models.CASCADE)

    class Meta:
        unique_together = ('role', 'permission')

class StaffRole(models.Model):
    staff = models.ForeignKey(Staff, on_delete=models.CASCADE, related_name='roles')
    role = models.ForeignKey(Role, on_delete=models.CASCADE)
    assigned_at = models.DateTimeField(auto_now_add=True)
    assigned_by = models.ForeignKey(Staff, on_delete=models.SET_NULL, null=True, related_name='+')

    class Meta:
        unique_together = ('staff', 'role')
