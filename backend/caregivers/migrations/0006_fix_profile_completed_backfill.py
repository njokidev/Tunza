from django.db import migrations


def fix(apps, schema_editor):
    """0005 first marked caregivers as set up even if they had never uploaded documents.
    Undo that for anyone whose documents aren't in (or were rejected), so they go through
    documents -> verification -> profile like everyone else."""
    CaregiverProfile = apps.get_model('caregivers', 'CaregiverProfile')
    CaregiverProfile.objects.filter(profile_completed_at__isnull=False,
                                    verification_status__in=['not_submitted', 'rejected'],
                                    user__is_verified=False).update(profile_completed_at=None)


class Migration(migrations.Migration):

    dependencies = [
        ('caregivers', '0005_profile_completed_at'),
    ]

    operations = [
        migrations.RunPython(fix, migrations.RunPython.noop),
    ]
