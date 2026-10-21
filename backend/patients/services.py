import datetime
from django.db import transaction
from .models import Patient

def generate_mrn():
    """
    Generates a unique Medical Record Number in the format: MDK-YYYY-XXXXX
    """
    year = datetime.date.today().year
    prefix = f"MDK-{year}-"
    
    with transaction.atomic():
        # Lock the table/rows to prevent race conditions during generation
        last_patient = Patient.all_objects.filter(mrn__startswith=prefix).select_for_update().order_by('-mrn').first()
        
        if last_patient:
            last_sequence = int(last_patient.mrn.split('-')[-1])
            new_sequence = last_sequence + 1
        else:
            new_sequence = 1
            
        return f"{prefix}{new_sequence:05d}"
