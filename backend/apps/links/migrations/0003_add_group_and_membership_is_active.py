# Generated manually for group system

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("links", "0002_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="group",
            name="is_active",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="groupmembership",
            name="is_active",
            field=models.BooleanField(default=True),
        ),
    ]
