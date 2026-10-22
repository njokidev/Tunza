import secrets

from django.db import migrations, models


def backfill_pins(apps, schema_editor):
    """Accepted or ongoing bookings made before PINs existed get PINs now."""
    Booking = apps.get_model('bookings', 'Booking')
    for b in Booking.objects.filter(status__in=['accepted', 'ongoing'], start_pin=''):
        b.start_pin = f'{secrets.randbelow(10000):04d}'
        b.end_pin = f'{(int(b.start_pin) + 1 + secrets.randbelow(9998)) % 10000:04d}'
        b.save(update_fields=['start_pin', 'end_pin'])


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0002_lifecycle_gps'),
    ]

    operations = [
        migrations.AddField(model_name='booking', name='start_pin',
                            field=models.CharField(blank=True, max_length=4)),
        migrations.AddField(model_name='booking', name='end_pin',
                            field=models.CharField(blank=True, max_length=4)),
        migrations.AddField(model_name='booking', name='pin_attempts',
                            field=models.PositiveSmallIntegerField(default=0)),
        migrations.RunPython(backfill_pins, migrations.RunPython.noop),
    ]
