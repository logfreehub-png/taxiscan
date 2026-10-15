from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("taxi", "0006_priceestimate_search_id"),
    ]

    operations = [
        migrations.AddField(
            model_name="priceestimate",
            name="searcher_key",
            field=models.CharField(
                blank=True, db_index=True, max_length=64, null=True,
                verbose_name="Qidiruvchi kaliti",
            ),
        ),
    ]
