/* ==========================================================
   50 Günde 1000 Kelime - script.js
   Bölümler:
   1. Ayarlar ve durum
   2. Kelime verisi (words.js ile birleştirildi)
   3. İlerleme (localStorage)
   4. Gün durumu hesaplama
   5. Harita çizimi (daireler + yollar)
   6. Seslendirme (Web Speech API + akıllı ses seçici)
   7. Modal görünümleri (Çalışma / Sınav / Sonuç)
   8. Kelime çalışma paneli (kart slider)
   9. Sınav (quiz) modülü
   10. Olaylar ve başlatma
   ========================================================== */
'use strict';

/* ---------- 1. Ayarlar ve durum ---------- */
const CONFIG = {
  totalDays: 50,
  wordsPerDay: 20,                       // 50 x 20 = 1000 kelime
  storageKey: 'kelime50:v1:completedDays',
  accentKey: 'kelime50:v1:accent',
  passPercent: 80,                       // sınavı geçmek için gereken doğru yüzdesi
  speech: { rate: 0.85, pitch: 1, volume: 1 }
};

// Test modu: adres sonuna ?test=1 eklenirse açılır. Canlıda kapalıdır.
const TEST_MODE = new URLSearchParams(window.location.search).has('test');

// Telaffuz aksanları
const ACCENTS = {
  us: { lang: 'en-US', label: 'ABD İngilizcesi' },
  uk: { lang: 'en-GB', label: 'İngiltere İngilizcesi' }
};

// Durum: ardışık tamamlanan gün sayısı (ör. 3 ise 1-2-3. günler yeşil, 4. gün aktif)
const state = {
  completedCount: 0
};

// Çalışma paneli durumu: hangi gün açık, kaçıncı kart gösteriliyor
const study = {
  day: null,
  index: 0,
  words: []
};

// Sınav durumu
const quiz = {
  questions: [],
  index: 0,
  correct: 0,
  answered: false,
  wrong: [],                             // yanlış yapılan kelimeler
  need: 0                                // geçmek için gereken doğru sayısı
};

// Sık kullanılan DOM elemanları
const els = {
  list: document.getElementById('roadmapList'),
  lines: document.getElementById('roadmapLines'),
  roadmap: document.getElementById('roadmap'),
  progressBar: document.getElementById('progressBar'),
  progressFill: document.getElementById('progressFill'),
  daysDone: document.getElementById('daysDone'),
  wordsDone: document.getElementById('wordsDone'),
  resetBtn: document.getElementById('resetBtn'),

  modal: document.getElementById('dayModal'),
  modalBadge: document.getElementById('modalBadge'),
  modalTitle: document.getElementById('modalTitle'),
  modalRange: document.getElementById('modalRange'),
  modalClose: document.getElementById('modalClose'),
  modalComplete: document.getElementById('modalComplete'),

  // Görünümler
  studyView: document.getElementById('studyView'),
  quizView: document.getElementById('quizView'),
  resultView: document.getElementById('resultView'),

  // Çalışma
  study: document.getElementById('study'),
  studyEmpty: document.getElementById('studyEmpty'),
  studyCounter: document.getElementById('studyCounter'),
  studyFill: document.getElementById('studyFill'),
  card: document.getElementById('card'),
  cardWord: document.getElementById('cardWord'),
  cardMeaning: document.getElementById('cardMeaning'),
  cardExample: document.getElementById('cardExample'),
  cardExampleTr: document.getElementById('cardExampleTr'),
  speakWord: document.getElementById('speakWord'),
  speakExample: document.getElementById('speakExample'),
  prevBtn: document.getElementById('prevBtn'),
  nextBtn: document.getElementById('nextBtn'),
  quizBtn: document.getElementById('quizBtn'),
  accentBtns: document.querySelectorAll('.accent__btn'),

  // Sınav
  quizCounter: document.getElementById('quizCounter'),
  quizFill: document.getElementById('quizFill'),
  quizScore: document.getElementById('quizScore'),
  quizDir: document.getElementById('quizDir'),
  quizPrompt: document.getElementById('quizPrompt'),
  speakQuiz: document.getElementById('speakQuiz'),
  quizOptions: document.getElementById('quizOptions'),
  quizFeedback: document.getElementById('quizFeedback'),
  quizNext: document.getElementById('quizNext'),

  // Sonuç
  resultBox: document.getElementById('resultBox'),
  resultRing: document.getElementById('resultRing'),
  resultPct: document.getElementById('resultPct'),
  resultFrac: document.getElementById('resultFrac'),
  resultTitle: document.getElementById('resultTitle'),
  resultText: document.getElementById('resultText'),
  resultWrong: document.getElementById('resultWrong'),
  resultWrongList: document.getElementById('resultWrongList'),
  resultPrimary: document.getElementById('resultPrimary'),
  resultSecondary: document.getElementById('resultSecondary')
};

/* ---------- 2. Kelime verisi (tek dosyaya birleştirildi) ----------
   words.js içeriği bu bölüme alınmıştır; ayrıca words.js yüklemek gerekmez.
   Sağlanan veri: 1-30. günler, her gün 20 kelime (toplam 600 kelime).
   Kaynak dosyada 31-50. günlerin verileri ve kapanış kodu bulunmuyordu.
   Eksik kapanış ve dizi -> nesne dönüşümü tamamlandı; yeni kelime eklenmedi.
   Uygulamanın 50 günlük planı ve diğer işlevleri değiştirilmedi.
   Kelimeleri eklemek veya değiştirmek için aşağıdaki RAW tablosunu düzenleyin.
   Her satır: [kelime, Türkçe anlamı, İngilizce örnek cümle, Türkçe çeviri]
   --------------------------------------------------------------- */
