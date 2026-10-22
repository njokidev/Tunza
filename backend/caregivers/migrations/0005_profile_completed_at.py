from django.db import migrations, models


def backfill(apps, schema_editor):
    """Caregivers who already finished the old setup (they have availability) skip the new profile step."""
    CaregiverProfile = apps.get_model('caregivers', 'CaregiverProfile')
    for p in CaregiverProfile.objects.filter(availability__isnull=False).distinct():
        p.profile_completed_at = p.updated_at
        p.save(update_fields=['profile_completed_at'])


class Migration(migrations.Migration):

    dependencies = [
        ('caregivers', '0004_profile_extras_shift_pricing_payout'),
    ]

    operations = [
        migrations.AddField(
            model_name='caregiverprofile',
            name='profile_completed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.RunPython(backfill, migrations.RunPython.noop),
    ]
