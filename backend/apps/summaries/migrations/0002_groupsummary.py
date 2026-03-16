# Generated manually for group summaries

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("summaries", "0001_initial"),
        ("links", "0003_add_group_and_membership_is_active"),
        ("users", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="GroupSummary",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("body_ai", models.TextField(help_text="Texto generado por Claude")),
                ("body_edited", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("created_by", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="created_group_summaries", to="users.therapistprofile")),
                ("group", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="group_summaries", to="links.group")),
            ],
            options={
                "verbose_name": "Resumen grupal",
                "verbose_name_plural": "Resúmenes grupales",
                "ordering": ["-created_at"],
            },
        ),
    ]
