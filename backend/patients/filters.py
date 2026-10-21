import django_filters
from .models import Patient

class PatientFilter(django_filters.FilterSet):
    created_date = django_filters.CharFilter(method='filter_created_date')

    class Meta:
        model = Patient
        fields = ['gender', 'blood_group', 'city', 'is_deceased', 'is_provisional', 'is_archived']

    def filter_created_date(self, queryset, name, value):
        if value:
            return queryset.filter(created_at__startswith=value)
        return queryset
