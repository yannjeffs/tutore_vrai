from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Sum, Count, Q
from patients.models import Patient, Visit
from consultations.models import Consultation
from laboratory.models import LabRequest, ImagingRequest
from nursing.models import NursingAct
from hospitalization.models import Hospitalization, Bed, BedStatus
import datetime

class AdminDashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        period = request.query_params.get('period', 'today')
        today = timezone.now().date()
        
        if period == 'today':
            start_date = today
            end_date = today
        elif period == 'week':
            start_date = today - datetime.timedelta(days=today.weekday()) # Monday
            end_date = start_date + datetime.timedelta(days=6) # Sunday
        elif period == 'month':
            start_date = today.replace(day=1)
            # next month minus 1 day
            next_month = start_date.replace(day=28) + datetime.timedelta(days=4)
            end_date = next_month - datetime.timedelta(days=next_month.day)
        elif period == 'year':
            start_date = today.replace(month=1, day=1)
            end_date = today.replace(month=12, day=31)
        else:
            start_date = today
            end_date = today

        start_of_period = timezone.make_aware(datetime.datetime.combine(start_date, datetime.time.min))
        end_of_period = timezone.make_aware(datetime.datetime.combine(end_date, datetime.time.max))

        # 1. Patients Stats
        total_patients = Patient.objects.count()
        patients_period = Patient.objects.filter(created_at__range=(start_of_period, end_of_period)).count()
        visits_period = Visit.objects.filter(created_at__range=(start_of_period, end_of_period)).count()

        # 2. Financial Stats
        # Outstanding Debt
        total_debt = Patient.objects.aggregate(total=Sum('outstanding_balance'))['total'] or 0

        # Revenue Calculation (All time and Today)
        # We look at is_paid=True and updated_at (which is when it was paid ideally)
        
        # Lab & Imaging
        lab_paid = LabRequest.objects.filter(is_paid=True)
        imaging_paid = ImagingRequest.objects.filter(is_paid=True)
        nursing_paid = NursingAct.objects.filter(is_paid=True)
        hosp_paid = Hospitalization.objects.filter(is_paid=True)
        
        lab_period = lab_paid.filter(updated_at__range=(start_of_period, end_of_period))
        imaging_period = imaging_paid.filter(updated_at__range=(start_of_period, end_of_period))
        nursing_period = nursing_paid.filter(updated_at__range=(start_of_period, end_of_period))
        hosp_period = hosp_paid.filter(updated_at__range=(start_of_period, end_of_period))

        def calculate_lab_revenue(qs):
            return sum([req.exam_type.price for req in qs.select_related('exam_type')])

        def calculate_hosp_revenue(qs):
            total = 0
            for h in qs.select_related('bed'):
                end_time = h.discharged_at or timezone.now()
                duration = end_time - h.admitted_at
                days = max(1, duration.days + (1 if duration.seconds > 3600 * 2 else 0))
                total += days * h.bed.price_per_day
            return total

        # Consultations (using hardcoded mapping for now)
        consultations_paid = Consultation.objects.filter(visit__is_paid=True)
        consultations_period = consultations_paid.filter(visit__updated_at__range=(start_of_period, end_of_period))
        
        def calculate_consult_revenue(qs):
            mapping = {'emergency': 25000, 'follow_up': 5000, 'specialist': 15000, 'general': 10000}
            return sum([mapping.get(c.type, 10000) for c in qs])

        total_revenue = (
            calculate_lab_revenue(lab_paid) +
            calculate_lab_revenue(imaging_paid) +
            (nursing_paid.aggregate(total=Sum('price'))['total'] or 0) +
            calculate_hosp_revenue(hosp_paid) +
            calculate_consult_revenue(consultations_paid)
        )

        period_revenue = (
            calculate_lab_revenue(lab_period) +
            calculate_lab_revenue(imaging_period) +
            (nursing_period.aggregate(total=Sum('price'))['total'] or 0) +
            calculate_hosp_revenue(hosp_period) +
            calculate_consult_revenue(consultations_period)
        )

        # 3. Hospitalization (Bed Occupancy)
        total_beds = Bed.objects.count()
        occupied_beds = Bed.objects.filter(status=BedStatus.OCCUPIED).count()
        occupancy_rate = (occupied_beds / total_beds * 100) if total_beds > 0 else 0

        # 4. Consultations Count
        total_consults_period = Consultation.objects.filter(started_at__range=(start_of_period, end_of_period)).count()

        return Response({
            'patients': {
                'total': total_patients,
                'new_period': patients_period,
                'visits_period': visits_period
            },
            'finances': {
                'total_revenue': total_revenue,
                'period_revenue': period_revenue,
                'outstanding_debt': total_debt
            },
            'hospitalization': {
                'total_beds': total_beds,
                'occupied_beds': occupied_beds,
                'occupancy_rate': round(occupancy_rate, 1)
            },
            'consultations': {
                'period': total_consults_period
            },
            'period_info': {
                'start_date': start_date.strftime('%Y-%m-%d'),
                'end_date': end_date.strftime('%Y-%m-%d'),
            }
        })
