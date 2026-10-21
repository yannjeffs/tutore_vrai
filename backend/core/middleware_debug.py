import traceback

class ExceptionLoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        try:
            return self.get_response(request)
        except Exception as e:
            with open('error_middleware.txt', 'w') as f:
                f.write(traceback.format_exc())
            raise e
