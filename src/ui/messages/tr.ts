/**
 * Turkish messages, same shape as the English ones. Gamer terms players use
 * as they are (sens, flick, tracking, DPI, FOV, cm/360) stay untranslated.
 */
import type { Messages } from './en'
import { esc, num } from './html'

type Kind = 'flick' | 'tracking' | 'full'

const kindNames = { flick: 'flick', tracking: 'tracking', full: 'tam test' }
const pct = (value: string | number) => `%${value}`

export const tr: Messages = {
  meta: {
    title: 'aimtune · fare hassasiyeti bulucu',
    howTitle: 'Nasıl çalışır · aimtune',
  },

  common: {
    copy: 'Kopyala',
    copied: 'Kopyalandı',
    copyFailed: 'Kopyalanamadı',
    copiedLive: 'Panoya kopyalandı',
    lockError: (message: string) => `Fare kilitlenemedi: ${message}`,
    loadError: (message: string) => `Test yüklenemedi: ${message}. Bağlantını kontrol edip tekrar dene.`,
    helpAbout: (label: string) => `${label} nedir?`,
    percent: pct,
  },

  header: {
    nav: 'Ana menü',
    test: 'Test',
    how: 'Nasıl çalışır',
    language: 'Dil',
  },

  promo: {
    aria: (label: string, text: string) => `${label}: ${text} (yeni sekmede açılır)`,
    hide: (days: number) => `${days} gün boyunca gizle`,
  },

  footer: {
    local: 'Hiçbir veri tarayıcından dışarı çıkmaz.',
    notAffiliated: 'Hiçbir oyun yayıncısıyla bağlantılı değildir. Oyun adları sahiplerine aittir.',
  },

  setup: {
    heroTitle: 'Elinin gerçekten sevdiği sensi bul.',
    heroSub:
      'Tarayıcında kısa bir flick testi, yaklaşık 2 dakika. Nasıl nişan aldığını ölçer ve tek bir sihirli sayı yerine bir aralık önerir; iki testin birleşimi daha sağlam bir sonuç verir. Fare gerekir.',
    kindLabel: 'Test',
    kindHelp: 'test türleri',
    tags: { recommended: 'önerilen', experimental: 'deneysel' },
    kinds: {
      flick: { name: 'Flick testi', desc: 'Hedeflere hızlıca dön · ~2 dk' },
      full: { name: 'Tam test', desc: 'Önce flick, sonra tracking · ~4,5 dk' },
      tracking: { name: 'Sadece tracking', desc: 'Hareketli hedefi takip et · ~3 dk' },
    },
    styleLabel: 'Oyunun daha çok neyi istiyor?',
    styleHelp: 'bölümlerin ağırlığı',
    styles: {
      flicks: { name: 'Çoğunlukla flick', examples: 'ör. Valorant, CS2, Rainbow Six Siege' },
      both: { name: 'İkisi de', examples: 'ör. Fortnite, Call of Duty, Deadlock' },
      tracking: { name: 'Çoğunlukla tracking', examples: 'ör. Apex Legends, Overwatch 2' },
    },
    weights: (flick: number, tracking: number) => `${pct(flick)} flick · ${pct(tracking)} tracking`,
    styleNote:
      'Genelde taktik nişancı oyunları flick’i, hızlı hero ve battle royale oyunları tracking’i ödüllendirir. Karar senin: gerçekte nasıl oynadığına göre seç.',
    help: {
      kind: 'Flick testi: beliren hedeflere hızlıca dön, her birine bir kez tıkla. En net ölçüm budur; iki testin birleşimi tek uzun bir testten iyidir. Tam test ve tracking hareketli bir hedef ekler; denemelerde tracking çoğu zaman sens ayarlarını birbirinden ayıramadı (tepki süresi küçük farkları gizliyor), bu yüzden deneysel olarak işaretli.',
      style:
        'Her bölüm kendi en iyi aralığını bulur; sonuç ikisinin ağırlıklı ortalamasıdır (sens oransal hissedildiği için logaritmik ölçekte). Tracking tek başına sensi daha az hassas ölçtüğü için flick en az %35 ağırlıkta kalır, tracking de ancak mesafeleri ayırt edebildiği kadar sayılır. Oyun örnekleri sadece tahmin: gerçekte nasıl oynuyorsan onu seç.',
      game: 'Ana oyunun. Görüş alanını (FOV) ayarlar, böylece hedefler o oyunda görüneceği yerde çıkar; sonucu da o oyunun sensine çevirir.',
      sens: 'Şu an gerçekten oynadığın fare hassasiyeti, oyunda göründüğü gibi. Yeni bir değeri oyunda denemeden burada değiştirme: test, elinin alıştığı yerden başlamalı.',
      dpi: 'Farenin inç başına sayımı; farenin kendi yazılımında ayarlanır (genelde 400, 800 veya 1600). Oyun içi hassasiyet değildir.',
      distance: 'Tam bir 360° dönüş için fareyi ne kadar kaydırdığın. yawmatch bunu oyun içi sensinden hesaplayabilir.',
      fov: 'Oyununun görüntü ayarlarındaki FOV değeri, oyunun kendi biriminde. Oyunun varsayılanı için boş bırak.',
    },
    gameLabel: 'Oyun',
    gameHelp: 'oyun ayarı',
    chooseGame: 'Oyununu seç',
    otherGame: (unit: string) => `Diğer: ${unit} değerimi biliyorum`,
    gamesError: (error: string, unit: string) =>
      `Oyun listesi yüklenemedi (${error}). “Diğer” ile ${unit} değerini yine de girebilirsin.`,
    currentDistance: (unit: string) => `Şu anki ${unit}`,
    sensLabel: 'Oyun içi sens',
    sensHelp: 'oyun içi sens',
    dpiLabel: 'DPI',
    dpiHelp: 'DPI',
    fovLabel: 'Oyun içi FOV (isteğe bağlı)',
    fovHelp: 'oyun içi FOV',
    fovDefault: (value: number | null) => (value === null ? 'varsayılan' : `varsayılan ${value}`),
    fovUnknown: 'Bu oyunun FOV değeri bilinmiyor: kendi değerini girmezsen tipik 70° dikey kullanılır.',
    fovFixedHtml: (game: string, value: number, horizontal43: boolean) =>
      `${esc(game)} oyununda sabit: ${num(value)}${horizontal43 ? ' (4:3 yatay)' : ''}.`,
    unitsLabel: 'Mesafe birimi',
    unitsAria: 'Mesafe birimi',
    typo: (distance: string, unit: string) => `Bu ${distance} ${unit} ediyor; yazım hatası gibi görünüyor.`,
    rulerCurrent: (distance: string, unit: string) => `Şu anki mesafen: ${distance} ${unit}`,
    rulerUnset: 'Şu anki mesafen girilmedi',
    startsAroundHtml: (range: string) => `Test şu anki mesafenin çevresinden başlar: ${num(range)}.`,
    coversHtml: (range: string) => `Şu anki sensin olmadan test şu aralığı tarar: ${num(range)}.`,
    checks: {
      aria: 'Tarayıcı kontrolleri',
      mouseOk: 'Fare algılandı',
      mouseMissing: 'Fare algılanmadı. Test için fare gerekir.',
      lockOk: 'İmleç kilidi destekleniyor',
      lockMissing: 'Bu tarayıcı fareyi kilitleyemiyor. Chrome, Edge veya Firefox dene.',
      rawUnchecked: 'Ham girdi (raw input) henüz kontrol edilmedi.',
      rawCheck: 'Kontrol et',
      rawYes: 'Ham girdi açık: işletim sisteminin fare ivmesi devre dışı.',
      rawNo: 'Bu tarayıcıda ham girdi yok. “İşaretçi hassasiyetini artır” (Windows) seçeneğini veya fare ivmesini kapat; yoksa sonuçlar kayabilir.',
      rawUnknown:
        'Bu tarayıcı ham girdiyi doğrulayamıyor (Firefox ve Safari bu isteği yok sayıyor), bu yüzden Windows fare ayarları sonuçlarını etkileyebilir. En doğru test için Chrome veya Edge kullan ya da “İşaretçi hassasiyetini artır” seçeneğini kapatıp Windows işaretçi hızını 6/11’de bırak.',
      fpsMeasuring: 'Kare hızı ölçülüyor…',
      fpsOkHtml: (fps: string) => `${num(fps)} fps`,
      fpsLowHtml: (fps: string) =>
        `Sadece ${num(fps)} fps. Daha akıcı flick’ler için diğer sekmeleri kapat ya da dizüstünü şarja tak.`,
    },
    phoneTitle: 'Fareli bir bilgisayar kullan',
    phoneText: 'Flick testi için fare ve klavye gerekir. Testi yapmak için bu sayfayı bilgisayarında aç.',
    start: 'Testi başlat',
    chooseTip: 'İpucu: sonucu oyununun sensiyle görmek için oyununu seç.',
  },

  calibration: {
    title: 'Fare kalibrasyonu',
    optional: '(isteğe bağlı, 30 sn)',
    correctionOnHtml: (value: number, fewer: boolean) =>
      `Düzeltme açık: bu tarayıcı DPI değerinden ${num(pct(value))} ${fewer ? 'daha az' : 'daha fazla'} sayım bildiriyor; test bunu telafi ediyor.`,
    checked: 'Kontrol edildi: bu tarayıcı fareni girdiğin DPI ile okuyor.',
    intro:
      'Tarayıcının fareni girdiğin DPI ile okuyup okumadığını kontrol eder. Firefox veya Safari kullanıyorsan ya da DPI değerinden emin değilsen yapmaya değer.',
    redo: 'Yeniden yap',
    calibrate: 'Kalibre et',
    stepsHtml: [
      'Mousepad’ine bir A4 kâğıdı koy, uzun kenarı soldan sağa gelsin (ya da uzunluğunu bildiğin herhangi bir şey).',
      'Farenin sol kenarını kâğıdın sol kenarıyla hizala.',
      '<strong>Başlat</strong>’a tıkla, fareyi sol kenarı kâğıdın sağ kenarına gelene kadar yavaşça sağa kaydır, sonra tıkla.',
    ],
    distance: 'Mesafe (cm)',
    counts: (n: number) => `${n} sayım`,
    slideHint: 'sağa kaydır, sonra tıkla',
    start: 'Başlat',
    matchHtml: (measured: string, dpi: number) =>
      `Ölçülen: inç başına ${num(measured)} sayım. ${num(dpi)} DPI ile uyuşuyor; düzeltme gerekmez.`,
    offHtml: (measured: string, value: number, fewer: boolean, dpi: number) =>
      `Ölçülen: inç başına ${num(measured)} sayım; ${num(dpi)} DPI’ın vermesi gerekenden yaklaşık ${num(pct(value))} ${fewer ? 'daha az' : 'daha fazla'}. Olası nedenler: ekran ölçekleme, Windows işaretçi hızı ya da girdiğinden farklı bir DPI. Kullanmadan önce iki kez ölç.`,
    useCorrection: 'Düzeltmeyi kullan',
    measureAgain: 'Tekrar ölç',
    bad: 'Bu doğru görünmüyor (fare kaldırılmış olabilir). Yavaşça kaydırarak tekrar dene.',
    remove: 'Kalibrasyonu kaldır',
    close: 'Kapat',
  },

  bias: {
    flick: { plus: 'hedefi geçme', minus: 'kısa kalma', both: 'geçme/kısa kalma eğilimin' },
    tracking: { plus: 'önde', minus: 'geride', both: 'önde/geride kalma eğilimin' },
  },

  results: {
    eyebrow: (own: boolean, kind: Kind) => (own ? `Senin ${kindNames[kind]} sonucun` : `Paylaşılan ${kindNames[kind]} sonucu`),
    sweetSpot: 'İdeal aralığın:',
    insideHtml: (current: string) => `Şu anki ${num(current)} değerin zaten bu aralığın içinde.`,
    outsideHtml: (current: string, below: boolean) =>
      `Şu anki ${num(current)} değerin bu aralıktan ${below ? 'kısa' : 'uzun'}; ${below ? 'biraz daha düşük' : 'biraz daha yüksek'} bir sens sana uygun olabilir.`,
    rulerSummary: (lo: string, hi: string, unit: string, current: string | null) =>
      `Önerilen: 360° başına ${lo}–${hi} ${unit}${current !== null ? `, şu anki ${current}` : ''}`,
    markerYou: (d: string) => `sen · ${d}`,
    markerFlicks: (d: string) => `flick · ${d}`,
    markerTracking: (d: string) => `tracking · ${d}`,
    blendTitle: 'Nasıl birleştirildi',
    flickPart: 'Flick bölümü',
    trackingPart: 'Tracking bölümü',
    weighting: 'Ağırlık',
    byStyle: 'nişan tarzına göre',
    applied: 'uygulanan',
    blendNote: (decidedPct: number | null) =>
      `Her bölüm kendi aralığını buldu; sonuç ikisinin logaritmik ölçekte ağırlıklı ortalaması. Tracking ancak mesafeleri ayırt edebildiği kadar sayılır${decidedPct !== null ? `: bu sefer turlarının ${pct(decidedPct)} kadarında karar verebildi` : ''}.`,
    leanUnknown:
      'Tracking bölümü bu sefer mesafeleri ayırt edemedi: bir hedefi takip ederken tepki süresi küçük sens farklarını gizler. Sonuç flick’lerine dayanıyor.',
    leanShorterHtml:
      'Tek başına tracking daha <strong>kısa</strong> bir mesafeyi (daha yüksek sens) gösterdi. Oyununda tracking seçtiğinden daha önemliyse aralığın alt ucuna yakın dur.',
    leanLongerHtml:
      'Tek başına tracking daha <strong>uzun</strong> bir mesafeyi (daha düşük sens) gösterdi. Oyununda tracking seçtiğinden daha önemliyse aralığın üst ucuna yakın dur.',
    leanSame: 'Flick ve tracking aşağı yukarı aynı mesafeyi gösterdi.',
    edgeTitle: (high: boolean) => `En iyi mesafen test edilen aralığın ${high ? 'üstünde' : 'altında'} olabilir`,
    edgeText: (high: boolean) =>
      `Test sürekli ${high ? 'daha uzun mesafeleri (daha düşük sens)' : 'daha kısa mesafeleri (daha yüksek sens)'} gösterdi.`,
    edgeRetest: 'O uca odaklanan ikinci bir test ötesine bakabilir.',
    edgeShared: 'Daha ileriye bakmak için testi kendi sensinden başlayarak kendin yap.',
    edgeButton: (high: boolean) =>
      high ? 'Daha uzun mesafeleri test et (daha düşük sens)' : 'Daha kısa mesafeleri test et (daha yüksek sens)',
    sensInHtml: (game: string, dpi: string) => `${esc(game)}, ${num(dpi)} DPI ile`,
    middleHtml: (sens: string) => `Aralığın ortası: ${num(sens)}`,
    copySens: (sens: string) => `${sens} sens değerini kopyala`,
    pickGame: 'Bunu oyun içi sens olarak görmek için bir dahaki sefere kurulum ekranında oyununu seç.',
    honestyTitle: 'Kısa bir tarayıcı testi, son söz değil',
    honestyText: (kind: Kind) =>
      `Tek bir doğru hassasiyet yoktur. Bu aralık, tarayıcıda, bu kare hızında, birkaç dakikalık ${kind === 'tracking' ? 'tracking' : kind === 'full' ? 'flick ve tracking' : 'flick'} sırasında en tutarlı olduğun yer. Karar vermeden önce ortasını birkaç oturum oyunda dene.`,
    honestyTracking:
      'Tracking tercihi genelde flick’ten daha geniştir, bu yüzden bu aralık daha geniş; flick testi onu daha da daraltır.',
    convert: 'Diğer oyunlara çevir',
    save: 'Profile kaydet',
    saved: 'Profile kaydedildi',
    retest: 'Tekrar test et',
    changeSettings: 'Ayarları değiştir',
    takeYourself: 'Testi kendin yap',
    copyLink: 'Sonuç linkini kopyala',
    feedbackAsk: 'Oyunda denedin mi?',
    feedbackLink: 'Doğru olup olmadığını bize söyle',
    feedbackNote: '(GitHub’da önceden doldurulmuş bir form açar; sen gönderene kadar hiçbir şey gönderilmez)',
    savedAsHtml: (game: string, sens: string) =>
      `${esc(game)} sensi ${num(sens)} olarak kaydedildi. yawmatch ve buradaki bir sonraki test bu değerden başlayacak.`,
    saveFailed: 'Kaydedilemedi: tarayıcın yerel depolamayı engelliyor.',
  },

  chart: {
    flickTitle: 'Turlara göre hedefi geçme ve kısa kalma',
    trackingTitle: 'Turlara göre hedefin önünde ve gerisinde kalma',
    tooLow: (word: string) => `${word} (sens düşük)`,
    tooHigh: (word: string) => `${word} (sens yüksek)`,
    headers: ['Tur', 'Mesafe', 'Ortalama hata'],
    flickWhat: 'flick yönündeki ortalama sapma, flick’in büyüklüğüne oranla',
    trackingWhat: 'hedefin hareket yönündeki ortalama öne geçme ya da geride kalma, hızına oranla',
    note: (what: string) => `Kalın satırlar kendi turunda daha iyi puan aldı. Değerler: ${what}.`,
  },

  round: {
    done: (n: number) => `${n}. tur bitti`,
    summary: 'Bu turda test edilen iki mesafe, şimdiye kadar taranan aralığın içinde',
    better: 'daha iyi',
    scoredBetterHtml: (distance: string, byBias: string | null) =>
      `${num(distance)} daha iyi puan aldı${byBias !== null ? ` (puanlar yakındı, bu yüzden ${esc(byBias)} belirledi)` : ''}.`,
    sameTracking: 'İki mesafe de aşağı yukarı aynı puanı aldı, bu yüzden aralık şimdilik aynı kalıyor.',
    same: 'İki mesafe de aşağı yukarı aynı puanı aldı.',
  },

  ab: {
    title: 'Hisle karşılaştır',
    options: { current: 'Şu anki', recommended: 'Önerilen', faster: 'Hızlı uç', slower: 'Yavaş uç' },
    preferredHtml: (name: string, distance: string, blind: boolean) =>
      `<strong>${esc(name)}</strong> ayarını tercih ettin (${num(distance)})${blind ? '; hangisinin hangisi olduğunu bilmeden' : ''}.`,
    noDifference: 'Belirgin bir fark hissetmedin, yani ikisi de olur. Alışkanlıklarına daha yakın olanı seç.',
    headers: ['Seçenek', 'Mesafe', 'Süre', 'İsabet'],
    contextNote: 'İsabet sayıları sadece bilgi için: asıl cevap nasıl hissettirdiği.',
    introHtml: (a: string, b: string) =>
      `Sabit ve hareketli hedeflere serbestçe nişan al, <kbd>Space</kbd> ile iki ayar arasında geçiş yap: ${num(a)} ve ${num(b)}. Sonra daha iyi hissettireni seç.`,
    needsDpi: 'DPI değerin gerekli: karşılaştırmak için testi kendin yap.',
    needsMouse: 'Fareli bir bilgisayar gerekir.',
    blind: 'Kör test: seçene kadar hangisinin hangisi olduğunu gizle',
    again: 'Tekrar karşılaştır',
    start: 'A/B testini başlat',
  },

  history: {
    title: 'Son sonuçların',
    thisRun: 'Bu test',
    kinds: { flick: 'Flick', full: 'Tam', tracking: 'Tracking' },
    yesterday: 'dün',
    daysAgo: (days: number) => `${days} gün önce`,
    combined: (runs: number) => `Birleşik (${runs} test)`,
    middle: (distance: string) => `orta ${distance}`,
    agreeHtml: (value: number) =>
      `Bu testler birbirine ${num(pct(value))} içinde uyuyor, yani birleşik aralık daha sağlam cevap. Tek bir test yerine onu kullan.`,
    differHtml: (value: number) =>
      `Testlerin arasında ${num(pct(value))} fark var. Kısa bir test her seferinde biraz oynar; bir test daha hangi yöne oturduğunu gösterir. Birleşik aralık bu yüzden daha geniş.`,
    kept: 'Sadece bu tarayıcıda tutulur; iki haftadan eski testler birleştirilmez.',
    clear: 'Geçmişi temizle',
  },

  test: {
    partFlick: 'Bölüm 1/2 · Flick',
    partTracking: 'Bölüm 2/2 · Tracking',
    returnToDot: 'Beyaz noktaya dön',
    restOnTarget: 'Nişangâhını hedefin üzerinde tut',
    warmup: 'Isınma',
    hudRound: (round: number, rounds: number) => `Tur ${round}/${rounds}`,
    hudShot: (shot: number, shots: number) => `Atış ${shot}/${shots}`,
    hudTrial: (trial: number, trials: number) => `Deneme ${trial}/${trials}`,
    roundOf: (round: number, rounds: number) => `Tur ${round}/${rounds}`,
    warmupFlick: 'Birkaç alıştırma atışı, puanlanmaz.',
    warmupTracking: 'Birkaç alıştırma denemesi, puanlanmaz.',
    repeatFlick: 'Bu blok tekrarlanıyor: çok fazla atış ıskalandı ya da çok yavaştı.',
    repeatTracking: 'Bu blok tekrarlanıyor: hedef çok sık kaçırıldı.',
    flickHowTo: 'Beyaz noktaya nişan al. Sarı bir hedef belirince ona flick at ve bir kez tıkla. Sonra noktaya geri dön.',
    trackingSteps: [
      'Nişangâhını ortadaki sarı hedefin üzerine getir.',
      'Biraz sonra hareket etmeye başlar. Nişangâhını 3 saniye boyunca üzerinde tut.',
      'Tıklamak gerekmez. Sonra bir sonraki deneme için ortaya döner.',
    ],
    clickToStart: 'Başlamak için tıkla',
    lockAndStart: 'Fareyi kilitle ve başla',
    viewLine: (fov: string, raw: 'yes' | 'no' | 'unknown') =>
      `Görüş ${fov}° yatay · ham girdi: ${raw === 'yes' ? 'açık' : raw === 'no' ? 'kapalı (sistem ayarları sonuçları etkileyebilir)' : 'bilinmiyor'}`,
    clickToContinue: 'Devam etmek için tıkla',
    paused: 'Duraklatıldı',
    trackingPaused: 'Yarım kalan deneme silindi; ortadan yeniden başlar.',
    resume: 'Devam et',
    restart: 'Baştan başla',
    quit: 'Çık',
  },

  abTest: {
    option: (label: string) => `Seçenek ${label}`,
    keysHtml: '<kbd>Space</kbd> A / B geçişi · <kbd>Esc</kbd> seç',
    bothTried: 'İkisi de denendi: seçmeye hazır olduğunda Esc’ye bas',
    tryEach: (seconds: number) => `Her birini ${seconds} sn dene`,
    stepsHtml: (seconds: number) => [
      'Bazıları sabit, bazıları hareketli sarı hedeflere nişan al. Ateş etmek için tıkla.',
      '<strong>A</strong> ile <strong>B</strong> arasında geçmek için istediğin kadar <kbd>Space</kbd>’e bas.',
      `Her birini en az ${seconds} saniye denedikten sonra <kbd>Esc</kbd>’ye bas ve daha iyi hissettireni seç. Süre sınırı yok.`,
    ],
    blindNote: 'Kör test: hangisinin hangisi olduğunu seçtikten sonra göreceksin.',
    whichBetter: 'Hangisi daha iyi hissettirdi?',
    tryFirst: (seconds: number, a: string, b: string) =>
      `Önce her birini en az ${seconds} saniye dene. Şu ana kadar: A ${a}, B ${b}.`,
    noDifference: 'Fark yok',
    keepComparing: 'Karşılaştırmaya devam et',
  },

  how: {
    title: 'Nasıl çalışır',
    lead: 'aimtune farklı hassasiyetlerde nasıl flick attığını ölçer ve en tutarlı olduğun aralığı gösterir. Senin için mükemmel sensi bilmez; kimse bilmez.',
    distance: {
      title: 'Sayı değil, mesafe',
      text: [
        'Her oyunun kendi sens ölçeği var, bu yüzden test, tam bir 360° dönüş için farenin kat ettiği mesafeyle (cm/360) çalışır. Aynı mesafe her oyunda aynı hissettirir. Sonuç oyununun sensine sadece en sonda çevrilir; bunun için ',
        ' ile aynı hesap kullanılır.',
      ],
    },
    flick: {
      title: 'Flick testi',
      steps: [
        'Beyaz bir noktaya nişan alırsın. Kısa, rastgele bir beklemeden sonra ekranda bir yerde sarı bir hedef belirir.',
        'Ona flick atıp bir kez tıklarsın. Test, hedefi ne kadar geçtiğini (overshoot) ya da ne kadar kısa kaldığını (undershoot), yana ne kadar saptığını ve ne kadar sürdüğünü kaydeder.',
        'Noktaya geri dönersin ve sıradaki hedef belirir.',
      ],
      paras: [
        'Hedeflerin yaklaşık üçte biri 4–15° uzaklıkta küçük düzeltmelerdir: çoğu nişancı oyununda birçok çatışma, nişangâh düşmana zaten yakınken başlar. Küçük bir düzeltmedeki küçük bir ıska adil değerlendirilir, çünkü kimsenin eli yaklaşık bir dereceden daha hassas değildir.',
        'Kamera oyununun görüş alanını kullanır, böylece hedefler oyunda görüneceği yerde çıkar.',
      ],
    },
    narrowing: {
      title: 'Aralığı daraltma',
      paras: [
        'Puanlanmayan birkaç ısınma atışından sonra her tur, mevcut aralığın içinde iki mesafeyi sekizer flick ile test eder. Sonraki tur daha iyi olanı merkeze alır ve aralığın yaklaşık üçte ikisini, kaybeden taraftan da biraz tutarak korur; böylece şanssız bir tur sonradan telafi edilebilir. Altı tur, aralığı yaklaşık 3 kat genişlikten birkaç yüzdeye indirir.',
        'Atışlar çoğunlukla flick’in büyüklüğüne oranla isabete göre, hız da daha küçük bir etken olarak puanlanır. İki mesafe aşağı yukarı aynı puanı alırsa hedefi geçme ya da kısa kalma eğilimin karar verir: sürekli geçmek sensin fazla yüksek, kısa kalmak fazla düşük olduğunu gösterir.',
        'Son aralık asla ±%5’ten dar olmaz ve flick’lerin tutarsızsa genişler; böylece sonuç olduğundan daha kesin görünmez.',
      ],
    },
    tracking: {
      title: 'Tracking testi',
      paras: [
        'Bazı nişanlar flick değil, kovalamacadır. Tracking testinde ortada bir hedef durur; nişangâhını üzerine getirince yumuşak, değişen bir yolda beş saniye boyunca yavaşça hızlanarak hareket eder. Test her karede ondan ne kadar uzak olduğunu, önünde mi (sens seni fazla götürüyor) yoksa gerisinde mi (fazla yavaş) olduğunu ölçer. Her denemenin ilk yarım saniyesi puanlanmaz: o kısım sensten çok tepki süresini ölçer.',
        'Tracking, sens konusunda flick’ten daha hoşgörülüdür: yakın mesafeler neredeyse aynı puanı alır ve tepki süresi herkesi biraz geride bırakır. Bu yüzden turlar sadece puana göre belirlenir; iki mesafeyi ayırt edemeyen bir tur aralığı olduğu gibi bırakır. Flick testinden daha geniş bir aralık bekle; birçok oyuncu ikisinin arasında bir yere yerleşir.',
      ],
    },
    history: {
      title: 'Tek test her şeyi söylemez',
      paras: [
        'Tarayıcıda birkaç dakikalık bir test, bir seferden diğerine yüzde birkaç oynar: ısınma, dikkatin dağıldığı bir blok, şanslı bir tur. Site son sonuçlarını bu tarayıcıda hatırlar ve son iki haftadan en fazla üçünü tek bir aralıkta birleştirir. Aralarında %15’ten fazla fark varsa bunu söyler ve bir test daha önerir. Birleştirilmiş iki flick testi, tek bir uzun testten daha değerlidir.',
      ],
    },
    full: {
      title: 'Tam test (deneysel)',
      paras: [
        'Tam test tracking ekler: önce bir flick bölümü, sonra bir tracking bölümü, toplamda yaklaşık dört buçuk dakika. Her bölüm kendi aralığını bulur, sonuç da ikisinin ağırlıklı ortalamasıdır. Ağırlıkları oyununun nasıl oynandığına göre sen seçersin: çoğunlukla flick (%85 flick, %15 tracking), ikisi de (60/40) ya da çoğunlukla tracking (35/65).',
        'Neden tek bir ortak puan değil? Dörtte bir sapmış bir sens flick’leri mahveder ama tracking’e sadece yüzde birkaça mal olur; yani ne seçersen seç her seferinde flick’ler karar verirdi. İki sonucun ortalamasını almak senin seçimini önemli kılar. Tracking tek başına sensi daha az hassas ölçtüğü için flick en az %35 ağırlıkta kalır.',
        'Tracking ayrıca ancak mesafeleri gerçekten ayırt edebildiği kadar sayılır. Tepki süresi herkesi hareketli bir hedefin biraz gerisinde bırakır, bu da küçük sens farklarını gizler; bu yüzden bir tracking turu çoğu zaman kararsız biter. Turlarının yarısı kararsız kaldıysa tracking ağırlığının yarısını alır; hiçbiri karar vermediyse sonuç flick’lerine dayanır. Sonuç sayfası uygulanan ağırlıkları gösterir ve bunu açıkça söyler. Şu ana kadarki gerçek testlerde tracking bölümü nadiren bir şeye karar verebildi; önerilen testin flick testi olmasının nedeni bu.',
      ],
    },
    ab: {
      title: 'Hisle karşılaştır',
      textHtml:
        'Sayılar her şey değil. Sonuç sayfasından bir A/B testi başlatabilirsin: sabit ve hareketli hedeflere serbestçe nişan al, iki ayar arasında geçmek için <kbd>Space</kbd>’e bas; genelde biri şu anki ayarın, diğeri önerilen aralığın ortasıdır. Kör testte sen seçene kadar sadece A ve B diye anılırlar, böylece beklentilerin senin yerine karar vermez. İsabetler bilgi için sayılır, ama sonuç senin seçimindir.',
    },
    limits: {
      title: 'Neyi söyleyemez',
      items: [
        'Tarayıcıda birkaç dakika bir maç değildir. Yorgunluk, ısınma ve oyunun kendisi nişan alışını değiştirir.',
        'Ham girdi yoksa tarayıcılar işletim sisteminin fare ivmesini uygulayabilir. Test için kapat.',
        'Düşük kare hızı flick’leri takılgan ve daha az isabetli yapar.',
        'Flick bir beceridir. Hareketli bir hedefi takip etmek farklı bir sensi öne çıkarabilir.',
      ],
      outro: 'Sonucu bir başlangıç noktası olarak gör: aralığın ortasıyla birkaç oturum oyna, sonra karar ver.',
    },
    privacy: {
      title: 'Gizlilik',
      text: 'Her şey tarayıcında çalışır ve sonuçların hiçbir yere yüklenmez. Sayfa ziyaretleri GoatCounter ile çerezsiz ve kişisel veri olmadan anonim olarak sayılır. Tarayıcının yerel depolaması birim ve dil seçimini, son on sonucunu (testler birleştirilebilsin diye), yaptıysan fare kalibrasyonunu ve kaydedersen profilini tutar. Sonuç linki sayıları adresin kendisinde taşır; GitHub’daki geri bildirim formu da sadece orada gönderdiklerini paylaşır.',
    },
    cta: 'Teste başla',
  },
}
