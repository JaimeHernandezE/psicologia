# Generated manually - convierte tablas analytics a hypertables TimescaleDB
# TimescaleDB exige que la columna de partición esté en la PK; se cambia a (columna_tiempo, id).

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("analytics", "0001_initial"),
    ]

    operations = [
        # DailyPatientMetric: PK y unique deben incluir date (requisito TimescaleDB)
        migrations.RunSQL("ALTER TABLE analytics_dailypatientmetric DROP CONSTRAINT IF EXISTS analytics_dailypatientmetric_unique_patient_date;", migrations.RunSQL.noop),
        migrations.RunSQL("ALTER TABLE analytics_dailypatientmetric DROP CONSTRAINT analytics_dailypatientmetric_pkey;", migrations.RunSQL.noop),
        migrations.RunSQL("ALTER TABLE analytics_dailypatientmetric ADD PRIMARY KEY (date, id);", migrations.RunSQL.noop),
        migrations.RunSQL("SELECT create_hypertable('analytics_dailypatientmetric', 'date', if_not_exists => TRUE);", migrations.RunSQL.noop),
        migrations.RunSQL("CREATE UNIQUE INDEX analytics_dailypatientmetric_unique_patient_date ON analytics_dailypatientmetric (date, patient_id);", migrations.RunSQL.noop),
        # FeelingTimeSeries: PK debe incluir recorded_at
        migrations.RunSQL("ALTER TABLE analytics_feelingtimeseries DROP CONSTRAINT analytics_feelingtimeseries_pkey;", migrations.RunSQL.noop),
        migrations.RunSQL("ALTER TABLE analytics_feelingtimeseries ADD PRIMARY KEY (recorded_at, id);", migrations.RunSQL.noop),
        migrations.RunSQL("SELECT create_hypertable('analytics_feelingtimeseries', 'recorded_at', if_not_exists => TRUE);", migrations.RunSQL.noop),
        # ResearchMetric: PK debe incluir period_start
        migrations.RunSQL("ALTER TABLE analytics_researchmetric DROP CONSTRAINT analytics_researchmetric_pkey;", migrations.RunSQL.noop),
        migrations.RunSQL("ALTER TABLE analytics_researchmetric DROP CONSTRAINT IF EXISTS analytics_researchmetric_unique_period_therapist_patient;", migrations.RunSQL.noop),
        migrations.RunSQL("ALTER TABLE analytics_researchmetric ADD PRIMARY KEY (period_start, id);", migrations.RunSQL.noop),
        migrations.RunSQL("SELECT create_hypertable('analytics_researchmetric', 'period_start', if_not_exists => TRUE);", migrations.RunSQL.noop),
        migrations.RunSQL("CREATE UNIQUE INDEX analytics_researchmetric_unique_period_therapist_patient ON analytics_researchmetric (period_start, period_end, therapist_hash, patient_hash);", migrations.RunSQL.noop),
    ]
