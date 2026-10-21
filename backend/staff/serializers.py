from rest_framework import serializers
from django.contrib.auth.models import User
from django.db import transaction
from .models import Staff, Role, Permission

class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ['code', 'module', 'action']

class RoleSerializer(serializers.ModelSerializer):
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = Role
        fields = ['code', 'name', 'permissions']

    def get_permissions(self, obj):
        perms = [rp.permission.code for rp in obj.permissions.select_related('permission')]
        return perms

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_active']

class StaffSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    roles = serializers.SerializerMethodField()

    class Meta:
        model = Staff
        fields = [
            'id', 'user', 'employee_number', 'title', 'specialization',
            'phone', 'avatar_url', 'is_active_staff', 'roles', 'role'
        ]

    def get_roles(self, obj):
        roles = [sr.role for sr in obj.roles.select_related('role')]
        return RoleSerializer(roles, many=True).data

class StaffWriteSerializer(serializers.ModelSerializer):
    username = serializers.CharField(write_only=True)
    password = serializers.CharField(write_only=True, required=False)
    email = serializers.EmailField(write_only=True, required=False, allow_blank=True)
    first_name = serializers.CharField(write_only=True)
    last_name = serializers.CharField(write_only=True)
    
    class Meta:
        model = Staff
        fields = [
            'username', 'password', 'email', 'first_name', 'last_name',
            'role', 'title', 'specialization', 'phone'
        ]
        
    def create(self, validated_data):
        username = validated_data.pop('username')
        password = validated_data.pop('password', 'Meditek2026!')
        email = validated_data.pop('email', '')
        first_name = validated_data.pop('first_name')
        last_name = validated_data.pop('last_name')
        
        with transaction.atomic():
            user = User.objects.create_user(
                username=username,
                password=password,
                email=email,
                first_name=first_name,
                last_name=last_name
            )
            
            last_staff = Staff.objects.order_by('id').last()
            next_id = (last_staff.id + 1) if last_staff else 1
            employee_number = f"EMP-{next_id:04d}"
            
            staff = Staff.objects.create(
                user=user,
                employee_number=employee_number,
                **validated_data
            )
            return staff

    def update(self, instance, validated_data):
        user_data = {
            'username': validated_data.pop('username', None),
            'password': validated_data.pop('password', None),
            'email': validated_data.pop('email', None),
            'first_name': validated_data.pop('first_name', None),
            'last_name': validated_data.pop('last_name', None),
        }
        
        with transaction.atomic():
            user = instance.user
            if user_data['username']: user.username = user_data['username']
            if user_data['email'] is not None: user.email = user_data['email']
            if user_data['first_name']: user.first_name = user_data['first_name']
            if user_data['last_name']: user.last_name = user_data['last_name']
            if user_data['password']: user.set_password(user_data['password'])
            user.save()
            
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance.save()
            
            return instance

from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        
        # Add custom data
        staff = getattr(self.user, 'staff_profile', None)
        if staff:
            data['user'] = StaffSerializer(staff).data
        else:
            data['user'] = UserSerializer(self.user).data

        return data
