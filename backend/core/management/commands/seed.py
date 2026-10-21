import datetime
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from staff.models import Role, Staff, StaffRole
from patients.models import Patient
from patients.services import generate_mrn

class Command(BaseCommand):
    help = 'Seed database with initial data including roles and staff members'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding database...')

        # 1. Create Roles
        roles = [
            {'code': 'ADMIN', 'name': 'Administrateur', 'desc': 'Accès total'},
            {'code': 'DOCTOR', 'name': 'Médecin', 'desc': 'Accès médical complet'},
            {'code': 'NURSE', 'name': 'Infirmier(ère)', 'desc': 'Accès aux soins'},
            {'code': 'RECEPTIONIST', 'name': 'Réceptionniste', 'desc': 'Accueil et admission'},
            {'code': 'LAB_TECH', 'name': 'Technicien Labo', 'desc': 'Technicien de laboratoire'},
        ]
        
        db_roles = {}
        for r in roles:
            role_obj, _ = Role.objects.get_or_create(
                code=r['code'],
                defaults={'name': r['name'], 'description': r['desc'], 'is_system': True, 'id': r['code']}
            )
            db_roles[r['code']] = role_obj
        self.stdout.write('Roles created.')

        # Helper function to create staff
        def create_staff_member(username, password, first_name, last_name, role_code, role_choice, emp_num, spec=None, title=None):
            user, created = User.objects.get_or_create(username=username, defaults={'email': f'{username}@meditek.local'})
            user.set_password(password)
            user.first_name = first_name
            user.last_name = last_name
            user.is_staff = True
            if role_choice == 'admin':
                user.is_superuser = True
            user.save()

            # Ensure Staff profile exists
            staff, s_created = Staff.objects.get_or_create(
                user=user,
                defaults={
                    'employee_number': emp_num,
                    'role': role_choice,
                    'specialization': spec,
                    'title': title,
                    'is_active_staff': True
                }
            )
            if not s_created:
                staff.role = role_choice
                staff.employee_number = emp_num
                staff.specialization = spec
                staff.title = title
                staff.save()

            # Assign Role model link
            StaffRole.objects.get_or_create(staff=staff, role=db_roles[role_code])
            
            action = "created" if created else "updated"
            self.stdout.write(f"Staff '{username}' ({role_choice}) {action}.")
            return staff

        # Create members
        create_staff_member('admin', 'admin123', 'Super', 'Admin', 'ADMIN', 'admin', 'EMP-0001', title='Admin Système')
        
        # Doctors (Médecins)
        create_staff_member('doctor', 'doctor123', 'Michel', 'Atangana', 'DOCTOR', 'doctor', 'EMP-0002', spec='Cardiologue', title='Dr.')
        create_staff_member('doctor2', 'doctor123', 'Cédric', 'Kameni', 'DOCTOR', 'doctor', 'EMP-0010', spec='Généraliste', title='Dr.')
        create_staff_member('doctor3', 'doctor123', 'Chantal', 'Mvondo', 'DOCTOR', 'doctor', 'EMP-0011', spec='Pédiatre', title='Dr.')
        create_staff_member('doctor4', 'doctor123', 'Fabrice', 'Njoya', 'DOCTOR', 'doctor', 'EMP-0012', spec='Gynécologue', title='Dr.')
        create_staff_member('doctor5', 'doctor123', 'Josiane', 'Tchuente', 'DOCTOR', 'doctor', 'EMP-0013', spec='Chirurgien', title='Dr.')
        create_staff_member('doctor6', 'doctor123', 'Yannick', 'Oumarou', 'DOCTOR', 'doctor', 'EMP-0014', spec='Ophtalmologue', title='Dr.')
        create_staff_member('doctor7', 'doctor123', 'Alain', 'Ndongo', 'DOCTOR', 'doctor', 'EMP-0015', spec='Neurologue', title='Pr.')

        # Other Staff
        create_staff_member('nurse', 'nurse123', 'Florence', 'Ngo', 'NURSE', 'nurse', 'EMP-0003', title='Infirmière')
        create_staff_member('nurse2', 'nurse123', 'Christiane', 'Essomba', 'NURSE', 'nurse', 'EMP-0016', title='Infirmière')
        create_staff_member('receptionist', 'receptionist123', 'Clarisse', 'Belinga', 'RECEPTIONIST', 'receptionist', 'EMP-0004', title='Mme')
        create_staff_member('receptionist2', 'receptionist123', 'Valérie', 'Ekotto', 'RECEPTIONIST', 'receptionist', 'EMP-0017', title='Mme')
        create_staff_member('lab_tech', 'lab123', 'Marc', 'Ebanda', 'LAB_TECH', 'lab_tech', 'EMP-0005', spec='Analyses Médicales', title='Mr')
        create_staff_member('lab_tech2', 'lab123', 'Thierry', 'Fouda', 'LAB_TECH', 'lab_tech', 'EMP-0018', spec='Biologiste', title='Dr.')

        # 3. Create Sample Patients
        if not Patient.objects.exists():
            patients = [
                {
                    'first_name': 'Jean', 'last_name': 'Dupont', 
                    'date_of_birth': '1980-05-15', 'gender': 'M',
                    'city': 'Douala', 'phone': '690000001', 'outstanding_balance': 0.00
                },
                {
                    'first_name': 'Marie', 'last_name': 'Kamga', 
                    'date_of_birth': '1992-11-23', 'gender': 'F',
                    'city': 'Yaoundé', 'phone': '670000002', 'outstanding_balance': 15000.00 # Patient with outstanding balance for warning testing!
                },
                {
                    'first_name': 'Paul', 'last_name': 'Biya', 
                    'date_of_birth': '1933-02-13', 'gender': 'M',
                    'city': 'Yaoundé', 'phone': '680000003', 'outstanding_balance': 0.00
                }
            ]
            for p in patients:
                Patient.objects.create(
                    mrn=generate_mrn(),
                    **p
                )
            self.stdout.write('Sample patients created.')

        self.stdout.write(self.style.SUCCESS('Database seeded successfully!'))
