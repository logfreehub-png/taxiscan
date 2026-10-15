// Toshkent shahridagi joylarning TO'LIQ ro'yxati — manzil qidiruvi uchun.
// Metro bekatlari, tumanlar, massivlar, bozorlar, savdo markazlari, universitetlar,
// shifoxonalar, bog'lar, teatr/muzeylar, mehmonxonalar va Toshkent atrofi kiritilgan.
// Koordinatalar taxminiy markaz; aniq nuqtani "Xarita" tugmasi orqali to'g'rilash mumkin.
// Ro'yxatda topilmagan manzillarni onlayn geocoder (Nominatim/Yandex) qidiradi.

import { GENERATED_PLACES } from "./tashkentPlaces.generated";

export interface Place {
  label: string;
  lat: number;
  lng: number;
  category: PlaceCategory;
  // Qidiruvda yordam beradigan qo'shimcha nomlar (sinonim, ruscha, qisqartma)
  alias?: string[];
}

export type PlaceCategory =
  | "Mashhur joylar"
  | "Metro bekatlari"
  | "Tumanlar va massivlar"
  | "Mahalla va kvartallar"
  | "Ko'chalar"
  | "Savdo markazlari"
  | "Bozorlar"
  | "Universitetlar"
  | "Bog'lar va dam olish"
  | "Vokzal va transport"
  | "Stadion va arena"
  | "Mehmonxonalar"
  | "Tibbiyot"
  | "Madaniyat va muzeylar"
  | "Masjid va ziyoratgohlar"
  | "Toshkent atrofi";

