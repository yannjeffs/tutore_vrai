from rest_framework import permissions

class HasPermission(permissions.BasePermission):
    """
    Custom permission to check if user's staff role has specific permission.
    Example usage in view:
    permission_classes = [IsAuthenticated, HasPermission]
    required_permission = 'patients_create'
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.user.is_superuser:
            return True

        required_perm = getattr(view, 'required_permission', None)
        if not required_perm:
            # If no specific permission is required, default to true or false based on design
            return True
            
        staff = getattr(request.user, 'staff_profile', None)
        if not staff:
            return False

        # Get all permissions for this staff member
        roles = staff.roles.select_related('role').prefetch_related('role__permissions__permission')
        
        for staff_role in roles:
            for role_perm in staff_role.role.permissions.all():
                if role_perm.permission.code == required_perm:
                    return True
                    
        return False
