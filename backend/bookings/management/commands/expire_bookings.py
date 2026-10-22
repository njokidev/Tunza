from django.core.management.base import BaseCommand

from bookings.services import expire_stale_requests


class Command(BaseCommand):
    help = 'Decline booking requests that caregivers have not answered in time (see BOOKING_AUTO_DECLINE_MINUTES).'

    def handle(self, *args, **opts):
        n = expire_stale_requests()
        self.stdout.write(f'{n} booking request(s) declined.')
