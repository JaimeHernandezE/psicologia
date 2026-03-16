# Generated manually for group notes

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("journal", "0002_initial"),
        ("links", "0003_add_group_and_membership_is_active"),
    ]

    operations = [
        migrations.AddField(
            model_name="journalentry",
            name="group",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="journal_entries",
                to="links.group",
            ),
        ),
    ]
