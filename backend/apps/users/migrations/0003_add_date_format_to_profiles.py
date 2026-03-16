# Generated manually for date_format preference

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_patientprofile_research_consent_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='therapistprofile',
            name='date_format',
            field=models.CharField(
                choices=[
                    ('dd/mm/yyyy', 'dd/mm/aaaa'),
                    ('mm/dd/yyyy', 'mm/dd/aaaa'),
                    ('yyyy-mm-dd', 'aaaa-mm-dd'),
                ],
                default='dd/mm/yyyy',
                max_length=10,
            ),
        ),
        migrations.AddField(
            model_name='patientprofile',
            name='date_format',
            field=models.CharField(
                choices=[
                    ('dd/mm/yyyy', 'dd/mm/aaaa'),
                    ('mm/dd/yyyy', 'mm/dd/aaaa'),
                    ('yyyy-mm-dd', 'aaaa-mm-dd'),
                ],
                default='dd/mm/yyyy',
                max_length=10,
            ),
        ),
    ]
