from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from .models import ExamType, LabRequest, LabResult, ImagingRequest
from .serializers import (
    ExamTypeSerializer, LabRequestSerializer, LabResultSerializer,
    ImagingRequestSerializer
)

class ExamTypeViewSet(viewsets.ModelViewSet):
    queryset = ExamType.objects.filter(is_active=True)
    serializer_class = ExamTypeSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['category']
    search_fields = ['name', 'code']

class LabRequestViewSet(viewsets.ModelViewSet):
    queryset = LabRequest.objects.select_related('patient', 'requested_by', 'exam_type')
    serializer_class = LabRequestSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_fields = ['patient', 'consultation', 'status', 'priority', 'exam_type__category']
    ordering_fields = ['created_at', 'priority']
    search_fields = ['patient__first_name', 'patient__last_name']

    def perform_create(self, serializer):
        serializer.save(requested_by=self.request.user.staff_profile)

    @action(detail=True, methods=['post'])
    def add_result(self, request, pk=None):
        lab_request = self.get_object()
        if hasattr(lab_request, 'result'):
            return Response({'detail': 'Result already exists.'}, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = LabResultSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(
                lab_request=lab_request,
                validated_by=request.user.staff_profile
            )
            lab_request.status = 'completed'
            lab_request.completed_at = timezone.now()
            lab_request.completed_by = request.user.staff_profile
            lab_request.save()

            # Transition visit status if all lab & imaging requests for this visit are finished
            visit = lab_request.visit
            if visit:
                pending_labs = LabRequest.objects.filter(visit=visit).exclude(status__in=['completed', 'cancelled']).exists()
                pending_imaging = ImagingRequest.objects.filter(visit=visit).exclude(status__in=['completed', 'cancelled']).exists()
                if not pending_labs and not pending_imaging:
                    visit.status = 'lab_results_ready'
                    visit.save()

            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ImagingRequestViewSet(viewsets.ModelViewSet):
    queryset = ImagingRequest.objects.select_related('patient', 'requested_by', 'exam_type')
    serializer_class = ImagingRequestSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_fields = ['patient', 'consultation', 'status', 'priority']
    ordering_fields = ['created_at', 'priority']
    search_fields = ['patient__first_name', 'patient__last_name']

    def perform_create(self, serializer):
        serializer.save(requested_by=self.request.user.staff_profile)

    @action(detail=True, methods=['post'])
    def add_report(self, request, pk=None):
        imaging_request = self.get_object()
        report_text = request.data.get('report')
        if not report_text:
            return Response({'detail': 'Report text is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        imaging_request.report = report_text
        imaging_request.status = 'completed'
        imaging_request.reported_by = request.user.staff_profile
        imaging_request.reported_at = timezone.now()
        imaging_request.save()

        # Transition visit status if all lab & imaging requests for this visit are finished
        visit = imaging_request.visit
        if visit:
            pending_labs = LabRequest.objects.filter(visit=visit).exclude(status__in=['completed', 'cancelled']).exists()
            pending_imaging = ImagingRequest.objects.filter(visit=visit).exclude(status__in=['completed', 'cancelled']).exists()
            if not pending_labs and not pending_imaging:
                visit.status = 'lab_results_ready'
                visit.save()
        
        serializer = self.get_serializer(imaging_request)
        return Response(serializer.data)
