from django.db import migrations

# Uklon ilovasi https://uklon.com.ua/calculate_cost havolasini o'zi ochadi
# (Android App Link, domen ilovaga tasdiqlangan) va manzilni marshrutga qo'yadi.
# Pickup — foydalanuvchining joriy joylashuvi (ilova boshqa variantni qabul qilmaydi).
#
# Sxema ATAYLAB katta harfda: mobil ilova "http" bilan boshlangan shablonni
# tashlab yuboradi (openTaxiApp.ts), React Native esa ochishdan oldin sxemani
# normalizeScheme() bilan kichik harfga o'tkazadi.
UKLON_DEEPLINK = "HTTPS://uklon.com.ua/calculate_cost?latitude_to={end_lat}&longitude_to={end_lng}"


def set_uklon_deeplink(apps, schema_editor):
    TaxiService = apps.get_model("taxi", "TaxiService")
    TaxiService.objects.filter(code__startswith="uklon__", deeplink_template="").update(
        deeplink_template=UKLON_DEEPLINK)


def unset_uklon_deeplink(apps, schema_editor):
    TaxiService = apps.get_model("taxi", "TaxiService")
    TaxiService.objects.filter(code__startswith="uklon__", deeplink_template=UKLON_DEEPLINK).update(
        deeplink_template="")


class Migration(migrations.Migration):

    dependencies = [
        ("taxi", "0011_live_quote_provider_wb_deeplink"),
    ]

    operations = [
        migrations.RunPython(set_uklon_deeplink, unset_uklon_deeplink),
    ]
