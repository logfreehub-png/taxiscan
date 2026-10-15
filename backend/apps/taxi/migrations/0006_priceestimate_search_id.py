from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("taxi", "0005_taxiservice_coverage_area"),
    ]

    operations = [
        migrations.AddField(
            model_name="priceestimate",
            name="search_id",
            field=models.UUIDField(
                blank=True, db_index=True, null=True, verbose_name="Qidiruv ID"
            ),
        ),
    ]
