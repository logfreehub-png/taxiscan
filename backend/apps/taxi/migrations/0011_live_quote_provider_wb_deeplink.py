from django.db import migrations, models

WB_DEEPLINK = "wb-taxi://ride?from={start_lat},{start_lng}&to={end_lat},{end_lng}"


def set_wb_deeplink(apps, schema_editor):
    # Mobil ilova avval shu shablonni ochadi. Bo'sh bo'lsa, u o'zidagi
    # wbtaxi:// sxemalariga tushib qoladi — WB ilovasi ularni ochmaydi.
    TaxiService = apps.get_model("taxi", "TaxiService")
    TaxiService.objects.filter(code__startswith="wb_taxi__", deeplink_template="").update(
        deeplink_template=WB_DEEPLINK)


def unset_wb_deeplink(apps, schema_editor):
    TaxiService = apps.get_model("taxi", "TaxiService")
    TaxiService.objects.filter(code__startswith="wb_taxi__", deeplink_template=WB_DEEPLINK).update(
        deeplink_template="")


class Migration(migrations.Migration):

    dependencies = [
        ("taxi", "0010_live_yandex_quote"),
    ]

    operations = [
        migrations.AddField(
            model_name="liveyandexquote",
            name="provider",
            field=models.CharField(
                db_index=True, default="yandex",
                help_text="yandex | wb — probe servisidagi provider nomi",
                max_length=16, verbose_name="Brend",
            ),
        ),
        migrations.AlterField(
            model_name="liveyandexquote",
            name="probed_at",
            field=models.DateTimeField(blank=True, db_index=True, null=True),
        ),
        migrations.RunPython(set_wb_deeplink, unset_wb_deeplink),
    ]