export const TASHKENT_PLACES: Place[] = [
  // ——— Mashhur joylar / diqqatga sazovor ———
  { label: "IT Park Tashkent", lat: 41.30276, lng: 69.31478, category: "Mashhur joylar", alias: ["ayti park", "айти парк", "it park"] },
  { label: "Amir Temur xiyoboni (Skver)", lat: 41.3111, lng: 69.2797, category: "Mashhur joylar", alias: ["skver", "сквер", "amir temur"] },
  { label: "Mustaqillik maydoni", lat: 41.3045, lng: 69.2690, category: "Mashhur joylar", alias: ["mustakillik", "независимости", "independence"] },
  { label: "Hazrati Imom majmuasi (Xastimom)", lat: 41.3390, lng: 69.2378, category: "Masjid va ziyoratgohlar", alias: ["xastimom", "hastimom", "хазрати имам"] },
  { label: "Minor masjidi", lat: 41.3573, lng: 69.2890, category: "Masjid va ziyoratgohlar", alias: ["minor", "минор"] },
  { label: "Ko'kaldosh madrasasi", lat: 41.3260, lng: 69.2370, category: "Masjid va ziyoratgohlar", alias: ["kukeldash", "кукельдаш"] },
  { label: "Suzuk Ota majmuasi", lat: 41.3000, lng: 69.2230, category: "Masjid va ziyoratgohlar", alias: ["suzuk ota", "сузук ота"] },
  { label: "Shayx Zayniddin bobo maqbarasi", lat: 41.3320, lng: 69.2160, category: "Masjid va ziyoratgohlar", alias: ["zayniddin", "зайниддин"] },
  { label: "Toshkent teleminorasi", lat: 41.3514, lng: 69.2867, category: "Mashhur joylar", alias: ["tv tower", "telebashnya", "телебашня", "tele minora"] },
  { label: "Beshqozon (Plov Center)", lat: 41.3531, lng: 69.2860, category: "Mashhur joylar", alias: ["plov center", "osh markazi", "плов центр"] },
  { label: "Mehrjon (Broadway / Sayilgoh)", lat: 41.3119, lng: 69.2760, category: "Mashhur joylar", alias: ["broadway", "brodvey", "бродвей", "sayilgoh"] },
  { label: "Xotira maydoni", lat: 41.3070, lng: 69.2670, category: "Mashhur joylar", alias: ["xotira", "память"] },
  { label: "Jasorat monumenti", lat: 41.3160, lng: 69.2860, category: "Mashhur joylar", alias: ["мужество", "monument"] },
  { label: "Toshkent shahar hokimiyati", lat: 41.3110, lng: 69.2750, category: "Mashhur joylar", alias: ["hokimiyat", "хокимият", "мэрия"] },
  { label: "Oliy Majlis (Parlament)", lat: 41.3010, lng: 69.2540, category: "Mashhur joylar", alias: ["parlament", "парламент", "senat"] },
  { label: "Eski shahar", lat: 41.3280, lng: 69.2330, category: "Mashhur joylar", alias: ["old city", "старый город"] },

  // ——— Metro bekatlari — Chilonzor liniyasi (koordinatalar OSM'dan aniq) ———
  { label: "Olmazor metro bekati", lat: 41.25667, lng: 69.19610, category: "Metro bekatlari", alias: ["алмазар", "sobir rahimov", "собир рахимов"] },
  { label: "Chilonzor metro bekati", lat: 41.27436, lng: 69.20497, category: "Metro bekatlari", alias: ["чиланзар"] },
  { label: "Mirzo Ulug'bek metro bekati", lat: 41.28203, lng: 69.21258, category: "Metro bekatlari", alias: ["мирзо улугбек"] },
  { label: "Novza metro bekati", lat: 41.29187, lng: 69.22362, category: "Metro bekatlari", alias: ["новза", "hamza", "хамза"] },
  { label: "Milliy bog' metro bekati", lat: 41.30339, lng: 69.23567, category: "Metro bekatlari", alias: ["миллий бог", "national park", "komsomolskaya"] },
  { label: "Xalqlar do'stligi (Bunyodkor) metro bekati", lat: 41.31190, lng: 69.24310, category: "Metro bekatlari", alias: ["бунёдкор", "bunyodkor", "xalqlar dostligi", "дружба народов"] },
  { label: "Paxtakor metro bekati", lat: 41.31779, lng: 69.25509, category: "Metro bekatlari", alias: ["пахтакор"] },
  { label: "Mustaqillik maydoni metro bekati", lat: 41.31495, lng: 69.27106, category: "Metro bekatlari", alias: ["мустакиллик"] },
  { label: "Amir Temur xiyoboni metro bekati", lat: 41.31267, lng: 69.28327, category: "Metro bekatlari", alias: ["skver metro", "сквер"] },
  { label: "Hamid Olimjon metro bekati", lat: 41.31816, lng: 69.29574, category: "Metro bekatlari", alias: ["хамид алимджан"] },
  { label: "Pushkin metro bekati", lat: 41.32195, lng: 69.31110, category: "Metro bekatlari", alias: ["пушкинская"] },
  { label: "Buyuk Ipak Yo'li metro bekati", lat: 41.32611, lng: 69.32856, category: "Metro bekatlari", alias: ["maksim gorkiy", "максим горький", "ipak yoli"] },

  // ——— Metro bekatlari — O'zbekiston liniyasi ———
  { label: "Beruniy metro bekati", lat: 41.34462, lng: 69.20620, category: "Metro bekatlari", alias: ["беруний"] },
  { label: "Tinchlik metro bekati", lat: 41.33230, lng: 69.21912, category: "Metro bekatlari", alias: ["тинчлик"] },
  { label: "Chorsu metro bekati", lat: 41.32586, lng: 69.23682, category: "Metro bekatlari", alias: ["чорсу"] },
  { label: "G'afur G'ulom metro bekati", lat: 41.32788, lng: 69.24583, category: "Metro bekatlari", alias: ["гафур гулям"] },
  { label: "Alisher Navoiy metro bekati", lat: 41.31892, lng: 69.25430, category: "Metro bekatlari", alias: ["алишер навои"] },
  { label: "O'zbekiston metro bekati", lat: 41.31194, lng: 69.25341, category: "Metro bekatlari", alias: ["узбекистан"] },
  { label: "Kosmonavtlar metro bekati", lat: 41.30516, lng: 69.26472, category: "Metro bekatlari", alias: ["космонавтов", "kosmonavtov"] },
  { label: "Oybek metro bekati", lat: 41.29801, lng: 69.27405, category: "Metro bekatlari", alias: ["айбек"] },
  { label: "Toshkent metro bekati", lat: 41.29329, lng: 69.28772, category: "Metro bekatlari", alias: ["ташкент"] },
  { label: "Mashinasozlar metro bekati", lat: 41.29898, lng: 69.30513, category: "Metro bekatlari", alias: ["машиносозлар", "tashselmash"] },
  { label: "Do'stlik metro bekati", lat: 41.29364, lng: 69.32224, category: "Metro bekatlari", alias: ["дустлик", "chkalovskaya", "чкаловская"] },

  // ——— Metro bekatlari — Yunusobod liniyasi ———
  { label: "Turkiston metro bekati", lat: 41.37752, lng: 69.29602, category: "Metro bekatlari", alias: ["туркестан"] },
  { label: "Yunusobod metro bekati", lat: 41.36684, lng: 69.29230, category: "Metro bekatlari", alias: ["юнусабад"] },
  { label: "Shahriston metro bekati", lat: 41.35312, lng: 69.28811, category: "Metro bekatlari", alias: ["шахристан"] },
  { label: "Bodomzor metro bekati", lat: 41.33717, lng: 69.28457, category: "Metro bekatlari", alias: ["бадамзар"] },
  { label: "Minor metro bekati", lat: 41.32689, lng: 69.28342, category: "Metro bekatlari", alias: ["минор"] },
  { label: "Abdulla Qodiriy metro bekati", lat: 41.32019, lng: 69.28176, category: "Metro bekatlari", alias: ["кадыри"] },
  { label: "Yunus Rajabiy metro bekati", lat: 41.31389, lng: 69.28351, category: "Metro bekatlari", alias: ["юнус раджаби"] },
  { label: "Ming O'rik metro bekati", lat: 41.29966, lng: 69.27441, category: "Metro bekatlari", alias: ["минг урик", "ming urik"] },

  // ——— Metro bekatlari — Sergeli yo'nalishi ———
  { label: "Choshtepa metro bekati", lat: 41.23825, lng: 69.19603, category: "Metro bekatlari", alias: ["чаштепа"] },
  { label: "O'zgarish metro bekati", lat: 41.22734, lng: 69.20397, category: "Metro bekatlari", alias: ["узгариш"] },
  { label: "Sergeli metro bekati", lat: 41.22064, lng: 69.20884, category: "Metro bekatlari", alias: ["сергели"] },
  { label: "Yangihayot metro bekati", lat: 41.21351, lng: 69.21402, category: "Metro bekatlari", alias: ["янгихаёт"] },
  { label: "Chinor metro bekati", lat: 41.20670, lng: 69.21896, category: "Metro bekatlari", alias: ["чинар"] },

  // ——— Metro bekatlari — Halqa (yer usti) liniyasi ———
  { label: "Texnopark metro bekati", lat: 41.29463, lng: 69.32319, category: "Metro bekatlari", alias: ["технопарк"] },
  { label: "Yashnobod metro bekati", lat: 41.29759, lng: 69.34978, category: "Metro bekatlari", alias: ["яшнабад"] },
  { label: "Tuzel metro bekati", lat: 41.29201, lng: 69.35618, category: "Metro bekatlari", alias: ["тузель"] },
  { label: "Olmos metro bekati", lat: 41.28171, lng: 69.36033, category: "Metro bekatlari", alias: ["олмас", "olmas"] },
  { label: "Rohat metro bekati", lat: 41.26529, lng: 69.36475, category: "Metro bekatlari", alias: ["рохат"] },
  { label: "Yangiobod metro bekati", lat: 41.25651, lng: 69.35872, category: "Metro bekatlari", alias: ["янгиабад"] },
  { label: "Qo'yliq metro bekati", lat: 41.23746, lng: 69.32700, category: "Metro bekatlari", alias: ["куйлюк"] },
  { label: "Matonat metro bekati", lat: 41.24447, lng: 69.30832, category: "Metro bekatlari", alias: ["матонат"] },
  { label: "Qiyot metro bekati", lat: 41.24448, lng: 69.29973, category: "Metro bekatlari", alias: ["кият"] },
  { label: "Tolariq metro bekati", lat: 41.24451, lng: 69.28496, category: "Metro bekatlari", alias: ["толарик"] },
  { label: "Xonobod metro bekati", lat: 41.23001, lng: 69.27044, category: "Metro bekatlari", alias: ["ханабад"] },
  { label: "Quruvchilar metro bekati", lat: 41.22164, lng: 69.26050, category: "Metro bekatlari", alias: ["курувчилар", "stroiteley"] },
  { label: "Turon metro bekati", lat: 41.21068, lng: 69.23415, category: "Metro bekatlari", alias: ["турон"] },
  { label: "Qipchoq metro bekati", lat: 41.20542, lng: 69.22141, category: "Metro bekatlari", alias: ["кипчак"] },

  // ——— Tumanlar ———
  { label: "Chilonzor tumani", lat: 41.2750, lng: 69.2030, category: "Tumanlar va massivlar", alias: ["чиланзар"] },
  { label: "Yunusobod tumani", lat: 41.3640, lng: 69.2890, category: "Tumanlar va massivlar", alias: ["юнусабад"] },
  { label: "Mirzo Ulug'bek tumani", lat: 41.3270, lng: 69.3370, category: "Tumanlar va massivlar", alias: ["мирзо улугбек"] },
  { label: "Mirobod tumani", lat: 41.2820, lng: 69.2780, category: "Tumanlar va massivlar", alias: ["мирабад"] },
  { label: "Yakkasaroy tumani", lat: 41.2940, lng: 69.2530, category: "Tumanlar va massivlar", alias: ["яккасарай"] },
  { label: "Shayxontohur tumani", lat: 41.3300, lng: 69.2240, category: "Tumanlar va massivlar", alias: ["шайхантахур", "shayxontoxur"] },
  { label: "Olmazor tumani", lat: 41.3470, lng: 69.2280, category: "Tumanlar va massivlar", alias: ["алмазар"] },
  { label: "Uchtepa tumani", lat: 41.2960, lng: 69.1700, category: "Tumanlar va massivlar", alias: ["учтепа"] },
  { label: "Yashnobod tumani", lat: 41.2900, lng: 69.3240, category: "Tumanlar va massivlar", alias: ["яшнабад"] },
  { label: "Sergeli tumani", lat: 41.2230, lng: 69.2230, category: "Tumanlar va massivlar", alias: ["сергели"] },
  { label: "Bektemir tumani", lat: 41.2090, lng: 69.3340, category: "Tumanlar va massivlar", alias: ["бектемир"] },
  { label: "Yangihayot tumani", lat: 41.1950, lng: 69.2200, category: "Tumanlar va massivlar", alias: ["янгихаёт"] },

  // ——— Massivlar va dahalar ———
  { label: "Qoraqamish massivi", lat: 41.3620, lng: 69.2090, category: "Tumanlar va massivlar", alias: ["каракамыш", "qora qamish"] },
  { label: "Qorasuv massivi", lat: 41.3270, lng: 69.3200, category: "Tumanlar va massivlar", alias: ["карасу"] },
  { label: "TTZ massivi", lat: 41.3290, lng: 69.3640, category: "Tumanlar va massivlar", alias: ["ттз"] },
  { label: "Yalang'och massivi", lat: 41.3380, lng: 69.3440, category: "Tumanlar va massivlar", alias: ["ялангач"] },
  { label: "Sputnik massivi", lat: 41.28143, lng: 69.20032, category: "Tumanlar va massivlar", alias: ["спутник"] },
  { label: "Ko'kcha dahasi", lat: 41.3330, lng: 69.2180, category: "Tumanlar va massivlar", alias: ["кукча"] },
  { label: "Chig'atoy", lat: 41.3450, lng: 69.2300, category: "Tumanlar va massivlar", alias: ["чигатай"] },
  { label: "Beshyog'och", lat: 41.3050, lng: 69.2540, category: "Tumanlar va massivlar", alias: ["бешагач", "beshagach"] },
  { label: "Aviasozlar massivi", lat: 41.2930, lng: 69.3360, category: "Tumanlar va massivlar", alias: ["авиасозлар"] },
  { label: "Domrabod", lat: 41.3460, lng: 69.3050, category: "Tumanlar va massivlar", alias: ["дамарик", "домрабад"] },

  // ——— Savdo markazlari ———
  { label: "Markaziy universal magazin (TSUM)", lat: 41.3111, lng: 69.2820, category: "Savdo markazlari", alias: ["tsum", "цум", "sum"] },
  { label: "Samarqand Darvoza Mall", lat: 41.3197, lng: 69.2335, category: "Savdo markazlari", alias: ["samarkand darvoza", "самарканд дарваза"] },
  { label: "Compass Mall", lat: 41.3580, lng: 69.2890, category: "Savdo markazlari", alias: ["kompas", "компас"] },
  { label: "Mega Planet", lat: 41.36714, lng: 69.29088, category: "Savdo markazlari", alias: ["mega planet", "мега планет", "makro mega planet"] },
  { label: "Next Mall (Yunusobod)", lat: 41.3670, lng: 69.2870, category: "Savdo markazlari", alias: ["next", "некст"] },
  { label: "Tashkent City Mall", lat: 41.3160, lng: 69.2740, category: "Savdo markazlari", alias: ["tashkent city mall"] },
  { label: "Riviera Mall", lat: 41.33987, lng: 69.25421, category: "Savdo markazlari", alias: ["riviera", "ривьера"] },
  { label: "Atlas Mall (Chilonzor)", lat: 41.2755, lng: 69.2040, category: "Savdo markazlari", alias: ["atlas", "атлас"] },
  { label: "Continent (Yunusobod)", lat: 41.3640, lng: 69.2885, category: "Savdo markazlari", alias: ["kontinent", "континент"] },
  { label: "Parus Mall", lat: 41.2905, lng: 69.1985, category: "Savdo markazlari", alias: ["парус"] },

  // ——— Bozorlar ———
  { label: "Chorsu bozori", lat: 41.3265, lng: 69.2350, category: "Bozorlar", alias: ["chorsu", "чорсу"] },
  { label: "Oloy bozori", lat: 41.3119, lng: 69.2876, category: "Bozorlar", alias: ["alay", "алайский", "oloy"] },
  { label: "Farhod bozori", lat: 41.2880, lng: 69.1850, category: "Bozorlar", alias: ["farxod", "фархад"] },
  { label: "Quyliq bozori", lat: 41.2670, lng: 69.3500, category: "Bozorlar", alias: ["kuyluk", "куйлюк", "quyluq"] },
  { label: "Mirobod (Gospital) bozori", lat: 41.2990, lng: 69.2870, category: "Bozorlar", alias: ["госпиталка", "gospital"] },
  { label: "Yangiobod bozori", lat: 41.2960, lng: 69.3200, category: "Bozorlar", alias: ["yangiabad", "янгиабад"] },
  { label: "Bektemir bozori", lat: 41.2255, lng: 69.3360, category: "Bozorlar", alias: ["bektemir"] },
  { label: "Abu Saxiy bozori", lat: 41.24682, lng: 69.16664, category: "Bozorlar", alias: ["абу сахий", "abu sahiy"] },
  { label: "Otchopar bozori", lat: 41.3590, lng: 69.2350, category: "Bozorlar", alias: ["отчопар"] },
  { label: "Chig'atoy bozori", lat: 41.3480, lng: 69.2290, category: "Bozorlar", alias: ["чигатай"] },
  { label: "Yunusobod dehqon bozori", lat: 41.3625, lng: 69.2950, category: "Bozorlar", alias: ["юнусабадский"] },
  { label: "Parkent bozori", lat: 41.3230, lng: 69.3060, category: "Bozorlar", alias: ["паркентский"] },
  { label: "Beshyog'och bozori", lat: 41.3030, lng: 69.2520, category: "Bozorlar", alias: ["бешагач"] },
  { label: "Urikzor mebel bozori", lat: 41.2580, lng: 69.1990, category: "Bozorlar", alias: ["урикзор", "orikzor"] },
  { label: "Sergeli bozori", lat: 41.2240, lng: 69.2240, category: "Bozorlar", alias: ["сергели"] },
  { label: "Ippodrom bozori", lat: 41.2360, lng: 69.1890, category: "Bozorlar", alias: ["ипподром"] },
  { label: "Malika elektronika bozori", lat: 41.2855, lng: 69.2470, category: "Bozorlar", alias: ["малика", "qushbegi"] },
  { label: "Index Bazaar", lat: 41.2350, lng: 69.3050, category: "Bozorlar", alias: ["индекс", "indeks"] },

  // ——— Universitetlar ———
  { label: "O'zbekiston Milliy universiteti (O'zMU)", lat: 41.3510, lng: 69.2070, category: "Universitetlar", alias: ["nuu", "milliy universitet", "guu", "вузгородок"] },
  { label: "TATU (al-Xorazmiy nomidagi)", lat: 41.3430, lng: 69.2855, category: "Universitetlar", alias: ["tuit", "туит", "tatu", "aloqa"] },
  { label: "Westminster universiteti (WIUT)", lat: 41.30661, lng: 69.28182, category: "Universitetlar", alias: ["westminster", "вестминстер", "wiut"] },
  { label: "INHA University", lat: 41.33824, lng: 69.33462, category: "Universitetlar", alias: ["inha", "инха"] },
  { label: "Turin Polytechnic", lat: 41.35202, lng: 69.22210, category: "Universitetlar", alias: ["turin", "турин", "ttpu"] },
  { label: "Toshkent texnika universiteti (TDTU)", lat: 41.35325, lng: 69.20516, category: "Universitetlar", alias: ["tashpi", "ташпи", "politex", "tdtu"] },
  { label: "Webster University", lat: 41.32005, lng: 69.26160, category: "Universitetlar", alias: ["webster", "вебстер"] },
  { label: "Toshkent tibbiyot akademiyasi (TTA)", lat: 41.3100, lng: 69.2860, category: "Universitetlar", alias: ["tma", "тма", "tibbiyot akademiyasi"] },
  { label: "Toshkent davlat iqtisodiyot universiteti (TDIU)", lat: 41.30892, lng: 69.24915, category: "Universitetlar", alias: ["tsue", "narxoz", "нархоз"] },
  { label: "Toshkent davlat yuridik universiteti (TDYU)", lat: 41.3110, lng: 69.2820, category: "Universitetlar", alias: ["yuridik", "юридический", "tsul"] },
  { label: "Nizomiy pedagogika universiteti", lat: 41.27217, lng: 69.20570, category: "Universitetlar", alias: ["nizomiy", "низами", "tdpu", "pedagogika"] },
  { label: "TIQXMMI (Irrigatsiya instituti)", lat: 41.3420, lng: 69.2900, category: "Universitetlar", alias: ["irrigatsiya", "ирригационный", "tiiame"] },
  { label: "Toshkent moliya instituti", lat: 41.3280, lng: 69.2800, category: "Universitetlar", alias: ["moliya", "финансовый", "tfi"] },
  { label: "Toshkent kimyo-texnologiya instituti", lat: 41.3220, lng: 69.2400, category: "Universitetlar", alias: ["kimyo", "хими", "tkti"] },
  { label: "AKFA University", lat: 41.3500, lng: 69.2260, category: "Universitetlar", alias: ["akfa", "акфа"] },
  { label: "New Uzbekistan University", lat: 41.3140, lng: 69.2880, category: "Universitetlar", alias: ["newuu", "янги узбекистон"] },
  { label: "Jahon tillari universiteti (UzSWLU)", lat: 41.30791, lng: 69.19354, category: "Universitetlar", alias: ["inyaz", "иняз", "jahon tillari"] },

  // ——— Bog'lar va dam olish ———
  { label: "Toshkent City bog'i", lat: 41.3169, lng: 69.2720, category: "Bog'lar va dam olish", alias: ["tashkent city", "ташкент сити"] },
  { label: "Magic City", lat: 41.30356, lng: 69.24502, category: "Bog'lar va dam olish", alias: ["medjik siti", "меджик сити", "magik"] },
  { label: "Yaponiya bog'i", lat: 41.3310, lng: 69.2925, category: "Bog'lar va dam olish", alias: ["japanese garden", "японский сад"] },
  { label: "Ekopark", lat: 41.3300, lng: 69.2930, category: "Bog'lar va dam olish", alias: ["ekopark", "экопарк", "eco park"] },
  { label: "Botanika bog'i", lat: 41.34913, lng: 69.31825, category: "Bog'lar va dam olish", alias: ["botanichesky", "ботанический"] },
  { label: "Toshkent hayvonot bog'i (Zoopark)", lat: 41.34421, lng: 69.30940, category: "Bog'lar va dam olish", alias: ["zoopark", "зоопарк", "hayvonot"] },
  { label: "Anhor bog'i", lat: 41.3140, lng: 69.2585, category: "Bog'lar va dam olish", alias: ["anhor", "анхор"] },
  { label: "Milliy bog' (Alisher Navoiy)", lat: 41.3000, lng: 69.2620, category: "Bog'lar va dam olish", alias: ["gorkiy", "национальный парк", "milliy bog"] },
  { label: "G'afur G'ulom bog'i", lat: 41.3320, lng: 69.2210, category: "Bog'lar va dam olish", alias: ["гафур гулям"] },
  { label: "Ashxobod bog'i", lat: 41.3000, lng: 69.2840, category: "Bog'lar va dam olish", alias: ["ашхабад"] },
  { label: "Lokomotiv bog'i (Anhor)", lat: 41.32790, lng: 69.26747, category: "Bog'lar va dam olish", alias: ["локомотив", "anhor lokomotiv"] },
  { label: "Yangi O'zbekiston bog'i", lat: 41.2560, lng: 69.1990, category: "Bog'lar va dam olish", alias: ["янги узбекистон", "new uzbekistan park"] },
  { label: "Navruz etnoparki", lat: 41.3450, lng: 69.2790, category: "Bog'lar va dam olish", alias: ["навруз", "navruz park"] },
  { label: "Tashkentland (Akvapark)", lat: 41.34213, lng: 69.28387, category: "Bog'lar va dam olish", alias: ["akvapark", "аквапарк", "ташкентлэнд", "aquapark"] },

  // ——— Vokzal va transport ———
  { label: "Toshkent xalqaro aeroporti", lat: 41.2579, lng: 69.2812, category: "Vokzal va transport", alias: ["airport", "aeroport", "аэропорт", "tas"] },
  { label: "Toshkent (Shimoliy) temir yo'l vokzali", lat: 41.2965, lng: 69.2745, category: "Vokzal va transport", alias: ["vokzal", "вокзал", "severny", "train station"] },
  { label: "Janubiy vokzal", lat: 41.2730, lng: 69.2790, category: "Vokzal va transport", alias: ["yuzhny", "южный"] },
  { label: "Toshkent xalqaro avtovokzali", lat: 41.2725, lng: 69.2060, category: "Vokzal va transport", alias: ["avtovokzal", "автовокзал", "bus station"] },
  { label: "Olmazor avtovokzali", lat: 41.2660, lng: 69.2050, category: "Vokzal va transport", alias: ["sobir rahimov avtovokzal", "алмазар автовокзал"] },

  // ——— Stadion va arena ———
  { label: "Milliy stadion (Bunyodkor)", lat: 41.2860, lng: 69.2070, category: "Stadion va arena", alias: ["bunyodkor", "бунёдкор", "milliy stadion"] },
  { label: "Pakhtakor markaziy stadioni", lat: 41.3015, lng: 69.2650, category: "Stadion va arena", alias: ["paxtakor", "пахтакор"] },
  { label: "Humo Arena", lat: 41.34360, lng: 69.28680, category: "Stadion va arena", alias: ["humo", "хумо"] },
  { label: "Yoshlik sport majmuasi", lat: 41.3120, lng: 69.2530, category: "Stadion va arena", alias: ["ёшлик", "yoshlik"] },

  // ——— Mehmonxonalar ———
  { label: "Hilton Tashkent City", lat: 41.3186, lng: 69.2706, category: "Mehmonxonalar", alias: ["hilton", "хилтон"] },
  { label: "Hyatt Regency Tashkent", lat: 41.3088, lng: 69.2935, category: "Mehmonxonalar", alias: ["hyatt", "хаятт"] },
  { label: "Lotte City Hotel (Tashkent Palace)", lat: 41.3108, lng: 69.2746, category: "Mehmonxonalar", alias: ["lotte", "лотте"] },
  { label: "Hotel Uzbekistan", lat: 41.3120, lng: 69.2820, category: "Mehmonxonalar", alias: ["uzbekistan", "узбекистан", "hotel uzbekistan"] },
  { label: "International Hotel Tashkent", lat: 41.3380, lng: 69.2880, category: "Mehmonxonalar", alias: ["international", "интернешнл"] },
  { label: "Radisson Blu Tashkent", lat: 41.3260, lng: 69.2820, category: "Mehmonxonalar", alias: ["radisson", "радиссон"] },
  { label: "Wyndham Tashkent", lat: 41.3130, lng: 69.2850, category: "Mehmonxonalar", alias: ["wyndham", "виндхам"] },
  { label: "InterContinental Tashkent", lat: 41.3190, lng: 69.2750, category: "Mehmonxonalar", alias: ["intercontinental", "интерконтиненталь"] },
  { label: "Courtyard by Marriott Tashkent", lat: 41.3160, lng: 69.2730, category: "Mehmonxonalar", alias: ["marriott", "марриотт"] },
  { label: "Hampton by Hilton Tashkent", lat: 41.3140, lng: 69.2480, category: "Mehmonxonalar", alias: ["hampton", "хэмптон"] },

  // ——— Tibbiyot ———
  { label: "Respublika shoshilinch tibbiyot markazi", lat: 41.3470, lng: 69.2890, category: "Tibbiyot", alias: ["rsnpmsmp", "скорая", "shoshilinch"] },
  { label: "Toshkent shahar klinik shifoxonasi", lat: 41.3000, lng: 69.2860, category: "Tibbiyot", alias: ["shahar shifoxonasi", "klinika"] },
  { label: "Respublika kardiologiya markazi", lat: 41.32503, lng: 69.29926, category: "Tibbiyot", alias: ["kardiologiya", "кардиология"] },
  { label: "Respublika onkologiya markazi", lat: 41.34556, lng: 69.20198, category: "Tibbiyot", alias: ["onkologiya", "онкология"] },
  { label: "Akfa Medline klinikasi", lat: 41.3500, lng: 69.2250, category: "Tibbiyot", alias: ["akfa medline", "медлайн"] },
  { label: "Milliy bolalar tibbiyot markazi", lat: 41.3230, lng: 69.3120, category: "Tibbiyot", alias: ["bolalar markazi", "детский центр"] },
  { label: "Respublika travmatologiya instituti", lat: 41.3440, lng: 69.2860, category: "Tibbiyot", alias: ["travmatologiya", "травматология"] },

  // ——— Madaniyat va muzeylar ———
  { label: "Alisher Navoiy opera va balet teatri", lat: 41.3105, lng: 69.2730, category: "Madaniyat va muzeylar", alias: ["navoi teatri", "большой театр", "opera"] },
  { label: "Toshkent sirki", lat: 41.3200, lng: 69.2440, category: "Madaniyat va muzeylar", alias: ["sirk", "цирк"] },
  { label: "Istiqlol san'at saroyi", lat: 41.3030, lng: 69.2420, category: "Madaniyat va muzeylar", alias: ["istiqlol", "дружбы народов", "xalqlar dostligi saroyi"] },
  { label: "Turkiston saroyi", lat: 41.3170, lng: 69.2870, category: "Madaniyat va muzeylar", alias: ["туркестан"] },
  { label: "O'zexpomarkaz", lat: 41.34382, lng: 69.28240, category: "Madaniyat va muzeylar", alias: ["uzexpo", "узэкспоцентр", "expo"] },
  { label: "O'zbekiston tarixi davlat muzeyi", lat: 41.3110, lng: 69.2790, category: "Madaniyat va muzeylar", alias: ["tarix muzeyi", "исторический музей"] },
  { label: "Amaliy san'at muzeyi", lat: 41.2990, lng: 69.2640, category: "Madaniyat va muzeylar", alias: ["прикладного искусства"] },
  { label: "Temuriylar tarixi muzeyi", lat: 41.3130, lng: 69.2810, category: "Madaniyat va muzeylar", alias: ["temuriylar", "музей темуридов"] },

  // ——— Toshkent atrofi (viloyat yo'nalishlari) ———
  { label: "Chirchiq shahri", lat: 41.4690, lng: 69.5820, category: "Toshkent atrofi", alias: ["чирчик"] },
  { label: "G'azalkent", lat: 41.5580, lng: 69.7700, category: "Toshkent atrofi", alias: ["газалкент"] },
  { label: "Xo'jakent", lat: 41.6300, lng: 69.9440, category: "Toshkent atrofi", alias: ["ходжикент", "hodjikent"] },
  { label: "Chorvoq suv ombori", lat: 41.6250, lng: 69.9600, category: "Toshkent atrofi", alias: ["charvak", "чарвак"] },
  { label: "Chimyon (Chimgan)", lat: 41.5550, lng: 70.0100, category: "Toshkent atrofi", alias: ["chimgan", "чимган"] },
  { label: "Amirsoy kurorti", lat: 41.4800, lng: 70.0300, category: "Toshkent atrofi", alias: ["amirsoy", "амирсай", "amirsoy resort"] },
  { label: "Beldersoy", lat: 41.5050, lng: 70.0050, category: "Toshkent atrofi", alias: ["бельдерсай"] },
  { label: "Zangiota majmuasi", lat: 41.2100, lng: 69.1300, category: "Toshkent atrofi", alias: ["zangiata", "зангиата"] },
  { label: "Yangiyo'l shahri", lat: 41.1120, lng: 69.0470, category: "Toshkent atrofi", alias: ["янгиюль"] },
  { label: "Nurafshon shahri", lat: 41.0440, lng: 69.3580, category: "Toshkent atrofi", alias: ["нурафшан", "toytepa"] },
  { label: "Parkent shahri", lat: 41.2940, lng: 69.6760, category: "Toshkent atrofi", alias: ["паркент"] },
  { label: "Angren shahri", lat: 41.0170, lng: 70.1430, category: "Toshkent atrofi", alias: ["ангрен"] },
  { label: "Olmaliq shahri", lat: 40.8440, lng: 69.5980, category: "Toshkent atrofi", alias: ["алмалык", "almalyk"] },
  { label: "Bekobod shahri", lat: 40.2210, lng: 69.2700, category: "Toshkent atrofi", alias: ["бекабад"] },
];