(function () {
  'use strict';

  const RAW = {
    // Gün 1: Gündelik temel kelimeler
    1: [
      ["water", "su", "I drink a glass of water every morning.", "Her sabah bir bardak su içerim."],
      ["house", "ev", "Their house is near the park.", "Onların evi parkın yakınında."],
      ["friend", "arkadaş", "My best friend lives in Ankara.", "En iyi arkadaşım Ankara'da yaşıyor."],
      ["book", "kitap", "She is reading an interesting book.", "O, ilginç bir kitap okuyor."],
      ["morning", "sabah", "I usually wake up early in the morning.", "Genellikle sabah erken uyanırım."],
      ["family", "aile", "My family has dinner together.", "Ailem akşam yemeğini birlikte yer."],
      ["kitchen", "mutfak", "Mom is cooking in the kitchen.", "Annem mutfakta yemek yapıyor."],
      ["window", "pencere", "Please open the window.", "Lütfen pencereyi aç."],
      ["street", "sokak, cadde", "The street is quiet at night.", "Sokak geceleri sessizdir."],
      ["weather", "hava durumu", "The weather is nice today.", "Bugün hava güzel."],
      ["food", "yemek, yiyecek", "I love Turkish food.", "Türk yemeklerini severim."],
      ["school", "okul", "The children walk to school.", "Çocuklar okula yürüyerek gider."],
      ["work", "iş; çalışmak", "I start work at nine.", "Dokuzda işe başlarım."],
      ["time", "zaman, saat", "What time is it?", "Saat kaç?"],
      ["music", "müzik", "We listen to music in the car.", "Arabada müzik dinleriz."],
      ["city", "şehir", "Istanbul is a big city.", "İstanbul büyük bir şehirdir."],
      ["door", "kapı", "Close the door, please.", "Lütfen kapıyı kapat."],
      ["phone", "telefon", "My phone is on the table.", "Telefonum masanın üstünde."],
      ["night", "gece", "I sleep well at night.", "Geceleri iyi uyurum."],
      ["happy", "mutlu", "She looks very happy today.", "Bugün çok mutlu görünüyor."],
    ],

    // Gün 2: Aile ve insanlar
    2: [
      ["mother", "anne", "My mother makes the best soup.", "Annem en güzel çorbayı yapar."],
      ["father", "baba", "My father drives to work every day.", "Babam her gün işe arabayla gider."],
      ["brother", "erkek kardeş, ağabey", "I have one older brother.", "Bir tane ağabeyim var."],
      ["sister", "kız kardeş, abla", "My sister is a doctor.", "Kız kardeşim doktor."],
      ["son", "oğul", "Their son is five years old.", "Onların oğlu beş yaşında."],
      ["daughter", "kız evlat", "She picked up her daughter from school.", "Kızını okuldan aldı."],
      ["husband", "koca, eş", "Her husband works at a bank.", "Kocası bir bankada çalışıyor."],
      ["wife", "eş, karı", "His wife is a teacher.", "Karısı bir öğretmen."],
      ["baby", "bebek", "The baby is sleeping now.", "Bebek şimdi uyuyor."],
      ["child", "çocuk", "Every child needs love.", "Her çocuğun sevgiye ihtiyacı var."],
      ["grandmother", "büyükanne, nine", "My grandmother tells great stories.", "Büyükannem harika hikâyeler anlatır."],
      ["grandfather", "büyükbaba, dede", "My grandfather lives in a small village.", "Büyükbabam küçük bir köyde yaşıyor."],
      ["uncle", "amca, dayı", "My uncle has a big farm.", "Amcamın büyük bir çiftliği var."],
      ["aunt", "teyze, hala", "My aunt visits us on Sundays.", "Teyzem bize pazar günleri gelir."],
      ["cousin", "kuzen", "My cousin is coming to the party.", "Kuzenim partiye geliyor."],
      ["neighbor", "komşu", "Our neighbor helps us a lot.", "Komşumuz bize çok yardım eder."],
      ["boy", "erkek çocuk", "The boy is playing football.", "Erkek çocuk futbol oynuyor."],
      ["girl", "kız çocuğu", "The girl is drawing a picture.", "Kız çocuğu bir resim çiziyor."],
      ["man", "adam, erkek", "That man is my teacher.", "O adam benim öğretmenim."],
      ["woman", "kadın", "The woman is waiting for the bus.", "Kadın otobüsü bekliyor."],
    ],

    // Gün 3: Zaman
    3: [
      ["minute", "dakika", "Wait a minute, please.", "Lütfen bir dakika bekle."],
      ["hour", "saat (süre)", "It takes one hour to get there.", "Oraya varmak bir saat sürüyor."],
      ["day", "gün", "Today is a beautiful day.", "Bugün güzel bir gün."],
      ["week", "hafta", "I visit my grandmother once a week.", "Büyükannemi haftada bir ziyaret ederim."],
      ["month", "ay (takvim)", "My birthday is next month.", "Doğum günüm gelecek ay."],
      ["year", "yıl", "We moved here last year.", "Geçen yıl buraya taşındık."],
      ["today", "bugün", "I am very busy today.", "Bugün çok meşgulüm."],
      ["tomorrow", "yarın", "See you tomorrow!", "Yarın görüşürüz!"],
      ["yesterday", "dün", "I watched a film yesterday.", "Dün bir film izledim."],
      ["early", "erken", "She gets up early every day.", "O her gün erken kalkar."],
      ["late", "geç", "Sorry, I am late.", "Üzgünüm, geç kaldım."],
      ["always", "her zaman, daima", "She always arrives on time.", "O her zaman zamanında gelir."],
      ["never", "asla, hiç", "I never drink coffee at night.", "Geceleri asla kahve içmem."],
      ["sometimes", "bazen", "Sometimes we eat out on Fridays.", "Bazen cuma günleri dışarıda yemek yeriz."],
      ["often", "sık sık", "We often walk in the park.", "Sık sık parkta yürürüz."],
      ["soon", "yakında", "The bus will come soon.", "Otobüs yakında gelecek."],
      ["now", "şimdi", "I am studying English now.", "Şimdi İngilizce çalışıyorum."],
      ["before", "önce, -den önce", "Wash your hands before dinner.", "Akşam yemeğinden önce ellerini yıka."],
      ["after", "sonra, -den sonra", "Call me after the lesson.", "Dersten sonra beni ara."],
      ["calendar", "takvim", "There is a calendar on the wall.", "Duvarda bir takvim var."],
    ],

    // Gün 4: Renkler ve görünüş
    4: [
      ["red", "kırmızı", "She is wearing a red dress.", "O kırmızı bir elbise giyiyor."],
      ["blue", "mavi", "The sky is blue today.", "Bugün gökyüzü mavi."],
      ["green", "yeşil", "I like green apples.", "Yeşil elmaları severim."],
      ["yellow", "sarı", "He bought a yellow umbrella.", "Sarı bir şemsiye aldı."],
      ["black", "siyah", "My cat is black.", "Kedim siyah."],
      ["white", "beyaz", "The snow is white.", "Kar beyazdır."],
      ["brown", "kahverengi", "He has brown eyes.", "Onun kahverengi gözleri var."],
      ["pink", "pembe", "She painted her room pink.", "Odasını pembe boyadı."],
      ["orange", "turuncu; portakal", "She is holding an orange balloon.", "Elinde turuncu bir balon tutuyor."],
      ["gray", "gri", "The clouds are gray today.", "Bugün bulutlar gri."],
      ["color", "renk", "What is your favorite color?", "En sevdiğin renk ne?"],
      ["big", "büyük", "They live in a big house.", "Büyük bir evde yaşıyorlar."],
      ["small", "küçük", "I need a small bag.", "Küçük bir çantaya ihtiyacım var."],
      ["long", "uzun", "It was a long day.", "Uzun bir gündü."],
      ["short", "kısa", "Her hair is short.", "Saçı kısa."],
      ["tall", "uzun boylu", "My brother is very tall.", "Ağabeyim çok uzun boylu."],
      ["new", "yeni", "I have a new phone.", "Yeni bir telefonum var."],
      ["old", "yaşlı; eski", "This is an old building.", "Bu eski bir bina."],
      ["young", "genç", "She is a young teacher.", "O genç bir öğretmen."],
      ["beautiful", "güzel", "What a beautiful view!", "Ne güzel bir manzara!"],
    ],

    // Gün 5: Yiyecek ve içecek
    5: [
      ["bread", "ekmek", "I buy fresh bread every morning.", "Her sabah taze ekmek alırım."],
      ["milk", "süt", "Do you want milk in your tea?", "Çayına süt ister misin?"],
      ["egg", "yumurta", "I eat an egg for breakfast.", "Kahvaltıda bir yumurta yerim."],
      ["cheese", "peynir", "This cheese is very tasty.", "Bu peynir çok lezzetli."],
      ["meat", "et", "He doesn't eat meat.", "O et yemez."],
      ["chicken", "tavuk", "We had chicken for dinner.", "Akşam yemeğinde tavuk yedik."],
      ["fish", "balık", "My father catches fish at the lake.", "Babam gölde balık tutar."],
      ["rice", "pirinç, pilav", "I like rice with chicken.", "Tavuklu pilavı severim."],
      ["soup", "çorba", "The soup is too hot.", "Çorba çok sıcak."],
      ["salad", "salata", "She made a big salad.", "Büyük bir salata yaptı."],
      ["fruit", "meyve", "Eat more fruit and vegetables.", "Daha çok meyve ve sebze ye."],
      ["vegetable", "sebze", "Carrots are a healthy vegetable.", "Havuç sağlıklı bir sebzedir."],
      ["apple", "elma", "An apple a day is good for you.", "Günde bir elma sana iyi gelir."],
      ["banana", "muz", "The monkey is eating a banana.", "Maymun muz yiyor."],
      ["tea", "çay", "Would you like some tea?", "Biraz çay ister misin?"],
      ["coffee", "kahve", "He drinks strong coffee.", "O sert kahve içer."],
      ["sugar", "şeker", "I take no sugar in my tea.", "Çayıma şeker koymam."],
      ["salt", "tuz", "Please pass the salt.", "Lütfen tuzu uzatır mısın?"],
      ["breakfast", "kahvaltı", "Breakfast is ready.", "Kahvaltı hazır."],
      ["dinner", "akşam yemeği", "We eat dinner at seven.", "Yedide akşam yemeği yeriz."],
    ],

    // Gün 6: Yemek ve mutfak
    6: [
      ["lunch", "öğle yemeği", "Let's have lunch together.", "Birlikte öğle yemeği yiyelim."],
      ["potato", "patates", "She peeled a potato for the soup.", "Çorba için bir patates soydu."],
      ["tomato", "domates", "Put a tomato in the salad.", "Salataya bir domates koy."],
      ["onion", "soğan", "Onion makes me cry.", "Soğan beni ağlatır."],
      ["carrot", "havuç", "The rabbit is eating a carrot.", "Tavşan bir havuç yiyor."],
      ["lemon", "limon", "Add some lemon to the tea.", "Çaya biraz limon ekle."],
      ["strawberry", "çilek", "Strawberry jam is my favorite.", "Çilek reçeli en sevdiğimdir."],
      ["grape", "üzüm", "Each grape is sweet and juicy.", "Her üzüm tatlı ve sulu."],
      ["cake", "kek, pasta", "She baked a cake for my birthday.", "Doğum günüm için bir kek pişirdi."],
      ["chocolate", "çikolata", "Children love chocolate.", "Çocuklar çikolatayı sever."],
      ["juice", "meyve suyu", "I drink orange juice every day.", "Her gün portakal suyu içerim."],
      ["butter", "tereyağı", "Put some butter on the bread.", "Ekmeğe biraz tereyağı sür."],
      ["honey", "bal", "Honey is sweet and healthy.", "Bal tatlı ve sağlıklıdır."],
      ["pepper", "biber, karabiber", "Add salt and pepper to the soup.", "Çorbaya tuz ve karabiber ekle."],
      ["hungry", "aç", "I am very hungry.", "Çok açım."],
      ["thirsty", "susamış", "Are you thirsty?", "Susadın mı?"],
      ["delicious", "lezzetli", "This pizza is delicious.", "Bu pizza çok lezzetli."],
      ["cook", "yemek pişirmek", "My father likes to cook on Sundays.", "Babam pazar günleri yemek pişirmeyi sever."],
      ["eat", "yemek yemek", "We eat together every evening.", "Her akşam birlikte yemek yeriz."],
      ["drink", "içmek", "You should drink more water.", "Daha çok su içmelisin."],
    ],

    // Gün 7: Vücut
    7: [
      ["head", "baş, kafa", "He nodded his head.", "Başını salladı."],
      ["face", "yüz", "Wash your face with cold water.", "Yüzünü soğuk suyla yıka."],
      ["eye", "göz", "She has a small mark near her eye.", "Gözünün yanında küçük bir ben var."],
      ["ear", "kulak", "The doctor looked into my ear.", "Doktor kulağıma baktı."],
      ["nose", "burun", "My nose is running.", "Burnum akıyor."],
      ["mouth", "ağız", "Don't talk with your mouth full.", "Ağzın doluyken konuşma."],
      ["tooth", "diş", "I have a pain in my tooth.", "Dişimde ağrı var."],
      ["hair", "saç", "She has long black hair.", "Uzun siyah saçları var."],
      ["hand", "el", "Give me your hand.", "Bana elini ver."],
      ["finger", "parmak", "He cut his finger with a knife.", "Parmağını bıçakla kesti."],
      ["arm", "kol", "She carried the baby in her arm.", "Bebeği kolunda taşıdı."],
      ["leg", "bacak", "My leg hurts after the game.", "Maçtan sonra bacağım ağrıyor."],
      ["foot", "ayak", "He hurt his foot yesterday.", "Dün ayağını incitti."],
      ["back", "sırt; geri", "My back hurts when I sit too long.", "Çok uzun oturunca sırtım ağrıyor."],
      ["heart", "kalp", "She has a kind heart.", "Onun iyi bir kalbi var."],
      ["stomach", "mide, karın", "My stomach is full after dinner.", "Akşam yemeğinden sonra midem dolu."],
      ["neck", "boyun", "My neck is stiff this morning.", "Boynum bu sabah tutulmuş."],
      ["shoulder", "omuz", "She put her bag on her shoulder.", "Çantasını omzuna astı."],
      ["knee", "diz", "The child fell and hurt his knee.", "Çocuk düştü ve dizini yaraladı."],
      ["skin", "cilt, deri", "Sunlight is bad for sensitive skin.", "Güneş ışığı hassas cilt için kötüdür."],
    ],

    // Gün 8: Sağlık ve duygular
    8: [
      ["doctor", "doktor", "My doctor told me to rest.", "Doktorum dinlenmemi söyledi."],
      ["medicine", "ilaç", "Take this medicine twice a day.", "Bu ilacı günde iki kez al."],
      ["hospital", "hastane", "He works at a big hospital.", "Büyük bir hastanede çalışıyor."],
      ["healthy", "sağlıklı", "Fruit is healthy.", "Meyve sağlıklıdır."],
      ["sick", "hasta", "My brother is sick today.", "Kardeşim bugün hasta."],
      ["pain", "ağrı, acı", "I feel a sharp pain in my back.", "Sırtımda keskin bir ağrı hissediyorum."],
      ["headache", "baş ağrısı", "I have a headache.", "Başım ağrıyor."],
      ["tired", "yorgun", "I am too tired to walk.", "Yürüyemeyecek kadar yorgunum."],
      ["sleep", "uyumak; uyku", "Babies sleep a lot.", "Bebekler çok uyur."],
      ["rest", "dinlenmek", "You need to rest.", "Dinlenmen gerekiyor."],
      ["fever", "ateş (hastalık)", "The child has a high fever.", "Çocuğun yüksek ateşi var."],
      ["cough", "öksürük", "She has a bad cough.", "Kötü bir öksürüğü var."],
      ["nurse", "hemşire", "The nurse is very kind.", "Hemşire çok nazik."],
      ["patient", "hasta (tedavi gören)", "The doctor is talking to a patient.", "Doktor bir hastayla konuşuyor."],
      ["hurt", "acıtmak, incitmek", "My feet hurt after the long walk.", "Uzun yürüyüşten sonra ayaklarım ağrıyor."],
      ["sad", "üzgün", "She feels sad today.", "Bugün üzgün hissediyor."],
      ["angry", "kızgın", "He was angry about the noise.", "Gürültüye kızgındı."],
      ["afraid", "korkmuş", "Don't be afraid of the dog.", "Köpekten korkma."],
      ["excited", "heyecanlı", "I am excited about the trip.", "Gezi için heyecanlıyım."],
      ["bored", "sıkılmış", "The students were bored in class.", "Öğrenciler derste sıkılmıştı."],
    ],

    // Gün 9: Giyim
    9: [
      ["shirt", "gömlek", "He is wearing a white shirt.", "Beyaz bir gömlek giyiyor."],
      ["trousers", "pantolon", "These trousers are too long.", "Bu pantolon çok uzun."],
      ["dress", "elbise", "She bought a blue dress.", "Mavi bir elbise aldı."],
      ["skirt", "etek", "I like your skirt.", "Eteğini beğendim."],
      ["jacket", "ceket", "Take your jacket with you.", "Ceketini yanına al."],
      ["coat", "palto, kaban", "It is cold, so wear your coat.", "Hava soğuk, o yüzden paltonu giy."],
      ["shoes", "ayakkabı", "I need new shoes.", "Yeni ayakkabılara ihtiyacım var."],
      ["socks", "çorap", "These socks are warm.", "Bu çoraplar sıcak."],
      ["hat", "şapka", "He wears a hat in summer.", "Yazın şapka takar."],
      ["glasses", "gözlük", "She can't read without her glasses.", "Gözlüğü olmadan okuyamaz."],
      ["bag", "çanta", "My bag is very heavy.", "Çantam çok ağır."],
      ["umbrella", "şemsiye", "Take an umbrella, it may rain.", "Şemsiye al, yağmur yağabilir."],
      ["scarf", "atkı, eşarp", "I bought a wool scarf.", "Yünlü bir atkı aldım."],
      ["gloves", "eldiven", "Wear gloves in winter.", "Kışın eldiven tak."],
      ["belt", "kemer", "He needs a new belt.", "Yeni bir kemere ihtiyacı var."],
      ["pocket", "cep", "I put my keys in my pocket.", "Anahtarlarımı cebime koydum."],
      ["wear", "giymek", "What will you wear tonight?", "Bu akşam ne giyeceksin?"],
      ["button", "düğme", "A button fell off my coat.", "Paltomun düğmesi düştü."],
      ["size", "beden, boyut", "What size do you wear?", "Kaç beden giyiyorsun?"],
      ["fashion", "moda", "She loves fashion.", "O modayı çok sever."],
    ],

    // Gün 10: Ev ve eşyalar
    10: [
      ["room", "oda", "My room is on the second floor.", "Odam ikinci katta."],
      ["bedroom", "yatak odası", "The bedroom is very quiet.", "Yatak odası çok sessiz."],
      ["bathroom", "banyo", "The bathroom is next to the kitchen.", "Banyo mutfağın yanında."],
      ["garden", "bahçe", "We have a small garden.", "Küçük bir bahçemiz var."],
      ["roof", "çatı", "The cat is on the roof.", "Kedi çatıda."],
      ["wall", "duvar", "There is a picture on the wall.", "Duvarda bir resim var."],
      ["floor", "zemin, kat", "The floor is wet.", "Zemin ıslak."],
      ["stairs", "merdiven (kat)", "Be careful on the stairs.", "Merdivenlerde dikkatli ol."],
      ["table", "masa", "The food is on the table.", "Yemek masanın üstünde."],
      ["chair", "sandalye", "Please sit on this chair.", "Lütfen bu sandalyeye otur."],
      ["bed", "yatak", "I go to bed at eleven.", "Saat on birde yatağa giderim."],
      ["sofa", "kanepe", "The cat is sleeping on the sofa.", "Kedi kanepede uyuyor."],
      ["lamp", "lamba", "Turn on the lamp, please.", "Lütfen lambayı aç."],
      ["mirror", "ayna", "She looked at herself in the mirror.", "Aynada kendine baktı."],
      ["shelf", "raf", "The books are on the shelf.", "Kitaplar rafta."],
      ["carpet", "halı", "We have a red carpet in the hall.", "Salonda kırmızı bir halımız var."],
      ["curtain", "perde", "Close the curtain, it is too bright.", "Perdeyi kapat, çok parlak."],
      ["key", "anahtar", "I lost my key.", "Anahtarımı kaybettim."],
      ["clock", "duvar saati", "The clock on the wall is wrong.", "Duvardaki saat yanlış."],
      ["fridge", "buzdolabı", "There is milk in the fridge.", "Buzdolabında süt var."],
    ],

    // Gün 11: Hayvanlar
    11: [
      ["dog", "köpek", "The dog is barking.", "Köpek havlıyor."],
      ["cat", "kedi", "My cat likes fish.", "Kedim balığı sever."],
      ["bird", "kuş", "A bird is singing in the tree.", "Ağaçta bir kuş ötüyor."],
      ["horse", "at", "He rides a horse every weekend.", "Her hafta sonu ata biner."],
      ["cow", "inek", "The cow gives us milk.", "İnek bize süt verir."],
      ["sheep", "koyun", "The sheep are on the hill.", "Koyunlar tepede."],
      ["rabbit", "tavşan", "The rabbit jumped over the fence.", "Tavşan çitin üzerinden atladı."],
      ["mouse", "fare", "A mouse is in the kitchen.", "Mutfakta bir fare var."],
      ["lion", "aslan", "The lion is the king of animals.", "Aslan hayvanların kralıdır."],
      ["tiger", "kaplan", "A tiger can run very fast.", "Bir kaplan çok hızlı koşabilir."],
      ["elephant", "fil", "The elephant drinks a lot of water.", "Fil çok su içer."],
      ["monkey", "maymun", "The monkey climbed the tree.", "Maymun ağaca tırmandı."],
      ["bear", "ayı", "A bear sleeps through the winter.", "Ayı kışı uyuyarak geçirir."],
      ["wolf", "kurt", "The wolf howled at the moon.", "Kurt aya uludu."],
      ["fox", "tilki", "A fox ran across the road.", "Bir tilki yolun karşısına koştu."],
      ["snake", "yılan", "Be careful, there is a snake!", "Dikkat et, bir yılan var!"],
      ["duck", "ördek", "The ducks are swimming in the lake.", "Ördekler gölde yüzüyor."],
      ["butterfly", "kelebek", "A butterfly landed on the flower.", "Bir kelebek çiçeğin üzerine kondu."],
      ["bee", "arı", "The bee makes honey.", "Arı bal yapar."],
      ["turtle", "kaplumbağa", "The turtle walks very slowly.", "Kaplumbağa çok yavaş yürür."],
    ],

    // Gün 12: Doğa
    12: [
      ["tree", "ağaç", "We sat under a big tree.", "Büyük bir ağacın altında oturduk."],
      ["flower", "çiçek", "She gave me a red flower.", "Bana kırmızı bir çiçek verdi."],
      ["grass", "çimen, ot", "The children are playing on the grass.", "Çocuklar çimenlerde oynuyor."],
      ["mountain", "dağ", "We climbed the mountain.", "Dağa tırmandık."],
      ["river", "nehir", "The river is very wide.", "Nehir çok geniş."],
      ["sea", "deniz", "I love swimming in the sea.", "Denizde yüzmeyi severim."],
      ["lake", "göl", "There is a small lake near the village.", "Köyün yakınında küçük bir göl var."],
      ["forest", "orman", "We walked through the forest.", "Ormanın içinden yürüdük."],
      ["sun", "güneş", "The sun rises in the east.", "Güneş doğudan doğar."],
      ["moon", "ay (gökyüzü)", "The moon is bright tonight.", "Bu gece ay parlak."],
      ["star", "yıldız", "I can see a star in the sky.", "Gökyüzünde bir yıldız görebiliyorum."],
      ["sky", "gökyüzü", "The sky is full of stars.", "Gökyüzü yıldızlarla dolu."],
      ["cloud", "bulut", "A dark cloud is coming.", "Kara bir bulut geliyor."],
      ["rain", "yağmur", "I like the sound of rain.", "Yağmur sesini severim."],
      ["snow", "kar", "Snow covered the whole city.", "Kar bütün şehri kapladı."],
      ["wind", "rüzgâr", "The wind is cold today.", "Bugün rüzgâr soğuk."],
      ["stone", "taş", "He threw a stone into the water.", "Suya bir taş attı."],
      ["sand", "kum", "The sand is hot in summer.", "Kum yazın sıcaktır."],
      ["island", "ada", "We visited a small island.", "Küçük bir adayı ziyaret ettik."],
      ["beach", "plaj", "Let's go to the beach.", "Hadi plaja gidelim."],
    ],

    // Gün 13: Hava durumu ve mevsimler
    13: [
      ["summer", "yaz", "We go to the sea in summer.", "Yazın denize gideriz."],
      ["winter", "kış", "Winter is cold here.", "Burada kış soğuk geçer."],
      ["spring", "ilkbahar", "Flowers open in spring.", "Çiçekler ilkbaharda açar."],
      ["autumn", "sonbahar", "The leaves fall in autumn.", "Yapraklar sonbaharda düşer."],
      ["hot", "sıcak (çok)", "The tea is too hot.", "Çay çok sıcak."],
      ["cold", "soğuk", "It is very cold outside.", "Dışarısı çok soğuk."],
      ["warm", "ılık", "The water is warm.", "Su ılık."],
      ["cool", "serin", "The evening is cool.", "Akşam serin."],
      ["sunny", "güneşli", "It is a sunny day.", "Güneşli bir gün."],
      ["cloudy", "bulutlu", "It will be cloudy tomorrow.", "Yarın hava bulutlu olacak."],
      ["rainy", "yağmurlu", "I don't like rainy days.", "Yağmurlu günleri sevmem."],
      ["windy", "rüzgârlı", "It is too windy to go out.", "Dışarı çıkamayacak kadar rüzgârlı."],
      ["storm", "fırtına", "A storm is coming tonight.", "Bu gece bir fırtına geliyor."],
      ["fog", "sis", "There is thick fog on the road.", "Yolda yoğun sis var."],
      ["ice", "buz", "Please add some ice to my drink.", "Lütfen içeceğime biraz buz ekle."],
      ["temperature", "sıcaklık", "The temperature is twenty degrees.", "Sıcaklık yirmi derece."],
      ["season", "mevsim", "Which season do you like best?", "En çok hangi mevsimi seviyorsun?"],
      ["shine", "parlamak", "The sun will shine tomorrow.", "Yarın güneş parlayacak."],
      ["freeze", "donmak", "Water freezes at zero degrees.", "Su sıfır derecede donar."],
      ["melt", "erimek", "The snow will melt soon.", "Kar yakında erir."],
    ],

    // Gün 14: Ulaşım
    14: [
      ["car", "araba", "My father bought a new car.", "Babam yeni bir araba aldı."],
      ["bus", "otobüs", "I take the bus to school.", "Okula otobüsle giderim."],
      ["train", "tren", "The train leaves at nine.", "Tren dokuzda kalkıyor."],
      ["plane", "uçak", "The plane is landing now.", "Uçak şimdi iniyor."],
      ["ship", "gemi", "The ship sailed at noon.", "Gemi öğlen yola çıktı."],
      ["bicycle", "bisiklet", "She goes to work by bicycle.", "İşe bisikletle gider."],
      ["taxi", "taksi", "Let's take a taxi.", "Hadi taksiye binelim."],
      ["truck", "kamyon", "A big truck is blocking the road.", "Büyük bir kamyon yolu kapatıyor."],
      ["road", "yol", "This road goes to the beach.", "Bu yol plaja gidiyor."],
      ["bridge", "köprü", "We crossed the old bridge.", "Eski köprüyü geçtik."],
      ["airport", "havalimanı", "The airport is far from the city.", "Havalimanı şehre uzak."],
      ["station", "istasyon", "I'll meet you at the station.", "Seninle istasyonda buluşacağım."],
      ["ticket", "bilet", "I bought two tickets for the concert.", "Konser için iki bilet aldım."],
      ["passenger", "yolcu", "Every passenger must wear a seat belt.", "Her yolcu emniyet kemeri takmalı."],
      ["driver", "sürücü, şoför", "The taxi driver knew the way.", "Taksi şoförü yolu biliyordu."],
      ["traffic", "trafik", "There is a lot of traffic today.", "Bugün çok trafik var."],
      ["journey", "yolculuk", "The journey took five hours.", "Yolculuk beş saat sürdü."],
      ["engine", "motor", "The old engine makes a lot of noise.", "Eski motor çok ses çıkarıyor."],
      ["wheel", "tekerlek", "The car has a flat wheel.", "Arabanın tekerleği patlak."],
      ["travel", "seyahat etmek", "I love to travel.", "Seyahat etmeyi çok severim."],
    ],

    // Gün 15: Şehirdeki yerler
    15: [
      ["shop", "dükkân, mağaza", "The shop opens at nine.", "Dükkân dokuzda açılıyor."],
      ["market", "pazar", "We buy vegetables at the market.", "Sebzeleri pazardan alırız."],
      ["bank", "banka", "The bank is closed on Sundays.", "Banka pazar günleri kapalı."],
      ["hotel", "otel", "We stayed in a small hotel.", "Küçük bir otelde kaldık."],
      ["restaurant", "restoran", "This restaurant serves great fish.", "Bu restoran harika balık servis ediyor."],
      ["cafe", "kafe", "Let's meet at the cafe.", "Kafede buluşalım."],
      ["library", "kütüphane", "I study at the library.", "Kütüphanede ders çalışırım."],
      ["museum", "müze", "The museum is free on Sundays.", "Müze pazar günleri ücretsiz."],
      ["park", "park", "The children play in the park.", "Çocuklar parkta oynuyor."],
      ["cinema", "sinema", "We went to the cinema last night.", "Dün gece sinemaya gittik."],
      ["theater", "tiyatro", "She works at the theater.", "Tiyatroda çalışıyor."],
      ["mosque", "cami", "The old mosque is in the center.", "Eski cami merkezde."],
      ["bakery", "fırın, ekmekçi", "The bakery smells wonderful.", "Fırın harika kokuyor."],
      ["pharmacy", "eczane", "I need to go to the pharmacy.", "Eczaneye gitmem gerekiyor."],
      ["police", "polis", "Call the police!", "Polisi ara!"],
      ["village", "köy", "My grandparents live in a village.", "Büyükanne ve büyükbabam bir köyde yaşıyor."],
      ["corner", "köşe", "The shop is on the corner.", "Dükkân köşede."],
      ["square", "meydan", "There is a fountain in the square.", "Meydanda bir çeşme var."],
      ["neighborhood", "mahalle", "It is a quiet neighborhood.", "Sessiz bir mahalle."],
      ["building", "bina", "That building is very tall.", "O bina çok yüksek."],
    ],

    // Gün 16: Yön ve konum
    16: [
      ["left", "sol", "Turn left at the corner.", "Köşeden sola dön."],
      ["right", "sağ", "Turn right after the bank.", "Bankadan sonra sağa dön."],
      ["straight", "dümdüz", "Go straight for two hundred meters.", "İki yüz metre dümdüz git."],
      ["near", "yakın", "My school is near my house.", "Okulum evime yakın."],
      ["far", "uzak", "Is the station far from here?", "İstasyon buradan uzak mı?"],
      ["inside", "içeride", "It is cold, so stay inside.", "Hava soğuk, o yüzden içeride kal."],
      ["outside", "dışarıda", "The children are playing outside.", "Çocuklar dışarıda oynuyor."],
      ["behind", "arkasında", "The garden is behind the house.", "Bahçe evin arkasında."],
      ["between", "(iki şeyin) arasında", "The bank is between the shop and the cafe.", "Banka dükkân ile kafenin arasında."],
      ["above", "üstünde", "There is a lamp above the table.", "Masanın üstünde bir lamba var."],
      ["below", "altında", "Write your name below the line.", "Adını çizginin altına yaz."],
      ["across", "karşısında", "The pharmacy is across the street.", "Eczane sokağın karşısında."],
      ["around", "etrafında", "There are trees around the lake.", "Gölün etrafında ağaçlar var."],
      ["along", "boyunca", "We walked along the river.", "Nehir boyunca yürüdük."],
      ["beside", "yanında", "She sat beside me.", "Yanıma oturdu."],
      ["direction", "yön", "Which direction should I go?", "Hangi yöne gitmeliyim?"],
      ["north", "kuzey", "The wind comes from the north.", "Rüzgâr kuzeyden esiyor."],
      ["south", "güney", "Antalya is in the south of Turkey.", "Antalya Türkiye'nin güneyinde."],
      ["east", "doğu", "Erzurum is in the east of Turkey.", "Erzurum Türkiye'nin doğusundadır."],
      ["west", "batı", "The sun sets in the west.", "Güneş batıda batar."],
    ],

    // Gün 17: Okul ve eğitim
    17: [
      ["teacher", "öğretmen", "Our teacher is very kind.", "Öğretmenimiz çok nazik."],
      ["student", "öğrenci", "Every student has a book.", "Her öğrencinin bir kitabı var."],
      ["lesson", "ders", "The lesson starts at nine.", "Ders dokuzda başlıyor."],
      ["class", "sınıf", "There are twenty students in my class.", "Sınıfımda yirmi öğrenci var."],
      ["homework", "ödev", "I do my homework after dinner.", "Ödevimi akşam yemeğinden sonra yaparım."],
      ["exam", "sınav", "I have an exam tomorrow.", "Yarın sınavım var."],
      ["question", "soru", "Can I ask a question?", "Bir soru sorabilir miyim?"],
      ["answer", "cevap", "I don't know the answer.", "Cevabı bilmiyorum."],
      ["pencil", "kurşun kalem", "Please use a pencil.", "Lütfen kurşun kalem kullan."],
      ["pen", "tükenmez kalem", "Can I borrow your pen?", "Kalemini ödünç alabilir miyim?"],
      ["notebook", "defter", "I write new words in my notebook.", "Yeni kelimeleri defterime yazarım."],
      ["paper", "kâğıt", "I need a piece of paper.", "Bir parça kâğıda ihtiyacım var."],
      ["desk", "sıra, çalışma masası", "The student is sitting at his desk.", "Öğrenci sırasında oturuyor."],
      ["board", "tahta", "The teacher wrote the date on the board.", "Öğretmen tarihi tahtaya yazdı."],
      ["dictionary", "sözlük", "Look it up in the dictionary.", "Sözlükten bak."],
      ["grammar", "dilbilgisi", "I study English grammar every evening.", "Her akşam İngilizce dilbilgisi çalışırım."],
      ["subject", "konu; okul dersi", "Math is my favorite subject.", "Matematik en sevdiğim derstir."],
      ["university", "üniversite", "She studies at a university in Ankara.", "Ankara'da bir üniversitede okuyor."],
      ["learn", "öğrenmek", "I want to learn English.", "İngilizce öğrenmek istiyorum."],
      ["teach", "öğretmek", "She teaches math at a high school.", "Bir lisede matematik öğretiyor."],
    ],

    // Gün 18: İş hayatı ve meslekler
    18: [
      ["job", "iş, meslek", "He is looking for a new job.", "Yeni bir iş arıyor."],
      ["office", "ofis", "I go to the office by bus.", "Ofise otobüsle giderim."],
      ["boss", "patron", "My boss is very fair.", "Patronum çok adil."],
      ["worker", "işçi", "Each worker gets a lunch break.", "Her işçi öğle molası alır."],
      ["engineer", "mühendis", "My uncle is an engineer.", "Amcam mühendis."],
      ["lawyer", "avukat", "The lawyer read the contract.", "Avukat sözleşmeyi okudu."],
      ["farmer", "çiftçi", "The farmer works in the field.", "Çiftçi tarlada çalışıyor."],
      ["pilot", "pilot", "The pilot welcomed the passengers.", "Pilot yolcuları karşıladı."],
      ["soldier", "asker", "The soldier stood at the gate.", "Asker kapıda durdu."],
      ["artist", "sanatçı", "The artist painted a beautiful picture.", "Sanatçı güzel bir resim yaptı."],
      ["singer", "şarkıcı", "My sister wants to be a singer.", "Kız kardeşim şarkıcı olmak istiyor."],
      ["waiter", "garson", "The waiter brought our soup.", "Garson çorbamızı getirdi."],
      ["salary", "maaş", "Her salary is paid monthly.", "Maaşı aylık ödeniyor."],
      ["meeting", "toplantı", "The meeting starts at ten.", "Toplantı onda başlıyor."],
      ["company", "şirket", "He works for a big company.", "Büyük bir şirkette çalışıyor."],
      ["customer", "müşteri", "The customer is always right.", "Müşteri her zaman haklıdır."],
      ["employee", "çalışan, personel", "Each employee has a card.", "Her çalışanın bir kartı var."],
      ["career", "kariyer", "She wants a career in medicine.", "Tıpta kariyer yapmak istiyor."],
      ["interview", "mülakat, görüşme", "I have a job interview tomorrow.", "Yarın bir iş mülakatım var."],
      ["profession", "meslek (uzmanlık)", "Teaching is a great profession.", "Öğretmenlik harika bir meslektir."],
    ],

    // Gün 19: Alışveriş ve para
    19: [
      ["price", "fiyat", "What is the price of this shirt?", "Bu gömleğin fiyatı nedir?"],
      ["cheap", "ucuz", "The tomatoes are cheap today.", "Domatesler bugün ucuz."],
      ["expensive", "pahalı", "This car is too expensive.", "Bu araba çok pahalı."],
      ["buy", "satın almak", "I want to buy a new phone.", "Yeni bir telefon satın almak istiyorum."],
      ["sell", "satmak", "They sell fresh fish here.", "Burada taze balık satıyorlar."],
      ["pay", "ödemek", "Can I pay by card?", "Kartla ödeyebilir miyim?"],
      ["money", "para", "I don't have enough money.", "Yeterli param yok."],
      ["cash", "nakit", "Do you have any cash?", "Hiç nakdin var mı?"],
      ["wallet", "cüzdan", "I left my wallet at home.", "Cüzdanımı evde bıraktım."],
      ["discount", "indirim", "There is a ten percent discount.", "Yüzde on indirim var."],
      ["bill", "fatura, hesap", "Can we have the bill, please?", "Hesabı alabilir miyiz lütfen?"],
      ["receipt", "fiş", "Keep the receipt.", "Fişi sakla."],
      ["gift", "hediye", "This gift is for you.", "Bu hediye senin için."],
      ["cost", "mal olmak, tutmak", "How much does this cost?", "Bu ne kadar tutuyor?"],
      ["spend", "harcamak", "I spend too much on food.", "Yiyeceğe çok fazla harcıyorum."],
      ["save", "biriktirmek; kurtarmak", "She saves money every month.", "Her ay para biriktiriyor."],
      ["borrow", "ödünç almak", "Can I borrow your umbrella?", "Şemsiyeni ödünç alabilir miyim?"],
      ["lend", "ödünç vermek", "Could you lend me ten lira?", "Bana on lira ödünç verebilir misin?"],
      ["rich", "zengin", "The rich man gave money to the school.", "Zengin adam okula para verdi."],
      ["poor", "fakir", "The poor family needed help.", "Fakir aile yardıma ihtiyaç duyuyordu."],
    ],

    // Gün 20: Temel fiiller 1
    20: [
      ["go", "gitmek", "We go to the beach every summer.", "Her yaz plaja gideriz."],
      ["come", "gelmek", "Come here, please.", "Lütfen buraya gel."],
      ["see", "görmek", "I can see the mountain from my window.", "Pencereden dağı görebiliyorum."],
      ["look", "bakmak", "Look at the sky!", "Gökyüzüne bak!"],
      ["hear", "duymak", "I can't hear you.", "Seni duyamıyorum."],
      ["listen", "dinlemek", "Please listen carefully.", "Lütfen dikkatle dinle."],
      ["speak", "konuşmak", "Do you speak English?", "İngilizce konuşuyor musun?"],
      ["say", "söylemek, demek", "What did you say?", "Ne dedin?"],
      ["tell", "anlatmak", "Tell me a story.", "Bana bir hikâye anlat."],
      ["ask", "sormak", "Ask your teacher.", "Öğretmenine sor."],
      ["give", "vermek", "Give me the book, please.", "Kitabı bana ver lütfen."],
      ["take", "almak, götürmek", "Take this medicine after lunch.", "Bu ilacı öğle yemeğinden sonra al."],
      ["make", "yapmak, üretmek", "She makes cakes on weekends.", "Hafta sonları kek yapar."],
      ["do", "yapmak, etmek", "What do you do on Sundays?", "Pazar günleri ne yaparsın?"],
      ["have", "sahip olmak", "I have two brothers.", "İki erkek kardeşim var."],
      ["know", "bilmek, tanımak", "I know your sister.", "Kız kardeşini tanıyorum."],
      ["think", "düşünmek", "I think it is a good idea.", "Bunun iyi bir fikir olduğunu düşünüyorum."],
      ["want", "istemek", "I want a glass of water.", "Bir bardak su istiyorum."],
      ["need", "ihtiyaç duymak", "We need more time.", "Daha fazla zamana ihtiyacımız var."],
      ["like", "sevmek, beğenmek", "I like your bag.", "Çantanı beğendim."],
    ],

    // Gün 21: Temel fiiller 2
    21: [
      ["love", "sevmek, aşık olmak", "I love my family.", "Ailemi seviyorum."],
      ["live", "yaşamak", "They live in a small town.", "Küçük bir kasabada yaşıyorlar."],
      ["walk", "yürümek", "I walk to work.", "İşe yürüyerek giderim."],
      ["run", "koşmak", "He can run very fast.", "O çok hızlı koşabilir."],
      ["sit", "oturmak", "Please sit down.", "Lütfen otur."],
      ["stand", "ayakta durmak", "Stand up, please.", "Lütfen ayağa kalk."],
      ["open", "açmak", "Can you open the door?", "Kapıyı açabilir misin?"],
      ["close", "kapatmak", "Please close the window.", "Lütfen pencereyi kapat."],
      ["start", "başlamak", "The film starts at eight.", "Film sekizde başlıyor."],
      ["finish", "bitirmek", "I finish work at five.", "İşi beşte bitiririm."],
      ["wait", "beklemek", "I'll wait for you here.", "Seni burada bekleyeceğim."],
      ["find", "bulmak", "I can't find my keys.", "Anahtarlarımı bulamıyorum."],
      ["lose", "kaybetmek", "Don't lose your ticket.", "Biletini kaybetme."],
      ["bring", "getirmek", "Please bring your notebook.", "Lütfen defterini getir."],
      ["carry", "taşımak", "Can you carry this bag?", "Bu çantayı taşıyabilir misin?"],
      ["send", "göndermek", "I will send you a message.", "Sana bir mesaj göndereceğim."],
      ["write", "yazmak", "Write your name here.", "Adını buraya yaz."],
      ["read", "okumak", "I read before sleeping.", "Uyumadan önce okurum."],
      ["play", "oynamak, çalmak", "The kids play in the garden.", "Çocuklar bahçede oynuyor."],
      ["help", "yardım etmek", "Can you help me?", "Bana yardım edebilir misin?"],
    ],

    // Gün 22: Günlük rutin fiilleri
    22: [
      ["wake", "uyanmak", "I wake up at seven.", "Yedide uyanırım."],
      ["wash", "yıkamak", "Wash your hands before eating.", "Yemekten önce ellerini yıka."],
      ["brush", "fırçalamak", "Brush your teeth twice a day.", "Dişlerini günde iki kez fırçala."],
      ["comb", "taramak", "She combs her hair every morning.", "Her sabah saçını tarar."],
      ["leave", "ayrılmak, çıkmak", "I leave home at eight.", "Saat sekizde evden çıkarım."],
      ["arrive", "varmak", "The train arrives at noon.", "Tren öğlen varıyor."],
      ["return", "geri dönmek", "She returns home at six.", "Altıda eve döner."],
      ["visit", "ziyaret etmek", "We visit my grandmother on Sundays.", "Pazar günleri büyükannemi ziyaret ederiz."],
      ["meet", "tanışmak, buluşmak", "Nice to meet you.", "Tanıştığımıza memnun oldum."],
      ["invite", "davet etmek", "I want to invite you to dinner.", "Seni yemeğe davet etmek istiyorum."],
      ["clean", "temizlemek", "I clean my room on Saturdays.", "Cumartesi günleri odamı temizlerim."],
      ["sweep", "süpürmek", "Please sweep the floor.", "Lütfen zemini süpür."],
      ["fix", "onarmak", "He can fix any car.", "O her arabayı onarabilir."],
      ["repair", "tamir etmek", "They repair old watches.", "Eski saatleri tamir ediyorlar."],
      ["build", "inşa etmek", "They want to build a new bridge.", "Yeni bir köprü inşa etmek istiyorlar."],
      ["paint", "boyamak", "We will paint the wall white.", "Duvarı beyaza boyayacağız."],
      ["draw", "çizmek", "She likes to draw animals.", "Hayvan çizmeyi sever."],
      ["sing", "şarkı söylemek", "He sings in the shower.", "Duşta şarkı söyler."],
      ["dance", "dans etmek", "They dance at weddings.", "Düğünlerde dans ederler."],
      ["swim", "yüzmek", "I can swim very well.", "Çok iyi yüzebilirim."],
    ],

    // Gün 23: Zıt anlamlı sıfatlar
    23: [
      ["good", "iyi", "This is a good book.", "Bu iyi bir kitap."],
      ["bad", "kötü", "The weather is bad today.", "Bugün hava kötü."],
      ["easy", "kolay", "The test was easy.", "Test kolaydı."],
      ["difficult", "zor", "The question was too difficult.", "Soru çok zordu."],
      ["fast", "hızlı", "He is a fast runner.", "O hızlı bir koşucu."],
      ["slow", "yavaş", "The internet is very slow today.", "İnternet bugün çok yavaş."],
      ["strong", "güçlü", "He is strong enough to lift it.", "Onu kaldıracak kadar güçlü."],
      ["weak", "zayıf, güçsüz", "After the fever, he felt weak.", "Ateşten sonra kendini güçsüz hissetti."],
      ["heavy", "ağır", "This box is very heavy.", "Bu kutu çok ağır."],
      ["light", "hafif; ışık", "My bag is light.", "Çantam hafif."],
      ["full", "dolu, tok", "The glass is full.", "Bardak dolu."],
      ["empty", "boş", "The room is empty.", "Oda boş."],
      ["dark", "karanlık", "It is dark outside.", "Dışarısı karanlık."],
      ["bright", "parlak", "She has bright eyes.", "Parlak gözleri var."],
      ["loud", "yüksek sesli", "The music is too loud.", "Müzik çok yüksek sesli."],
      ["quiet", "sessiz", "Please be quiet.", "Lütfen sessiz ol."],
      ["soft", "yumuşak", "The bed is very soft.", "Yatak çok yumuşak."],
      ["hard", "sert", "The bread is hard.", "Ekmek sert."],
      ["wet", "ıslak", "My shoes are wet.", "Ayakkabılarım ıslak."],
      ["dry", "kuru", "The towel is dry.", "Havlu kuru."],
    ],

    // Gün 24: Kişilik özellikleri
    24: [
      ["kind", "nazik, iyi kalpli", "He is a kind man.", "O nazik bir adam."],
      ["polite", "kibar, saygılı", "The waiter is very polite.", "Garson çok kibar."],
      ["rude", "kaba", "It is rude to shout.", "Bağırmak kabalıktır."],
      ["honest", "dürüst", "She is an honest person.", "O dürüst biri."],
      ["brave", "cesur", "The brave boy saved the cat.", "Cesur çocuk kediyi kurtardı."],
      ["shy", "utangaç", "My little sister is shy.", "Küçük kız kardeşim utangaç."],
      ["lazy", "tembel", "Don't be lazy, get up!", "Tembel olma, kalk!"],
      ["clever", "zeki", "He is a clever student.", "O zeki bir öğrenci."],
      ["funny", "komik", "That film was very funny.", "O film çok komikti."],
      ["serious", "ciddi", "This is a serious problem.", "Bu ciddi bir sorun."],
      ["friendly", "cana yakın", "The people here are friendly.", "Buradaki insanlar cana yakın."],
      ["careful", "dikkatli", "Be careful, the floor is wet.", "Dikkatli ol, zemin ıslak."],
      ["proud", "gururlu", "I am proud of you.", "Seninle gurur duyuyorum."],
      ["jealous", "kıskanç", "She was jealous of her sister.", "Kız kardeşini kıskanıyordu."],
      ["lonely", "yalnız, kimsesiz", "He feels lonely in the new city.", "Yeni şehirde kendini yalnız hissediyor."],
      ["nervous", "gergin", "I am nervous before the exam.", "Sınavdan önce gerginim."],
      ["calm", "sakin", "Stay calm, everything is fine.", "Sakin ol, her şey yolunda."],
      ["generous", "cömert", "He is generous with his friends.", "Arkadaşlarına karşı cömerttir."],
      ["stubborn", "inatçı", "My brother is very stubborn.", "Ağabeyim çok inatçı."],
      ["cheerful", "neşeli", "She is always cheerful.", "O her zaman neşelidir."],
    ],

    // Gün 25: Soru kelimeleri ve bağlaçlar
    25: [
      ["what", "ne", "What is your name?", "Adın ne?"],
      ["where", "nerede", "Where do you live?", "Nerede yaşıyorsun?"],
      ["when", "ne zaman", "When does the lesson start?", "Ders ne zaman başlıyor?"],
      ["why", "neden, niçin", "Why are you late?", "Neden geç kaldın?"],
      ["who", "kim", "Who is that man?", "O adam kim?"],
      ["which", "hangi", "Which color do you like?", "Hangi rengi seviyorsun?"],
      ["how", "nasıl", "How are you today?", "Bugün nasılsın?"],
      ["because", "çünkü", "I am happy because it is Friday.", "Mutluyum çünkü bugün cuma."],
      ["but", "ama, fakat", "I like tea, but I don't like coffee.", "Çayı severim ama kahveyi sevmem."],
      ["and", "ve", "I have a cat and a dog.", "Bir kedim ve bir köpeğim var."],
      ["or", "veya, ya da", "Do you want tea or coffee?", "Çay mı kahve mi istersin?"],
      ["if", "eğer, -se/-sa", "If it rains, we will stay home.", "Yağmur yağarsa evde kalacağız."],
      ["then", "sonra, o zaman", "Finish your homework, then you can play.", "Ödevini bitir, sonra oynayabilirsin."],
      ["also", "ayrıca", "She also speaks French.", "O ayrıca Fransızca konuşuyor."],
      ["too", "de, da; aşırı", "I want to come too.", "Ben de gelmek istiyorum."],
      ["very", "çok", "This soup is very good.", "Bu çorba çok iyi."],
      ["quite", "oldukça", "The test was quite easy.", "Test oldukça kolaydı."],
      ["maybe", "belki", "Maybe we can go tomorrow.", "Belki yarın gidebiliriz."],
      ["so", "bu yüzden, o kadar", "It was late, so we went home.", "Geç olmuştu, bu yüzden eve gittik."],
      ["only", "sadece", "I have only one brother.", "Sadece bir erkek kardeşim var."],
    ],

    // Gün 26: Teknoloji
    26: [
      ["computer", "bilgisayar", "I use my computer every day.", "Bilgisayarımı her gün kullanırım."],
      ["internet", "internet", "The internet is down.", "İnternet çalışmıyor."],
      ["email", "e-posta", "I will send you an email.", "Sana bir e-posta göndereceğim."],
      ["message", "mesaj", "I got a message from my friend.", "Arkadaşımdan bir mesaj aldım."],
      ["website", "web sitesi", "Visit our website for more information.", "Daha fazla bilgi için web sitemizi ziyaret edin."],
      ["screen", "ekran", "The screen is too bright.", "Ekran çok parlak."],
      ["keyboard", "klavye", "My keyboard is broken.", "Klavyem bozuk."],
      ["password", "şifre", "Don't tell anyone your password.", "Şifreni kimseye söyleme."],
      ["camera", "fotoğraf makinesi, kamera", "She bought a new camera.", "Yeni bir fotoğraf makinesi aldı."],
      ["photo", "fotoğraf", "Can I take a photo?", "Bir fotoğraf çekebilir miyim?"],
      ["video", "video", "We watched a funny video.", "Komik bir video izledik."],
      ["game", "oyun", "This game is very popular.", "Bu oyun çok popüler."],
      ["program", "program", "This program is easy to use.", "Bu programı kullanmak kolay."],
      ["battery", "pil, batarya", "My phone battery is low.", "Telefonumun bataryası azaldı."],
      ["charger", "şarj aleti", "Do you have a phone charger?", "Telefon şarj aletin var mı?"],
      ["laptop", "dizüstü bilgisayar", "He works on his laptop.", "Dizüstü bilgisayarında çalışıyor."],
      ["tablet", "tablet", "My son plays on the tablet.", "Oğlum tablette oynuyor."],
      ["download", "indirmek", "You can download the app for free.", "Uygulamayı ücretsiz indirebilirsin."],
      ["online", "çevrimiçi", "I study English online.", "İngilizceyi çevrimiçi öğreniyorum."],
      ["search", "aramak (araştırmak)", "I search for information on the internet.", "İnternette bilgi ararım."],
    ],

    // Gün 27: Seyahat ve tatil
    27: [
      ["holiday", "tatil", "We are going on holiday next week.", "Gelecek hafta tatile gidiyoruz."],
      ["tourist", "turist", "Many tourists visit this city.", "Birçok turist bu şehri ziyaret ediyor."],
      ["passport", "pasaport", "Don't forget your passport.", "Pasaportunu unutma."],
      ["suitcase", "bavul", "My suitcase is very heavy.", "Bavulum çok ağır."],
      ["reservation", "rezervasyon", "I made a reservation for two.", "İki kişilik rezervasyon yaptım."],
      ["tour", "tur, gezi", "We took a tour of the old city.", "Eski şehirde bir tur attık."],
      ["guide", "rehber", "The guide told us about the history.", "Rehber bize tarihi anlattı."],
      ["souvenir", "hatıra eşyası", "I bought a souvenir for my mother.", "Annem için bir hatıra eşyası aldım."],
      ["camping", "kamp yapma", "We go camping every summer.", "Her yaz kamp yapmaya gideriz."],
      ["tent", "çadır", "We put up the tent near the lake.", "Çadırı gölün yanına kurduk."],
      ["flight", "uçuş", "Our flight is at six.", "Uçuşumuz altıda."],
      ["visa", "vize", "Do I need a visa for this country?", "Bu ülke için vizeye ihtiyacım var mı?"],
      ["border", "sınır (ülke)", "They crossed the border at night.", "Geceleyin sınırı geçtiler."],
      ["abroad", "yurt dışı", "She studied abroad for two years.", "İki yıl yurt dışında okudu."],
      ["foreign", "yabancı", "He speaks three foreign languages.", "Üç yabancı dil konuşuyor."],
      ["language", "dil", "English is an international language.", "İngilizce uluslararası bir dildir."],
      ["culture", "kültür", "I like learning about other cultures.", "Diğer kültürleri öğrenmeyi severim."],
      ["adventure", "macera", "The trip was a great adventure.", "Gezi büyük bir maceraydı."],
      ["destination", "varış noktası", "Our destination is Istanbul.", "Varış noktamız İstanbul."],
      ["luggage", "bagaj", "Where can I leave my luggage?", "Bagajımı nereye bırakabilirim?"],
    ],

    // Gün 28: Spor ve hobiler
    28: [
      ["football", "futbol", "My brother plays football every Sunday.", "Ağabeyim her pazar futbol oynar."],
      ["basketball", "basketbol", "Basketball is popular in schools.", "Basketbol okullarda popülerdir."],
      ["tennis", "tenis", "She plays tennis well.", "İyi tenis oynar."],
      ["team", "takım", "Our team won the match.", "Takımımız maçı kazandı."],
      ["player", "oyuncu, sporcu", "He is a very good player.", "O çok iyi bir oyuncu."],
      ["match", "maç", "The match starts at eight.", "Maç sekizde başlıyor."],
      ["goal", "gol; hedef", "He scored a great goal.", "Harika bir gol attı."],
      ["win", "kazanmak", "We want to win.", "Kazanmak istiyoruz."],
      ["hobby", "hobi", "Reading is my hobby.", "Okumak benim hobim."],
      ["ball", "top", "Throw me the ball.", "Topu bana at."],
      ["race", "yarış", "He won the race.", "Yarışı o kazandı."],
      ["coach", "antrenör", "The coach is very strict.", "Antrenör çok katı."],
      ["champion", "şampiyon", "She became the champion.", "Şampiyon oldu."],
      ["stadium", "stadyum", "The stadium is full of fans.", "Stadyum taraftarlarla dolu."],
      ["exercise", "egzersiz", "I do exercise every morning.", "Her sabah egzersiz yaparım."],
      ["gym", "spor salonu", "I go to the gym three times a week.", "Haftada üç kez spor salonuna giderim."],
      ["fishing", "balık tutma", "My father loves fishing.", "Babam balık tutmayı çok sever."],
      ["painting", "tablo; resim yapma", "This painting is very old.", "Bu tablo çok eski."],
      ["collection", "koleksiyon", "He has a large stamp collection.", "Büyük bir pul koleksiyonu var."],
      ["competition", "yarışma", "She won the singing competition.", "Şarkı yarışmasını kazandı."],
    ],

    // Gün 29: Günlük eşyalar
    29: [
      ["plate", "tabak", "Put the food on the plate.", "Yemeği tabağa koy."],
      ["cup", "fincan", "I want a cup of tea.", "Bir fincan çay istiyorum."],
      ["glass", "bardak; cam", "She drank a glass of milk.", "Bir bardak süt içti."],
      ["fork", "çatal", "I need a fork.", "Bir çatala ihtiyacım var."],
      ["knife", "bıçak", "Use a knife to cut the bread.", "Ekmeği kesmek için bıçak kullan."],
      ["spoon", "kaşık", "She stirred the soup with a spoon.", "Çorbayı kaşıkla karıştırdı."],
      ["bottle", "şişe", "Buy a bottle of water.", "Bir şişe su al."],
      ["bowl", "kase", "He ate a bowl of soup.", "Bir kase çorba yedi."],
      ["pot", "tencere; saksı", "The soup is in the pot.", "Çorba tencerede."],
      ["box", "kutu", "The gift is in the box.", "Hediye kutuda."],
      ["basket", "sepet", "She carried a basket of fruit.", "Bir sepet meyve taşıdı."],
      ["candle", "mum", "We lit a candle.", "Bir mum yaktık."],
      ["blanket", "battaniye", "Bring me a blanket, please.", "Bana bir battaniye getir lütfen."],
      ["pillow", "yastık", "I need a soft pillow.", "Yumuşak bir yastığa ihtiyacım var."],
      ["toy", "oyuncak", "The child has a new toy.", "Çocuğun yeni bir oyuncağı var."],
      ["rope", "ip, halat", "He tied the boat with a rope.", "Tekneyi bir iple bağladı."],
      ["ladder", "el merdiveni", "He climbed the ladder.", "El merdivenine tırmandı."],
      ["bucket", "kova", "Fill the bucket with water.", "Kovayı suyla doldur."],
      ["envelope", "zarf", "Put the letter in the envelope.", "Mektubu zarfa koy."],
      ["coin", "madeni para", "He found a coin on the street.", "Sokakta bir madeni para buldu."],
    ],

    // Gün 30: Toplum ve devlet
    30: [
      ["country", "ülke", "Turkey is a beautiful country.", "Türkiye güzel bir ülke."],
      ["government", "hükümet", "The government announced a new plan.", "Hükümet yeni bir plan açıkladı."],
      ["president", "başkan, cumhurbaşkanı", "The president gave a speech.", "Başkan bir konuşma yaptı."],
      ["law", "yasa, hukuk", "Everyone must follow the law.", "Herkes yasaya uymalı."],
      ["army", "ordu", "The army protects the country.", "Ordu ülkeyi korur."],
      ["war", "savaş", "The war ended in 1945.", "Savaş 1945'te sona erdi."],
      ["peace", "barış", "We all want peace.", "Hepimiz barış istiyoruz."],
      ["vote", "oy vermek; oy", "Every citizen can vote.", "Her vatandaş oy verebilir."],
      ["election", "seçim", "The election is next month.", "Seçim gelecek ay."],
      ["citizen", "vatandaş", "She became a citizen last year.", "Geçen yıl vatandaş oldu."],
      ["flag", "bayrak", "The flag is red and white.", "Bayrak kırmızı ve beyaz."],
      ["nation", "ulus, millet", "The whole nation was proud.", "Bütün millet gururluydu."],
      ["king", "kral", "The king lived in a big castle.", "Kral büyük bir kalede yaşadı."],
      ["queen", "kraliçe", "The queen waved to the people.", "Kraliçe halka el salladı."],
      ["tax", "vergi", "We pay tax every year.", "Her yıl vergi öderiz."],
      ["rule", "kural", "Please follow the rules.", "Lütfen kurallara uyun."],
      ["freedom", "özgürlük", "Everyone loves freedom.", "Herkes özgürlüğü sever."],
      ["justice", "adalet", "Everyone wants justice.", "Herkes adalet ister."],
      ["crime", "suç", "Crime is rare in this town.", "Bu kasabada suç nadirdir."],
      ["prison", "hapishane", "He spent two years in prison.", "Hapishanede iki yıl geçirdi."],
    ],
  };

  // Kelime satırlarını uygulamanın kullandığı nesnelere dönüştür.
  const data = {};
  Object.keys(RAW).forEach((day) => {
    data[day] = RAW[day].map(([word, meaning, example, exampleTr]) => ({
      word, meaning, example, exampleTr
    }));
  });
  window.WORDS_DATA = data;
})();

