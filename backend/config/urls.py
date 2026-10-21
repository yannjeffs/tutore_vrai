from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('staff.urls')),
    path('api/', include('patients.urls')),
    path('api/', include('consultations.urls')),
    path('api/', include('laboratory.urls')),
    path('api/', include('hospitalization.urls')),
    path('api/', include('nursing.urls')),
    path('api/', include('appointments.urls')),
    path('api/', include('core.urls')),
    
    # OpenAPI Docs
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]

import mimetypes
mimetypes.add_type("application/pdf", ".pdf", True)
mimetypes.add_type("image/png", ".png", True)
mimetypes.add_type("image/jpeg", ".jpg", True)
mimetypes.add_type("image/jpeg", ".jpeg", True)

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
