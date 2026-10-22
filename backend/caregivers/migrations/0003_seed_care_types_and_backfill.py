"""
1. Seed the care types families choose from (they were never seeded, so the app
   fell back to a hard-coded list). Includes the new Babysitting and
   Medication Administration types.
2. Caregivers who were already verified keep their status (approved).
3. A caregiver's existing area becomes their first work area.
"""
from django.db import migrations

CARE_TYPES = [
    'Elderly Care', 'Dementia Care', 'Post-surgery Care', 'Disability Support', 'Palliative Care',
    'Chronic Illness Care', 'Personal Care', 'Companionship', 'Babysitting', 'Medication Administration',
]


def forwards(apps, schema_editor):
    Specialization = apps.get_model('caregivers', 'Specialization')
    CaregiverProfile = apps.get_model('caregivers', 'CaregiverProfile')

    existing = {s.lower() for s in Specialization.objects.values_list('name', flat=True)}
    for name in CARE_TYPES:
        if name.lower() not in existing:
            Specialization.objects.create(name=name)

    CaregiverProfile.objects.filter(user__is_verified=True).update(verification_status='approved')

    for p in CaregiverProfile.objects.exclude(location_name=''):
        if not p.work_areas and not p.location_name.startswith('Near ') and p.location_name != 'My location':
            p.work_areas = [p.location_name]
            p.save(update_fields=['work_areas'])


class Migration(migrations.Migration):
    dependencies = [
        ('caregivers', '0002_verification_work_areas'),
    ]

    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