const WORDS_BY_DAY = window.WORDS_DATA;

/** Bir günün kelime listesini döndürür. Veri yoksa boş dizi. */
function getWordsForDay(day) {
  return WORDS_BY_DAY[day] || [];
}

/* ---------- 3. İlerleme (localStorage) ---------- */

/** Kayıtlı ilerlemeyi okur. Bozuk/hatalı veri varsa güvenli şekilde 0'dan başlar. */
function loadProgress() {
  try {
    const raw = localStorage.getItem(CONFIG.storageKey);
    const days = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(days)) return 0;

    // Günler ardışık olmalı: 1, 2, 3... kesintisiz devam ettiği kadarını say
    const set = new Set(days);
    let count = 0;
    while (count < CONFIG.totalDays && set.has(count + 1)) count++;
    return count;
  } catch (err) {
    return 0;
  }
}

/** İlerlemeyi tamamlanan günlerin listesi olarak kaydeder: [1, 2, 3] */
function saveProgress() {
  try {
    const days = Array.from({ length: state.completedCount }, (_, i) => i + 1);
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(days));
  } catch (err) {
    // Gizli sekme / dolu depolama: uygulama çalışmaya devam eder, sadece kaydedilmez
    console.warn('İlerleme kaydedilemedi:', err);
  }
}

