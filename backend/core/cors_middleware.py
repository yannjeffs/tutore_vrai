"""
Custom CORS Middleware to handle CORS headers explicitly
"""

class SimpleCorsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        print("=== SimpleCorsMiddleware initialized ===")

    def __call__(self, request):
        print(f"=== CORS Middleware: {request.method} {request.path} ===")
        print(f"Origin: {request.META.get('HTTP_ORIGIN', 'NO ORIGIN')}")
        
        # Handle preflight OPTIONS request
        if request.method == 'OPTIONS':
            from django.http import HttpResponse
            print("=== Handling OPTIONS preflight request ===")
            response = HttpResponse()
            response['Access-Control-Allow-Origin'] = request.META.get('HTTP_ORIGIN', '*')
            response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
            response['Access-Control-Allow-Headers'] = 'Origin, Content-Type, Accept, Authorization, X-CSRFToken'
            response['Access-Control-Allow-Credentials'] = 'true'
            response['Access-Control-Max-Age'] = '86400'
            print(f"=== OPTIONS response headers set: {dict(response.items())} ===")
            return response

        response = self.get_response(request)
        
        # Add CORS headers to all responses
        origin = request.META.get('HTTP_ORIGIN')
        if origin:
            response['Access-Control-Allow-Origin'] = origin
            response['Access-Control-Allow-Credentials'] = 'true'
            response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
            response['Access-Control-Allow-Headers'] = 'Origin, Content-Type, Accept, Authorization, X-CSRFToken'
            print(f"=== Added CORS headers for origin: {origin} ===")
        
        return response
