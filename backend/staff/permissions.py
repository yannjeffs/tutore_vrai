from rest_framework import permissions

class IsAdminUser(permissions.BasePermission):
    """
    Allows access only to admin users (superusers or staff with role='admin').
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
            
        if request.user.is_superuser:
            return True
            
        staff_profile = getattr(request.user, 'staff_profile', None)
        if staff_profile and staff_profile.role == 'admin':
            return True
            
        return False