/** Bir günü tamamlandı yapar. Sadece sıradaki (aktif) gün tamamlanabilir. */
function completeDay(day) {
  if (getDayStatus(day) !== 'active') return false;
  state.completedCount = day;            // bir sonraki günün kilidi de otomatik açılır
  saveProgress();
  render();
  return true;
}

/** Tüm ilerlemeyi siler. */
function resetProgress() {
  state.completedCount = 0;
  try { localStorage.removeItem(CONFIG.storageKey); } catch (err) { /* yoksay */ }
  render();
  window.scrollTo({ top: 0 });
}

/* ---------- 4. Gün durumu hesaplama ---------- */

/** Bir günün durumunu döndürür: 'done' | 'active' | 'locked' */
function getDayStatus(day) {
  if (day <= state.completedCount) return 'done';
  if (day === state.completedCount + 1) return 'active';
  return 'locked';
}

/** Günün kelime aralığı. Gün 1: 1-20, Gün 2: 21-40 ... */
function getWordRange(day) {
  const start = (day - 1) * CONFIG.wordsPerDay + 1;
  const end = day * CONFIG.wordsPerDay;
  return { start, end };
}

/* ---------- 5. Harita çizimi ---------- */

// Küçük SVG ikonları (ekstra dosya/kütüphane gerekmez)
const ICONS = {
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
};