// Bo'sh qidiruvda ko'rsatiladigan eng mashhur joylar (tezkor tanlash uchun)
export const POPULAR_PLACE_LABELS = [
  "IT Park Tashkent",
  "Amir Temur xiyoboni (Skver)",
  "Chorsu bozori",
  "Toshkent xalqaro aeroporti",
  "Toshkent City bog'i",
  "Magic City",
  "Samarqand Darvoza Mall",
  "Mega Planet",
];

// ——— Qidiruv: kirill/lotin farqlamaydi, 3+ harfda xatoga chidamli (fuzzy) ———

const CYR_TO_LAT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "j", з: "z",
  и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "s", ч: "ch", ш: "sh", щ: "sh",
  ъ: "", ь: "", э: "e", ю: "yu", я: "ya", ў: "o", қ: "k", ғ: "g", ҳ: "h",
};

const normalize = (s: string) => {
  let out = "";
  for (const ch of s.toLowerCase()) out += CYR_TO_LAT[ch] ?? ch;
  return out
    .replace(/['`’ʻʼ.]/g, "")
    .replace(/[\-–—()\/,]/g, " ") // "Chilonzor-14" -> "chilonzor 14"
    .replace(/x/g, "h") // x/h farqi: "xo'ja" = "ho'ja"
    .replace(/q/g, "k") // q/k farqi: "quyliq" = "kuyluk"
    .replace(/\s+/g, " ")
    .trim();
};

/** Levenshtein masofasi (max dan oshsa erta to'xtaydi). */
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const dp = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    let rowMin = dp[0];
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
      if (dp[j] < rowMin) rowMin = dp[j];
    }
    if (rowMin > max) return max + 1;
  }
  return dp[b.length];
}

