-- ===========================================================================
--  "What we do", in Nepali
--
--  The chrome around this section was translated in the dictionaries, but the
--  six programmes and their eighteen points are rows, not code — so a Nepali
--  reader got a Nepali heading over an English list. No dictionary can reach
--  them, because the committee writes them.
--
--  WHY COLUMNS RATHER THAN A SECOND TABLE
--  A programme_translations table would be the textbook answer and the wrong
--  one here. There are two languages, both decided, and a programme without a
--  title in each is not a thing this site wants to represent. A side table buys
--  a third language nobody has asked for, at the cost of a join on the single
--  most-read query on the site and a class of bug where the translation row goes
--  missing. Two columns, one row, one read.
--
--  NULL MEANS "NOT TRANSLATED YET", AND FALLS BACK TO ENGLISH
--  Deliberately nullable, and the app treats null as "show the English". That is
--  what makes this safe to ship: the committee can add a seventh programme in
--  English this afternoon without the Nepali site showing a blank card, and
--  translate it whenever they get to it. An empty string is NOT the same thing
--  and is not used — '' would mean "deliberately blank", which no programme is.
--
--  THE TRANSLATIONS BELOW ARE A FIRST PASS and the committee should read them.
--  They are written for a Nepali speaker living in Oita, so Japanese
--  institutions keep the names people actually use locally (वडा कार्यालय for the
--  ward office) rather than being rendered into unfamiliar formal Nepali.
-- ===========================================================================

alter table public.programmes
  add column if not exists title_ne text,
  add column if not exists body_ne  text;

alter table public.programme_points
  add column if not exists text_ne text;

-- --------------------------------------------------------------- programmes
-- Keyed on slug, not id: the ids are generated per environment, so an id here
-- would make this migration apply cleanly and do nothing on a fresh database.
update public.programmes set
  title_ne = 'सांस्कृतिक चाडपर्व',
  body_ne  = 'दशैं, तिहार, होली र नेपाली नयाँ वर्ष — राम्ररी मनाइन्छ, र सधैं ओइताको बृहत् समुदायका लागि खुला।'
where slug = 'cultural-festivals';

update public.programmes set
  title_ne = 'व्यावहारिक सहयोग',
  body_ne  = 'नदेखिने तर जरुरी काम: फारम, फोन सम्पर्क, अनुवाद, र कुन कार्यालयमा जाने भन्ने जानकारी।'
where slug = 'practical-support';

update public.programmes set
  title_ne = 'जवाफ दिने सञ्जाल',
  body_ne  = 'प्रदेशभर पाँच सय मानिस, र केही बिग्रिँदा बिहान २ बजे पनि जागा रहने समूह च्याट।'
where slug = 'a-network-that-answers';

update public.programmes set
  title_ne = 'भाषा र सम्पदा',
  body_ne  = 'जापानमा हुर्कँदै गरेका बालबालिकालाई नेपाली, र कामका लागि जापानी चाहिने वयस्कलाई सहयोग।'
where slug = 'language-and-heritage';

update public.programmes set
  title_ne = 'खेलकुद र सप्ताहान्त',
  body_ne  = 'न्यानो महिनाभर फुटबल र भलिबल — कसैलाई नचिनेको भए पनि समुदायमा घुलमिल हुने सबैभन्दा सजिलो बाटो।'
where slug = 'sport-and-weekends';

update public.programmes set
  title_ne = 'ओइतामा आइपुग्दा',
  body_ne  = 'पहिलो महिना सबैभन्दा गाह्रो हुन्छ। यो बाटो पहिले नै हिँडिसकेको कोहीले तपाईंलाई डोर्‍याउनेछ।'
where slug = 'landing-in-oita';

-- --------------------------------------------------------------- the points
-- Matched on the English text. These are short, fixed phrases and there are
-- eighteen of them; anything the committee has since reworded simply stays
-- English, which is the designed fallback rather than a failure.
update public.programme_points set text_ne = v.ne
from (values
  ('Traditional food and live music',          'परम्परागत खाना र प्रत्यक्ष सङ्गीत'),
  ('Visa and residency paperwork',             'भिसा र बसोबासका कागजात'),
  ('Facebook groups for your area',            'तपाईंको क्षेत्रका फेसबुक समूह'),
  ('Nepali reading and writing for children',  'बालबालिकालाई नेपाली पढाइ र लेखाइ'),
  ('Open teams, no trials, all levels',        'खुला टोली, छनोट छैन, सबै स्तर'),
  ('Meeting new arrivals at the station',      'नयाँ आउनेहरूलाई स्टेशनमा भेट्ने'),
  ('Ward office, bank and phone set-up',       'वडा कार्यालय, बैंक र फोन मिलाउने'),
  ('Dance and cultural performances',          'नृत्य र सांस्कृतिक प्रस्तुति'),
  ('Conversation practice before interviews',  'अन्तर्वार्ता अघि कुराकानीको अभ्यास'),
  ('Matches in Oita City and Beppu',           'ओइता सहर र बेप्पुमा खेल'),
  ('Job placement and interviews',             'रोजगारी र अन्तर्वार्ता'),
  ('Monthly newsletter',                       'मासिक न्यूजलेटर'),
  ('Housing and guarantor guidance',           'आवास र जमानीबारे सल्लाह'),
  ('Emergency support chain',                  'आपत्कालीन सहयोग शृंखला'),
  ('Where to buy Nepali groceries',            'नेपाली किराना कहाँ किन्ने'),
  ('Help reading official letters',            'सरकारी पत्र पढ्न सहयोग'),
  ('Family-friendly, all welcome',             'परिवारमैत्री, सबैलाई स्वागत'),
  ('Families welcome to come and watch',       'परिवारहरू हेर्न आउन स्वागत छ')
) as v(en, ne)
where public.programme_points.text = v.en;