/** Tek bir gün dairesi (buton) oluşturur. */
function createDayButton(day) {
  const status = getDayStatus(day);
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `day day--${status}`;
  btn.dataset.day = String(day);

  const label = document.createElement('span');
  label.textContent = String(day);
  btn.appendChild(label);

  if (status === 'locked') {
    btn.disabled = true;                              // tıklanamaz
    btn.setAttribute('aria-label', `Gün ${day}, kilitli`);
    btn.insertAdjacentHTML('beforeend', `<span class="day__badge">${ICONS.lock}</span>`);
  } else if (status === 'done') {
    btn.setAttribute('aria-label', `Gün ${day}, tamamlandı`);
    btn.insertAdjacentHTML('beforeend', `<span class="day__badge">${ICONS.check}</span>`);
  } else {
    btn.setAttribute('aria-label', `Gün ${day}, çalışmaya hazır`);
    btn.setAttribute('aria-current', 'step');
  }
  return btn;
}

/** 50 daireyi yeniden oluşturur. */
function renderDays() {
  els.list.textContent = '';
  const fragment = document.createDocumentFragment();

  for (let day = 1; day <= CONFIG.totalDays; day++) {
    const li = document.createElement('li');
    li.className = 'roadmap__item';
    // Sinüs dalgası: yol sağa-sola kıvrılır (-1 ile 1 arası değer)
    li.style.setProperty('--shift', Math.sin(day * 0.9).toFixed(3));
    li.appendChild(createDayButton(day));
    fragment.appendChild(li);
  }
  els.list.appendChild(fragment);
}