/** Bitta qidiruv so'zini joy tokenlariga solishtirib eng yaxshi ballni qaytaradi. */
function tokenScore(qw: string, tokens: string[], fuzzy: boolean): number {
  let best = 0;
  for (const t of tokens) {
    if (t === qw) return 100;
    if (t.startsWith(qw)) { best = Math.max(best, 90); continue; }
    if (qw.length >= 3 && t.includes(qw)) { best = Math.max(best, 70); continue; }
    // 3 harfdan keyin yaqin (xato yozilgan) so'zlar ham topiladi.
    // Birinchi harf mos bo'lishi shart — bu fuzzy qidiruvni ~20x tezlashtiradi.
    if (fuzzy && qw.length >= 3 && t.length >= 3 && t[0] === qw[0]) {
      const maxDist = qw.length <= 4 ? 1 : qw.length <= 7 ? 2 : 3;
      const d = Math.min(
        editDistance(qw, t, maxDist),
        editDistance(qw, t.slice(0, qw.length), maxDist) // token boshiga ham solishtiramiz
      );
      if (d <= maxDist) best = Math.max(best, 65 - d * 12);
    }
  }
  return best;
}

// OSM'dan kelgan ruscha/inglizcha ko'cha nomlarini bir xil "X ko'chasi" ko'rinishiga
// keltiramiz — onlayn qidiruv natijalari bilan format bitta bo'lishi uchun.
function uzStreetLabel(label: string): string {
  const m = label.match(/^(.*?)(\s*\([^)]*\))?$/);
  const name = (m?.[1] || label).trim();
  const suffix = m?.[2] || "";
  if (/ko[''ʻ’`]?cha|prospekt|xiyobon|maydon/i.test(name)) return label;
  const stripped = name
    .replace(/^(улица|ул\.)\s+/i, "")
    .replace(/\s+(улица|ул\.)$/i, "")
    .replace(/\s+(street|st\.)$/i, "");
  if (stripped === name) return label; // "ko'cha" so'zi yo'q nomlarga tegmaymiz
  return `${stripped} ko'chasi${suffix}`;
}

// Qo'lda kiritilgan + OSM'dan yuklangan (mahalla/kvartal/ko'cha) joylar birlashtiriladi.
// Dublikat label bo'lsa qo'lda kiritilgani ustun turadi.
const seenLabels = new Set(TASHKENT_PLACES.map((p) => normalize(p.label)));
export const ALL_PLACES: Place[] = [
  ...TASHKENT_PLACES,
  ...GENERATED_PLACES.map((p) =>
    p.category === "Ko'chalar" ? { ...p, label: uzStreetLabel(p.label) } : p
  ).filter((p) => {
    const k = normalize(p.label);
    if (seenLabels.has(k)) return false;
    seenLabels.add(k);
    return true;
  }),
];

// Qidiruv indeksi — har keystroke'da qayta normalize qilmaslik uchun bir marta tuziladi
const INDEX = ALL_PLACES.map((p) => {
  const fullName = normalize(p.label);
  const tokens = Array.from(
    new Set([
      ...fullName.split(" "),
      ...(p.alias || []).flatMap((a) => normalize(a).split(" ")),
    ])
  );
  return { p, fullName, tokens };
});

/** Joy nomini (va sinonimlarini) bo'yicha qidirish — eng yaqinlari birinchi, 9 tagacha. */
export function searchPlaces(query: string, limit = 9): Place[] {
  const q = normalize(query);
  if (!q) {
    return POPULAR_PLACE_LABELS.map(
      (lbl) => TASHKENT_PLACES.find((p) => p.label === lbl)!
    ).filter(Boolean);
  }
  const words = q.split(" ");
  const collect = (fuzzy: boolean) => {
    const scored: { p: Place; score: number }[] = [];
    for (const { p, fullName, tokens } of INDEX) {
      let total = 0;
      let ok = true;
      for (const w of words) {
        const s = tokenScore(w, tokens, fuzzy);
        if (s === 0) { ok = false; break; }
        total += s;
      }
      if (!ok) continue;
      let score = total / words.length;
      if (fullName.startsWith(q)) score += 20;
      else if (fullName.includes(q)) score += 10;
      scored.push({ p, score });
    }
    return scored;
  };
  // Avval tez (aniq) qidiruv; natija kam bo'lsa fuzzy (xatoga chidamli) qidiruv qo'shiladi
  let scored = collect(false);
  if (scored.length < limit) scored = collect(true);
  scored.sort((a, b) => b.score - a.score || a.p.label.localeCompare(b.p.label));
  return scored.slice(0, limit).map((s) => s.p);
}
