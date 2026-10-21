from django.core.management.base import BaseCommand
from laboratory.models import ExamType

class Command(BaseCommand):
    help = 'Seed database with lab exam types'

    def handle(self, *args, **kwargs):
        exams = [
            {'code': 'HEM01', 'name': 'Numération Formule Sanguine (NFS)', 'category': 'hematology', 'price': 5000},
            {'code': 'HEM02', 'name': 'Goutte Épaisse (GE)', 'category': 'hematology', 'price': 2000},
            {'code': 'HEM03', 'name': 'Vitesse de Sédimentation (VS)', 'category': 'hematology', 'price': 3000},
            {'code': 'BIO01', 'name': 'Glycémie à jeun', 'category': 'biochemistry', 'price': 2500},
            {'code': 'BIO02', 'name': 'Créatininémie', 'category': 'biochemistry', 'price': 4000},
            {'code': 'BIO03', 'name': 'Transaminases (ASAT/ALAT)', 'category': 'biochemistry', 'price': 6000},
            {'code': 'MIC01', 'name': 'Examen Cyto-Bactériologique des Urines (ECBU)', 'category': 'microbiology', 'price': 8000},
            {'code': 'PAR01', 'name': 'Examen Parasitologique des Selles (EPS)', 'category': 'parasitology', 'price': 3500},
            {'code': 'SER01', 'name': 'Test Rapide VIH', 'category': 'serology', 'price': 2000},
            {'code': 'SER02', 'name': 'Antigène HBs', 'category': 'serology', 'price': 4500},
            {'code': 'SER03', 'name': 'Test Widal (Typhoïde)', 'category': 'serology', 'price': 3000},
            {'code': 'IMG01', 'name': 'Echographie Abdominale', 'category': 'imaging', 'price': 15000},
            {'code': 'IMG02', 'name': 'Radiographie Thorax', 'category': 'imaging', 'price': 12000},
        ]
        
        for ex in exams:
            ExamType.objects.get_or_create(code=ex['code'], defaults=ex)
            
        self.stdout.write(self.style.SUCCESS('Exam types seeded successfully!'))