/** Daireleri birleştiren yolları SVG ile çizer. Tamamlanan yollar yeşil olur. */
function drawRoads() {
  const buttons = els.list.querySelectorAll('.day');
  const box = els.roadmap.getBoundingClientRect();
  const SVG_NS = 'http://www.w3.org/2000/svg';

  els.lines.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
  els.lines.textContent = '';

  // Her dairenin merkezi (roadmap kutusuna göre)
  const centers = Array.from(buttons, (btn) => {
    const r = btn.getBoundingClientRect();
    return { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2 };
  });

  for (let i = 0; i < centers.length - 1; i++) {
    const a = centers[i];
    const b = centers[i + 1];
    const midY = (a.y + b.y) / 2;

    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', `M ${a.x} ${a.y} C ${a.x} ${midY}, ${b.x} ${midY}, ${b.x} ${b.y}`);
    path.setAttribute('class', 'road');
    // i. gün tamamlandıysa (i+1 sayılı gün numarası) ona çıkan yol yeşil
    if (i + 1 <= state.completedCount) path.classList.add('road--done');
    els.lines.appendChild(path);
  }
}

/** Üstteki ilerleme çubuğunu ve sayıları günceller. */
function renderProgress() {
  const done = state.completedCount;
  const percent = (done / CONFIG.totalDays) * 100;

  els.progressFill.style.width = `${percent}%`;
  els.progressBar.setAttribute('aria-valuenow', String(done));
  els.daysDone.textContent = String(done);
  els.wordsDone.textContent = String(done * CONFIG.wordsPerDay);
}

