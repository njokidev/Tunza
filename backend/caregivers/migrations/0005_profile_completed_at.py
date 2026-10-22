from django.db import migrations, models


def backfill(apps, schema_editor):
    """Caregivers who already finished the old setup (documents in, availability set) skip the new profile step."""
    CaregiverProfile = apps.get_model('caregivers', 'CaregiverProfile')
    done = CaregiverProfile.objects.filter(availability__isnull=False,
                                           verification_status__in=['pending', 'approved']).distinct()
    for p in done:
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
