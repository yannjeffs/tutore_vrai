import threading

request_cfg = threading.local()

class AuditMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request_cfg.user = request.user if hasattr(request, 'user') and request.user.is_authenticated else None
        
        # Get IP address
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        request_cfg.ip_address = ip

        response = self.get_response(request)
        
        # Cleanup
        if hasattr(request_cfg, 'user'):
            del request_cfg.user
        if hasattr(request_cfg, 'ip_address'):
            del request_cfg.ip_address
            
        return response