/** Tüm arayüzü mevcut duruma göre çizer. */
function render() {
  renderDays();
  renderProgress();
  drawRoads();
}

/** Aktif günü ekranın ortasına getirir. */
function scrollToActiveDay() {
  const target = els.list.querySelector('.day--active') || els.list.querySelector('.day--done:last-of-type');
  if (!target || state.completedCount === 0) return;   // 1. günde zaten en üstteyiz
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
}

/* ---------- 6. Seslendirme (Web Speech API + akıllı ses seçici) ----------
   Tarayıcının yerleşik window.speechSynthesis özelliği kullanılır.
   Dış kütüphane veya MP3 dosyası yoktur.

   Önemli: Hangi seslerin bulunduğu tarayıcıya ve işletim sistemine bağlıdır.
   Kod, mevcut sesler arasından en kaliteli olanı puanlayarak seçer;
   ancak cihazda iyi bir ses yüklü değilse sonuç yine de sınırlı kalır. */

// Ses adına göre puanlar: yüksek puan = daha doğal ses
const VOICE_PREFERENCES = [
  { test: /natural/i,                score: 100 },  // Edge: "Microsoft Aria Online (Natural)" vb.
  { test: /google (us|uk) english/i,  score: 90 },   // Chrome: "Google US English", "Google UK English Female"
  { test: /premium|enhanced/i,        score: 80 },   // Apple: indirilmiş yüksek kaliteli sesler
  { test: /siri/i,                    score: 75 },
  { test: /samantha/i,                score: 70 },   // macOS / iOS (en-US)
  { test: /daniel/i,                  score: 65 },   // macOS / iOS (en-GB)
  { test: /karen/i,                   score: 60 },   // macOS / iOS (en-AU)
  { test: /microsoft/i,               score: 40 }    // Windows yerel sesleri (Zira, David...)
];

// Kaçınılacak sesler: robotik / yenilik amaçlı sesler (macOS "Albert", "Zarvox" gibi)
const VOICE_BLOCKLIST =
  /\b(espeak|compact|albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|fred|junior|kathy|ralph)\b/i;

const speech = {
  supported: 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window,
  accent: 'us',                           // 'us' | 'uk'
  voice: null,                            // şu an seçili ses
  current: null                           // o an okunan utterance (yarış durumlarını engellemek için)
};

/** 'en_US' / 'en-us' gibi yazımları 'en-us' biçimine getirir. */
function normLang(lang) {
  return (lang || '').replace('_', '-').toLowerCase();
}

/** Bir sesin kalite puanını hesaplar. */
function scoreVoice(voice) {
  if (VOICE_BLOCKLIST.test(voice.name)) return -200;
  let best = 0;
  for (const pref of VOICE_PREFERENCES) {
    if (pref.test.test(voice.name)) best = Math.max(best, pref.score);
  }
  return best;
}

/** Seçilen aksana en uygun sesi bulur. Katmanlı arama: tam aksan -> en-US/en-GB -> herhangi bir İngilizce. */
function selectVoice(accent) {
  const wanted = normLang(ACCENTS[accent].lang);
  const english = window.speechSynthesis.getVoices().filter((v) => normLang(v.lang).startsWith('en'));
  if (english.length === 0) return null;

  const tiers = [
    english.filter((v) => normLang(v.lang) === wanted),
    english.filter((v) => ['en-us', 'en-gb'].includes(normLang(v.lang))),
    english
  ];

  for (const tier of tiers) {
    if (tier.length === 0) continue;
    return tier.reduce((best, v) => (scoreVoice(v) > scoreVoice(best) ? v : best));
  }
  return null;
}

/** Sesi yeniden seçer ve ses butonlarının ipucu yazısını günceller. */
function refreshVoice() {
  if (!speech.supported) return;
  speech.voice = selectVoice(speech.accent);

  const hint = speech.voice
    ? `Seçilen ses: ${speech.voice.name} (${speech.voice.lang})`
    : 'Tarayıcının varsayılan sesi kullanılacak';
  [els.speakWord, els.speakExample, els.speakQuiz].forEach((btn) => { btn.title = hint; });
}

/** Sesler tarayıcıda asenkron yüklenir; hepsini kapsayacak şekilde dinler. */
function initVoices() {
  if (!speech.supported) {
    [els.speakWord, els.speakExample, els.speakQuiz].forEach((btn) => {
      btn.disabled = true;
      btn.title = 'Tarayıcın seslendirmeyi desteklemiyor.';
    });
    return;
  }

  refreshVoice();

  // 1) Standart olay: sesler yüklenince / değişince
  if (typeof window.speechSynthesis.addEventListener === 'function') {
    window.speechSynthesis.addEventListener('voiceschanged', refreshVoice);
  } else {
    window.speechSynthesis.onvoiceschanged = refreshVoice;
  }

  // 2) Yedek: bazı tarayıcılar (ör. Safari) olayı hiç göndermez; kısa süre yoklama yap
  let tries = 0;
  const timer = setInterval(() => {
    refreshVoice();
    tries++;
    if (speech.voice || tries >= 10) clearInterval(timer);
  }, 300);
}

/** Tüm ses butonlarındaki "çalıyor" görünümünü kaldırır. */
function clearSpeakingState() {
  document.querySelectorAll('.speak.is-speaking').forEach((b) => b.classList.remove('is-speaking'));
}

/** Verilen İngilizce metni okur. btn: çalarken vurgulanacak buton. */
function speak(text, btn) {
  if (!speech.supported || !text) return;
  const synth = window.speechSynthesis;

  const start = () => {
    if (!speech.voice) refreshVoice();    // sesler geç yüklendiyse son bir deneme

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = ACCENTS[speech.accent].lang;
    utterance.rate = CONFIG.speech.rate;
    utterance.pitch = CONFIG.speech.pitch;
    utterance.volume = CONFIG.speech.volume;
    if (speech.voice) utterance.voice = speech.voice;

    utterance.onstart = () => { if (speech.current === utterance && btn) btn.classList.add('is-speaking'); };
    // Eski (iptal edilen) okumanın bitişi yenisinin görünümünü bozmasın
    utterance.onend = utterance.onerror = () => { if (speech.current === utterance && btn) btn.classList.remove('is-speaking'); };

    speech.current = utterance;
    synth.speak(utterance);
  };

  clearSpeakingState();
  if (synth.speaking || synth.pending) {
    synth.cancel();
    setTimeout(start, 60);               // cancel() hemen ardından speak() bazı tarayıcılarda sesi yutuyor
  } else {
    start();
  }
}

/** Okumayı tamamen durdurur (kart değişince / pencere kapanınca). */
function stopSpeaking() {
  if (!speech.supported) return;
  speech.current = null;
  window.speechSynthesis.cancel();
  clearSpeakingState();
}

/** Aksan seçimini kaydedilmiş değerden yükler. */
function loadAccent() {
  try {
    const saved = localStorage.getItem(CONFIG.accentKey);
    if (saved && ACCENTS[saved]) speech.accent = saved;
  } catch (err) { /* yoksay */ }
  syncAccentButtons();
}

/** Aksan düğmelerinin basılı görünümünü günceller. */
function syncAccentButtons() {
  els.accentBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.accent === speech.accent)));
}

/** Aksanı değiştirir, kaydeder ve yeni sesi kısa bir örnekle duyurur. */
function setAccent(accent) {
  if (!ACCENTS[accent] || accent === speech.accent) return;
  speech.accent = accent;
  try { localStorage.setItem(CONFIG.accentKey, accent); } catch (err) { /* yoksay */ }
  syncAccentButtons();
  refreshVoice();
  if (study.words.length) speak(study.words[study.index].word, els.speakWord);
}

/* ---------- 7. Modal görünümleri (Çalışma / Sınav / Sonuç) ---------- */

/** Rozet metnini ve rengini ayarlar. kind: '' | 'done' | 'fail' */
function setBadge(text, kind = '') {
  els.modalBadge.textContent = text;
  els.modalBadge.classList.toggle('modal__badge--done', kind === 'done');
  els.modalBadge.classList.toggle('modal__badge--fail', kind === 'fail');
}

/** Çalışma görünümündeki başlık bilgilerini (rozet + kelime aralığı) yazar. */
function setStudyHeader() {
  const status = getDayStatus(study.day);
  const { start, end } = getWordRange(study.day);
  setBadge(status === 'done' ? 'Tamamlandı' : 'Bugünün görevi', status === 'done' ? 'done' : '');
  els.modalRange.textContent = `Kelime ${start} - ${end}`;
}

/** Üç görünümden yalnızca birini gösterir: 'study' | 'quiz' | 'result' */
function setView(name) {
  els.studyView.hidden = name !== 'study';
  els.quizView.hidden = name !== 'quiz';
  els.resultView.hidden = name !== 'result';
  els.modal.scrollTop = 0;
}

/* ---------- 8. Kelime çalışma paneli (kart slider) ---------- */

/** Mevcut karta göre içeriği, sayacı ve gezinme düğmelerini günceller. */
function renderCard() {
  const total = study.words.length;
  const item = study.words[study.index];

  els.cardWord.textContent = item.word;
  els.cardMeaning.textContent = item.meaning;
  els.cardExample.textContent = item.example;
  els.cardExampleTr.textContent = item.exampleTr;

  els.studyCounter.textContent = `${study.index + 1} / ${total}`;
  els.studyFill.style.width = `${((study.index + 1) / total) * 100}%`;

  els.prevBtn.disabled = study.index === 0;
  els.nextBtn.disabled = study.index === total - 1;

  // Kart geçiş animasyonunu yeniden başlat
  els.card.style.animation = 'none';
  void els.card.offsetWidth;             // yeniden hesaplamayı zorla
  els.card.style.animation = '';
}

/** Kartı değiştirir. step: +1 (sonraki) veya -1 (önceki). */
function goToCard(step) {
  const next = study.index + step;
  if (next < 0 || next >= study.words.length) return;
  stopSpeaking();
  study.index = next;
  renderCard();
}

/** Seçilen günün çalışma penceresini açar. */
function openModal(day) {
  const status = getDayStatus(day);
  if (status === 'locked') return;                    // güvenlik: kilitli gün açılamaz

  study.day = day;
  study.index = 0;
  study.words = getWordsForDay(day);

  els.modalTitle.textContent = `Gün ${day}`;
  setStudyHeader();
  setView('study');

  // Kelime verisi varsa kartları göster, yoksa bilgi mesajı
  const hasWords = study.words.length > 0;
  els.study.hidden = !hasWords;
  els.studyEmpty.hidden = hasWords;
  els.quizBtn.disabled = !hasWords;
  if (hasWords) renderCard();

  // Test düğmesi: sadece test modunda ve aktif günde görünür
  els.modalComplete.hidden = !(TEST_MODE && status === 'active');

  els.modal.showModal();
}

