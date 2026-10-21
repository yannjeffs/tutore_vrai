from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import viewsets
from rest_framework_simplejwt.views import TokenObtainPairView
from .models import Staff
from .serializers import CustomTokenObtainPairSerializer, StaffSerializer, StaffWriteSerializer
from .permissions import IsAdminUser

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        staff = getattr(request.user, 'staff_profile', None)
        if staff:
            serializer = StaffSerializer(staff)
            return Response(serializer.data)
        return Response({
            'id': request.user.id,
            'username': request.user.username,
            'email': request.user.email,
            'is_superuser': request.user.is_superuser
        })

class StaffViewSet(viewsets.ModelViewSet):
    queryset = Staff.objects.all().select_related('user')
    serializer_class = StaffSerializer
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [IsAuthenticated()]
        
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return StaffWriteSerializer
        return StaffSerializer
    
    def get_queryset(self):
        role = self.request.query_params.get('role')
        queryset = self.queryset.filter(is_active_staff=True)
        if role:
            queryset = queryset.filter(role=role)
        return queryset

