from django.contrib import admin
from django.urls import path, include, re_path
from django.views.static import serve
from django.http import JsonResponse
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('', lambda r: JsonResponse({'service': 'tunza-api', 'status': 'ok'})),
    path('admin/', admin.site.urls),
    path('api/auth/',      include('accounts.urls')),
    path('api/caregivers/', include('caregivers.urls')),
    path('api/bookings/',  include('bookings.urls')),
    path('api/messages/',  include('messaging.urls')),
    path('api/ratings/',   include('ratings.urls')),
    path('api/payments/',  include('payments.urls')),
    path('api/locations/', include('locations.urls')),
    path('api/care-requests/', include('care_requests.urls')),
    path('api/admin/',     include('accounts.admin_api')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# static() only works with DEBUG=True. For the pilot on Render we still need
# uploaded photos to be served, so serve MEDIA directly when DEBUG is off.
# (Move uploads to S3/Cloudinary before scaling up — Render's disk is wiped on
# every deploy.)
if not settings.DEBUG:
    urlpatterns += [
        re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
    ]