function closeModal() {
  els.modal.close();                                  // 'close' olayı konuşmayı da durdurur
}

/* ---------- 9. Sınav (quiz) modülü ---------- */

/** Diziyi karıştırır (Fisher-Yates) ve yeni bir dizi döndürür. */
function shuffle(array) {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Tek bir kelime için 4 şıklı soru üretir.
    direction: 'en-tr' (İngilizce sor, Türkçe şıklar) | 'tr-en' (Türkçe sor, İngilizce şıklar) */
function buildQuestion(item, direction, day) {
  const field = direction === 'en-tr' ? 'meaning' : 'word';
  const correctText = item[field];

  // Yanlış şıklar önce aynı günün kelimelerinden, yetmezse diğer günlerden seçilir
  const own = getWordsForDay(day);
  const others = Object.keys(WORDS_BY_DAY)
    .filter((d) => Number(d) !== day)
    .flatMap((d) => WORDS_BY_DAY[d]);
  const pool = [...shuffle(own), ...shuffle(others)];

  const seen = new Set([correctText.toLowerCase()]);
  const distractors = [];
  for (const w of pool) {
    const text = w[field];
    if (w === item || seen.has(text.toLowerCase())) continue;   // aynı/yinelenen şıkları ele
    seen.add(text.toLowerCase());
    distractors.push(text);
    if (distractors.length === 3) break;
  }

  const options = shuffle([correctText, ...distractors]);
  return {
    item,
    direction,
    prompt: direction === 'en-tr' ? item.word : item.meaning,
    options,
    answerIndex: options.indexOf(correctText),
    answerText: correctText
  };
}

/** Sınavı başlatır: o günün tüm kelimelerinden karışık sorular üretir. */
function startQuiz() {
  const day = study.day;
  const words = getWordsForDay(day);
  if (words.length === 0) return;

  stopSpeaking();
  quiz.questions = shuffle(words).map((w) => buildQuestion(w, Math.random() < 0.5 ? 'en-tr' : 'tr-en', day));
  quiz.index = 0;
  quiz.correct = 0;
  quiz.answered = false;
  quiz.wrong = [];
  quiz.need = Math.ceil((words.length * CONFIG.passPercent) / 100);   // tam sayı işlemi: kayan nokta hatası yok

  setBadge('Sınav');
  els.modalRange.textContent = `Geçmek için en az ${quiz.need} / ${words.length} doğru`;
  setView('quiz');
  renderQuestion();
}

/** Mevcut soruyu ekrana çizer. */
function renderQuestion() {
  const q = quiz.questions[quiz.index];
  const total = quiz.questions.length;
  const isEnToTr = q.direction === 'en-tr';

  quiz.answered = false;

  els.quizCounter.textContent = `Soru ${quiz.index + 1} / ${total}`;
  els.quizFill.style.width = `${(quiz.index / total) * 100}%`;
  els.quizScore.textContent = `Doğru: ${quiz.correct}`;

  els.quizDir.textContent = isEnToTr
    ? 'İngilizce → Türkçe: Bu kelimenin anlamı nedir?'
    : 'Türkçe → İngilizce: Bu anlamın İngilizcesi hangisi?';
  els.quizPrompt.textContent = q.prompt;
  els.quizPrompt.lang = isEnToTr ? 'en' : 'tr';
  els.speakQuiz.hidden = !isEnToTr;                   // sadece İngilizce kelime sorulunca telaffuz butonu

  // Şıkları oluştur
  els.quizOptions.textContent = '';
  q.options.forEach((text, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'option';
    btn.dataset.index = String(i);
    btn.lang = isEnToTr ? 'tr' : 'en';

    const key = document.createElement('span');
    key.className = 'option__key';
    key.textContent = 'ABCD'[i];
    key.setAttribute('aria-hidden', 'true');

    const label = document.createElement('span');
    label.textContent = text;

    btn.append(key, label);
    els.quizOptions.appendChild(btn);
  });

  els.quizFeedback.textContent = '';
  els.quizFeedback.className = 'quiz__feedback';
  els.quizNext.hidden = true;
}

/** Bir şık seçildiğinde: anında doğru/yanlış gösterir. */
function answerQuestion(chosenIndex) {
  if (quiz.answered) return;
  quiz.answered = true;

  const q = quiz.questions[quiz.index];
  const isCorrect = chosenIndex === q.answerIndex;
  const buttons = els.quizOptions.querySelectorAll('.option');

  buttons.forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.answerIndex) btn.classList.add('option--correct');
    else if (i === chosenIndex) btn.classList.add('option--wrong');
    else btn.classList.add('option--dim');
  });

  if (isCorrect) {
    quiz.correct++;
    els.quizFeedback.textContent = 'Doğru!';
    els.quizFeedback.classList.add('is-correct');
  } else {
    quiz.wrong.push(q.item);
    els.quizFeedback.textContent = `Yanlış. Doğru cevap: ${q.answerText}`;
    els.quizFeedback.classList.add('is-wrong');
  }

  els.quizScore.textContent = `Doğru: ${quiz.correct}`;
  const isLast = quiz.index === quiz.questions.length - 1;
  els.quizNext.textContent = isLast ? 'Sonucu gör' : 'Sonraki soru';
  els.quizNext.hidden = false;
  els.quizNext.focus();                               // klavye ile hızlı ilerleme için
}

/** Sonraki soruya geçer veya sınavı bitirir. */
function nextQuestion() {
  stopSpeaking();
  quiz.index++;
  if (quiz.index >= quiz.questions.length) finishQuiz();
  else renderQuestion();
}

/** Sınav bitti: skoru hesaplar, başarılıysa günü tamamlar ve sonuç ekranını gösterir. */
function finishQuiz() {
  const total = quiz.questions.length;
  const percent = Math.round((quiz.correct / total) * 100);
  const passed = quiz.correct >= quiz.need;
  const day = study.day;

  // Başarılıysa günü tamamla (kaydet + sonraki günün kilidini aç). Zaten tamamlanmış günlerde bir şey değişmez.
  const justUnlocked = passed ? completeDay(day) : false;

  els.resultBox.classList.toggle('result--fail', !passed);
  els.resultRing.style.setProperty('--pct', String(percent));
  els.resultPct.textContent = `%${percent}`;
  els.resultFrac.textContent = `${quiz.correct} / ${total}`;

  if (passed) {
    setBadge('Başarılı', 'done');
    els.resultTitle.textContent = 'Tebrikler, günü geçtin!';
    if (!justUnlocked) {
      els.resultText.textContent = 'Bu günü daha önce tamamlamıştın. Tekrar yapmak kalıcı öğrenmeye yardım eder.';
    } else if (day < CONFIG.totalDays) {
      els.resultText.textContent = `Gün ${day} tamamlandı ve Gün ${day + 1} artık açık.`;
    } else {
      els.resultText.textContent = '50 günü tamamladın ve 1000 kelimeyi bitirdin. Harika iş!';
    }
    configureResultButtons('Haritaya Dön', 'close', 'Kelimelere Göz At', 'study');
  } else {
    setBadge('Tekrar dene', 'fail');
    els.resultTitle.textContent = 'Biraz daha çalışalım';
    els.resultText.textContent =
      `Geçmek için en az ${quiz.need} doğru gerekiyor, sen ${quiz.correct} doğru yaptın.`;
    configureResultButtons('Tekrar Dene', 'retry', 'Kelimelere Geri Dön', 'study');
  }
  els.modalRange.textContent = `Gün ${day} sınavı`;

  // Yanlış yapılan kelimeler
  els.resultWrongList.textContent = '';
  els.resultWrong.hidden = quiz.wrong.length === 0;
  quiz.wrong.forEach((item) => {
    const li = document.createElement('li');
    const strong = document.createElement('strong');
    strong.textContent = item.word;
    li.append(strong, ` — ${item.meaning}`);
    els.resultWrongList.appendChild(li);
  });

  setView('result');
}

/** Sonuç ekranındaki iki düğmenin metnini ve yapacağı işi ayarlar. */
function configureResultButtons(primaryText, primaryAction, secondaryText, secondaryAction) {
  els.resultPrimary.textContent = primaryText;
  els.resultPrimary.dataset.action = primaryAction;
  els.resultSecondary.textContent = secondaryText;
  els.resultSecondary.dataset.action = secondaryAction;
}

/** Sonuç ekranı düğmelerinin işlemleri. */
function handleResultAction(action) {
  if (action === 'retry') {
    startQuiz();
  } else if (action === 'study') {
    setStudyHeader();
    setView('study');
  } else if (action === 'close') {
    closeModal();
    scrollToActiveDay();                               // yeni açılan günü göster
  }
}

/* ---------- 10. Olaylar ve başlatma ---------- */

function bindEvents() {
  // Olay delegasyonu: 50 daire için tek dinleyici yeterli
  els.list.addEventListener('click', (event) => {
    const btn = event.target.closest('.day');
    if (btn) openModal(Number(btn.dataset.day));
  });

  // Kart gezinme
  els.prevBtn.addEventListener('click', () => goToCard(-1));
  els.nextBtn.addEventListener('click', () => goToCard(1));

  // Klavye: çalışmada sol/sağ ok, sınavda 1-4 tuşları
  els.modal.addEventListener('keydown', (event) => {
    if (!els.studyView.hidden && !els.study.hidden) {
      if (event.key === 'ArrowRight') goToCard(1);
      if (event.key === 'ArrowLeft') goToCard(-1);
    } else if (!els.quizView.hidden && ['1', '2', '3', '4'].includes(event.key)) {
      answerQuestion(Number(event.key) - 1);
    }
  });

  // Seslendirme: kelime, örnek cümle ve sınav sorusu
  els.speakWord.addEventListener('click', () => speak(study.words[study.index].word, els.speakWord));
  els.speakExample.addEventListener('click', () => speak(study.words[study.index].example, els.speakExample));
  els.speakQuiz.addEventListener('click', () => speak(quiz.questions[quiz.index].item.word, els.speakQuiz));

  // Aksan seçimi (US / UK)
  els.accentBtns.forEach((btn) => btn.addEventListener('click', () => setAccent(btn.dataset.accent)));

  // Sınav akışı
  els.quizBtn.addEventListener('click', startQuiz);
  els.quizOptions.addEventListener('click', (event) => {
    const btn = event.target.closest('.option');
    if (btn) answerQuestion(Number(btn.dataset.index));
  });
  els.quizNext.addEventListener('click', nextQuestion);
  els.resultPrimary.addEventListener('click', () => handleResultAction(els.resultPrimary.dataset.action));
  els.resultSecondary.addEventListener('click', () => handleResultAction(els.resultSecondary.dataset.action));

  // Test modu düğmesi: günü sınavsız tamamla
  els.modalComplete.addEventListener('click', () => {
    if (study.day !== null) completeDay(study.day);
    closeModal();
  });

  // Pencereyi kapatma yolları
  els.modalClose.addEventListener('click', closeModal);
  els.modal.addEventListener('click', (event) => {
    if (event.target === els.modal) closeModal();     // arka plana tıklama
  });
  els.modal.addEventListener('close', () => {         // X, Esc, arka plan: hepsinde çalışır
    stopSpeaking();
    study.day = null;
  });

  els.resetBtn.addEventListener('click', () => {
    if (confirm('Tüm ilerleme silinecek. Emin misin?')) resetProgress();
  });

  // Ekran boyutu değişince yolların konumunu yeniden hesapla
  if ('ResizeObserver' in window) {
    new ResizeObserver(drawRoads).observe(els.roadmap);
  } else {
    window.addEventListener('resize', drawRoads);
  }
}

function init() {
  state.completedCount = loadProgress();
  render();
  loadAccent();
  initVoices();
  bindEvents();
  scrollToActiveDay();
}

init();
