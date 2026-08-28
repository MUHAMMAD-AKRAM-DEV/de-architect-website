/* ============================================================================
   DE Architects — the studio assistant
   ----------------------------------------------------------------------------
   Answers the questions people actually arrive with — what it costs, how long
   it takes, what the studio does, how to start — and hands over to a person
   for anything else.

   WHERE THE ANSWERS COME FROM
   Almost nothing is written twice. The assistant quotes the site's own copy:
   the FAQ answers, the service names, the opening hours, the project list. All
   of that is already translated, so the assistant speaks whichever language the
   visitor picked without a second set of translations to maintain.

   NO API KEY LIVES HERE, AND NONE EVER SHOULD
   This runs entirely in the browser, so anything written into this file is
   public. If you want a real language model behind it, put the key on a server
   you control and point the assistant at that server:

       <script>window.DE_CHAT_ENDPOINT = 'https://your-host/api/chat';</script>

   It will POST { messages: [{role, content}...] } and read back { reply }.
   With no endpoint set it stays local, which is the default and costs nothing.

   WHAT IT WILL NOT DO
   It does not claim to be a person. Asked directly, it says what it is and
   offers a human — a studio that is honest about its fees should not open the
   conversation with a small lie.
   ========================================================================== */
(() => {
  const C = () => window.DE_CHAT_COPY || {};
  const T = s => (window.DELang ? window.DELang.t(s) : s);
  const c = k => T(C()[k] || '');

  const STORE = 'de-chat';
  const ENDPOINT = () => window.DE_CHAT_ENDPOINT || '';

  /* --- site copy the assistant quotes, by its English source ------------- */
  const SITE = {
    fees:    'Fees are a fixed sum per stage, not a percentage of a moving construction cost. We quote after the first meeting, once we know the size and the scope. Small interior projects usually start in the low thousands; a whole house is a percentage-of-build conversation we will have openly.',
    time:    'Design runs six to twelve weeks for an interior, three to five months for a house. Permissions add eight to sixteen weeks and are outside anyone&rsquo;s control. Construction depends on your builder, but we will give you a realistic programme rather than an optimistic one.',
    small:   'Yes. One reimagined room is a real project if the thinking is worth doing, and some of our best work has been the smallest. If the job genuinely does not need an architect we will tell you that instead of taking the fee.',
    builder: 'Happily. We can also run a tender and get you three comparable prices, which is usually worth more than the fee it costs. If you have nobody yet, we will suggest contractors we have worked with before — we take no commission from them.',
    permit:  'We prepare and submit the whole application and deal with the case officer through to the decision. We will also tell you honestly, at the first meeting, how likely it is to be granted.',
    visuals: 'That is a service on its own. Send us your drawings — from us or from anyone else — and we will model them and produce stills, an animation or a browser tour you can send to a client or a lender.',
    free:    'Yes &mdash; one meeting, on site or at the studio, with no charge and nothing to sign. If you then want a written feasibility note before committing to a full project, that is a small fixed fee we deduct from the design fee later.',
    bring:   'Photographs, any drawings or deeds you have, and a list of what annoys you about the place today. That last one is usually the most useful document in the room.',
    budget:  'No, but a rough range helps enormously. It is the difference between us sketching something you can afford and something you cannot, and nobody enjoys the second conversation.',
    away:    'Regularly. Travel is charged at cost and agreed up front. For projects far enough away that weekly site visits are not sensible, we set up a schedule of key inspections instead and are honest about it from the start.',
    jobs:    'Fourteen of us, and the average stay is over five years. We take one or two students each summer and give them real drawings to do, not coffee runs. If you want to work here, send us three pieces of work you are proud of and tell us why.',
    process: 'Every project runs the same way. You always know which stage you are in, what is being decided, and what it costs before it starts.',
    addr1:   '24 Foundry Lane<br>Design District',
    addr2:   '9 Meridian Court<br>Riverside'
  };
  const SERVICES = ['Residential Architecture', 'Interior Design', 'Commercial &amp; Workspaces',
                    'Renovation &amp; Restoration', 'Landscape &amp; Exteriors', '3D Visualisation'];
  const HOURS = ['<span>Monday &ndash; Thursday</span><b>09:00 &ndash; 18:00</b>',
                 '<span>Friday</span><b>09:00 &ndash; 16:00</b>',
                 '<span>Saturday</span><b>By appointment</b>',
                 '<span>Sunday</span><b>Closed</b>'];

  // the quoted strings carry the site's inline markup; the bubbles want plain text
  const plain = html => {
    const d = document.createElement('div');
    d.innerHTML = String(html).replace(/<\/(b|span)>/gi, ' ').replace(/<br\s*\/?>/gi, ', ');
    return (d.textContent || '').replace(/\s+/g, ' ').trim();
  };
  const site = k => plain(T(SITE[k]));

  /* --- matching -----------------------------------------------------------
     Keyword scoring rather than anything clever. Each intent lists the words
     people actually type, in the six languages the site speaks, and the intent
     with the most hits wins. It is blunt, but it fails in an obvious way and
     never needs a network call. */
  const INTENTS = [
    { id: 'fees', words: ['cost', 'price', 'fee', 'charge', 'expensive', 'budget', 'quote', 'afford', 'money',
        'kosten', 'preis', 'honorar', 'teuer', 'budget',
        'prix', 'tarif', 'coût', 'cout', 'honoraires',
        'precio', 'coste', 'honorarios', 'presupuesto', 'cuesta', 'cobran', 'cobra', 'cobrar',
        'سعر', 'تكلفة', 'أتعاب', 'ميزانية', 'تتقاضون', 'تكلف', 'رسوم', 'كم التكلفة',
        'قیمت', 'لاگت', 'فیس', 'بجٹ', 'کتنے', 'پیسے', 'معاوضہ'] },
    { id: 'time', words: ['long', 'time', 'duration', 'weeks', 'months', 'when', 'timescale', 'timeline', 'quick', 'fast',
        'lange', 'dauer', 'wochen', 'monate', 'zeit',
        'temps', 'durée', 'duree', 'semaines', 'mois', 'combien de temps',
        'tiempo', 'tarda', 'semanas', 'meses', 'plazo',
        'وقت', 'مدة', 'أسابيع', 'أشهر', 'يستغرق',
        'وقت', 'دورانیہ', 'ہفتے', 'مہینے', 'کتنا'] },
    { id: 'services', words: ['service', 'services', 'do you do', 'offer', 'what do you do', 'help with', 'specialise', 'specialize',
        'leistung', 'leistungen', 'angebot', 'machen', 'macht', 'anbieten', 'bieten',
        'prestation', 'prestations', 'services', 'proposez', 'faites', 'faire',
        'servicio', 'servicios', 'ofrecen', 'hacen', 'hacéis', 'haceis',
        'خدمات', 'خدمة', 'تقدمون', 'ماذا',
        'خدمات', 'خدمت', 'کیا کرتے'] },
    { id: 'start', words: ['start', 'begin', 'hire', 'engage', 'appoint', 'work with', 'get going', 'commission', 'brief',
        'beginnen', 'starten', 'beauftragen',
        'commencer', 'démarrer', 'demarrer', 'engager', 'lancer', 'lance',
        'empezar', 'comenzar', 'contratar', 'iniciar',
        'ابدأ', 'نبدأ', 'تعاقد', 'كيف أبدأ',
        'شروع', 'آغاز', 'کیسے شروع'] },
    { id: 'work', words: ['project', 'projects', 'portfolio', 'work', 'examples', 'case', 'built', 'see your', 'gallery', 'tour', '3d',
        'projekt', 'projekte', 'arbeiten', 'referenzen',
        'projet', 'projets', 'réalisations', 'realisations',
        'proyecto', 'proyectos', 'trabajos', 'obra',
        'مشروع', 'مشاريع', 'أعمال', 'جولة',
        'منصوبہ', 'منصوبے', 'کام', 'سیر'] },
    { id: 'where', words: ['where', 'location', 'address', 'based', 'office', 'studio', 'visit', 'come in', 'find you',
        'wo', 'adresse', 'standort', 'büro', 'buro',
        'où', 'ou etes', 'adresse', 'bureau', 'situé',
        'dónde', 'donde', 'dirección', 'direccion', 'oficina', 'ubicados',
        'أين', 'عنوان', 'مكتب', 'موقع',
        'کہاں', 'پتہ', 'دفتر'] },
    { id: 'hours', words: ['hours', 'open', 'opening', 'closed', 'weekend', 'saturday', 'sunday',
        'öffnungszeiten', 'offnungszeiten', 'geöffnet', 'geoffnet',
        'horaires', 'ouvert', 'fermé', 'ferme',
        'horario', 'abierto', 'cerrado', 'sábado', 'sabado',
        'ساعات', 'مفتوح', 'مغلق', 'دوام',
        'اوقات', 'کھلا', 'بند'] },
    { id: 'contact', words: ['contact', 'email', 'phone', 'call', 'reach', 'speak', 'talk to', 'human', 'someone', 'person',
        'kontakt', 'anrufen', 'telefon', 'sprechen',
        'contacter', 'téléphone', 'telephone', 'appeler', 'joindre',
        'contacto', 'teléfono', 'telefono', 'llamar', 'hablar',
        'اتصال', 'هاتف', 'بريد', 'تواصل', 'أتحدث',
        'رابطہ', 'فون', 'ای میل', 'بات'] },
    { id: 'permit', words: ['planning', 'permission', 'permit', 'consent', 'council', 'approval', 'authority',
        'genehmigung', 'baugenehmigung', 'bauantrag',
        'permis', 'autorisation', 'urbanisme',
        'licencia', 'permiso', 'ayuntamiento',
        'ترخيص', 'رخصة', 'موافقة', 'بلدية',
        'منظوری', 'اجازت', 'لائسنس'] },
    { id: 'small', words: ['small', 'tiny', 'one room', 'single room', 'little', 'minor', 'just a',
        'klein', 'kleines', 'ein zimmer',
        'petit', 'petite', 'une pièce', 'une piece',
        'pequeño', 'pequeno', 'una habitación', 'una habitacion',
        'صغير', 'غرفة واحدة', 'بسيط',
        'چھوٹا', 'ایک کمرہ'] },
    { id: 'builder', words: ['builder', 'contractor', 'tender', 'construction company', 'my own',
        'bauunternehmer', 'handwerker', 'ausschreibung',
        'entreprise', 'constructeur', 'artisan',
        'constructor', 'contratista', 'obra',
        'مقاول', 'منافسة', 'شركة بناء',
        'ٹھیکیدار', 'ٹینڈر'] },
    { id: 'visuals', words: ['render', 'renders', 'visual', 'visualisation', 'visualization', '3d only', 'images only', 'animation', 'walkthrough',
        'rendering', 'visualisierung',
        'rendu', 'rendus', 'visualisation',
        'render', 'renders', 'visualización', 'visualizacion',
        'تصور', 'مشاهد', 'صور ثلاثية',
        'منظرکشی', 'تھری ڈی'] },
    { id: 'free', words: ['free', 'no charge', 'gratis', 'first meeting', 'consultation', 'obligation',
        'kostenlos', 'unverbindlich', 'erstgespräch', 'erstgesprach',
        'gratuit', 'sans frais', 'premier rendez',
        'gratis', 'gratuita', 'primera reunión', 'primera reunion',
        'مجاني', 'بلا مقابل', 'اللقاء الأول',
        'مفت', 'پہلی ملاقات'] },
    { id: 'bring', words: ['bring', 'prepare', 'need from me', 'what should i', 'documents',
        'mitbringen', 'vorbereiten', 'unterlagen',
        'apporter', 'préparer', 'preparer', 'documents',
        'llevar', 'preparar', 'documentos',
        'أحضر', 'أجهز', 'وثائق',
        'لاؤں', 'تیاری', 'کاغذات'] },
    { id: 'away', words: ['abroad', 'other city', 'far', 'travel', 'distance', 'outside', 'remote',
        'ausland', 'andere stadt', 'entfernt', 'reise',
        'étranger', 'etranger', 'autre ville', 'loin', 'déplacement',
        'extranjero', 'otra ciudad', 'lejos', 'viaje',
        'خارج', 'مدينة أخرى', 'بعيد', 'سفر',
        'باہر', 'دوسرا شہر', 'دور', 'سفر'] },
    { id: 'jobs', words: ['job', 'jobs', 'career', 'careers', 'hiring', 'internship', 'work for you', 'vacancy', 'cv', 'portfolio review',
        'stelle', 'karriere', 'praktikum', 'bewerbung',
        'emploi', 'carrière', 'carriere', 'stage', 'recrutement',
        'empleo', 'trabajo', 'prácticas', 'practicas', 'vacante',
        'وظيفة', 'وظائف', 'تدريب', 'توظيف',
        'نوکری', 'ملازمت', 'تربیت'] },
    { id: 'process', words: ['process', 'how does it work', 'stages', 'steps', 'what happens',
        'ablauf', 'prozess', 'phasen', 'schritte',
        'processus', 'étapes', 'etapes', 'déroule',
        'proceso', 'etapas', 'pasos', 'cómo funciona', 'como funciona',
        'مراحل', 'كيف تعملون', 'خطوات',
        'مراحل', 'طریقہ', 'کیسے کام'] },
    { id: 'bot', words: ['are you a bot', 'are you human', 'real person', 'robot', 'ai', 'chatgpt', 'a machine', 'am i talking to',
        'bist du ein bot', 'roboter', 'echter mensch',
        'es-tu un robot', 'un humain', 'vraie personne',
        'eres un bot', 'un robot', 'persona real',
        'هل أنت روبوت', 'إنسان', 'شخص حقيقي',
        'کیا آپ روبوٹ', 'انسان', 'اصلی'] },
    { id: 'thanks', words: ['thank', 'thanks', 'cheers', 'appreciate', 'danke', 'merci', 'gracias', 'شكرا', 'شكراً', 'شکریہ'] },
    { id: 'bye', words: ['bye', 'goodbye', 'see you', 'later', 'tschüss', 'tschuss', 'au revoir', 'adiós', 'adios', 'مع السلامة', 'الوداع', 'خدا حافظ'] },
    { id: 'hello', words: ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening',
        'hallo', 'guten tag', 'bonjour', 'salut', 'hola', 'buenas',
        'مرحبا', 'السلام', 'أهلا', 'ہیلو', 'سلام', 'آداب'] }
  ];

  // Arabic and Urdu write the same letter several ways — the alef in "ابدأ"
  // and in "أبدأ" is the same sound and the same word, and readers type
  // whichever their keyboard offers. Without folding these together every
  // Arabic keyword only matches one of the spellings people actually use.
  const FOLD = [[/[أإآٱ]/g, 'ا'],   // alef forms  -> ا
                [/ة/g, 'ه'],                       // ta marbuta  -> ه
                [/[ىی]/g, 'ي'],               // alef maqsura, farsi ya -> ي
                [/ک/g, 'ك'],                       // keheh       -> ك
                [/[ً-ْـ]/g, '']];             // harakat and tatweel
  const norm = s => FOLD.reduce((t, [re, to]) => t.replace(re, to), String(s));

  // how many characters two words agree on from the start
  function shared(a, b) {
    const n = Math.min(a.length, b.length);
    let i = 0;
    while (i < n && a[i] === b[i]) i++;
    return i;
  }

  function match(text) {
    const clean = norm(text.toLowerCase()).replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
    const q = ' ' + clean + ' ';
    const tokens = clean.split(' ').filter(Boolean);

    // German inflects ("kostet" against a keyword of "kosten"), Spanish and
    // French likewise, so an exact word test misses most real questions in
    // half the languages the site speaks. Anything four characters or longer
    // matches on a shared stem instead.
    const hit = w => {
      if (w.includes(' ')) return q.includes(' ' + w + ' ') || q.includes(' ' + w);
      if (w.length < 4) return tokens.includes(w);
      // a plain prefix test is not enough: "kosten" and "kostet" part company
      // on the last letter, which is exactly where German inflects. Compare
      // the stem the two share instead.
      return tokens.some(t => t.length >= 4 && shared(t, w) >= 4);
    };

    let best = null, bestScore = 0;
    for (const it of INTENTS) {
      // Score the visitor's words, not the keywords. Counting keywords let a
      // list holding both "project" and "projects" score twice off one word,
      // which was enough to pull "I want to start a project" away from the
      // intent that actually wanted it.
      const seen = new Set();
      let score = 0;
      for (const raw of it.words) {
        const w = norm(raw.toLowerCase());
        if (!hit(w)) continue;
        if (w.includes(' ')) { score += 3; continue; }   // a phrase is strong evidence
        const t = tokens.find(t => t.length >= 4 ? shared(t, w) >= 4 : t === w);
        if (t && !seen.has(t)) { seen.add(t); score += 1; }
      }
      if (score > bestScore) { bestScore = score; best = it; }
    }
    return bestScore >= 1 ? best.id : null;
  }

  /* --- is the visitor asking about one particular project? ------------------
     A project name is far more specific than any keyword, so this runs before
     the matcher. Names come from the site's own project list, so a project
     added to projects-data.js becomes answerable with no change here. */
  function findProject(text) {
    const q = norm(text.toLowerCase());
    const all = window.DE_PROJECTS || [];
    let best = null, bestLen = 0;
    for (const p of all) {
      for (const name of [p.title, T(p.title)]) {
        const n = norm(String(name).toLowerCase());
        // 'the warehouse' should match; 'house' on its own should not
        if (n.length > 4 && q.includes(n) && n.length > bestLen) { best = p; bestLen = n.length; }
      }
    }
    return best;
  }

  function projectAnswer(p) {
    const facts = (p.facts || []).map(([k, v]) => plain(T(k)) + ': ' + plain(T(v))).join('  ·  ');
    const out = [
      c('thatOne'),
      plain(T(p.title)) + ' — ' + plain(T(p.blurb)) + (facts ? '\n' + facts : '')
    ];
    if (p.tour) out.push(c('hasTour'));
    out.push(linkLine('project.html?p=' + encodeURIComponent(p.slug), c('moreOnIt')));
    return out;
  }

  /* --- what each intent replies with -------------------------------------- */
  const HREF = { contact: 'contact.html', projects: 'projects.html', services: 'services.html', studio: 'studio.html' };

  function answer(id) {
    switch (id) {
      case 'fees':     return [c('onFees'), site('fees'), c('anythingElse')];
      case 'time':     return [c('onTime'), site('time')];
      case 'services': return [c('weCover'),
                               SERVICES.map(s => '· ' + plain(T(s))).join('\n'),
                               linkLine(HREF.services, c('goServices')),
                               c('anythingElse')];
      case 'start':    return [c('toContact'), linkLine(HREF.contact, c('goContact'))];
      case 'work':     return [tourLine(), c('seeAll'), linkLine(HREF.projects, c('goProjects'))];
      case 'where':    return [c('bothPlaces'), site('addr1') + '\n' + site('addr2'), linkLine(HREF.studio, c('goStudio'))];
      case 'hours':    return [c('ourHours'), HOURS.map(h => '· ' + plain(T(h))).join('\n')];
      case 'contact':  return [c('reachUs'),
                               '· +1 (000) 000-0000\n· studio@dearchitect.com',
                               linkLine(HREF.contact, c('goContact'))];
      case 'permit':   return [site('permit')];
      case 'small':    return [site('small')];
      case 'builder':  return [site('builder')];
      case 'visuals':  return [site('visuals')];
      case 'free':     return [site('free')];
      case 'bring':    return [site('bring')];
      case 'away':     return [site('away')];
      case 'jobs':     return [site('jobs'), linkLine(HREF.studio, c('goStudio'))];
      case 'process':  return [site('process'), linkLine(HREF.services, c('goServices'))];
      case 'bot':      return [c('notHuman'), linkLine(HREF.contact, c('goContact'))];
      case 'thanks':   return [c('thanks'), c('anythingElse')];
      case 'bye':      return [c('bye')];
      case 'hello':    return [greeting(), c('alsoAsk')];
      default:         return [c('unsure'), c('aPersonWill'),
                               linkLine(HREF.contact, c('goContact'))];
    }
  }

  function linkLine(href, label) {
    return `<a class="chat-go" href="${href}">${label}<svg viewBox="0 0 24 14" width="16" height="11" fill="none"
      stroke="currentColor" stroke-width="2.6"><path d="M2 7h18M14 1l6 6-6 6"/></svg></a>`;
  }

  function tourLine() {
    const all = window.DE_PROJECTS || [];
    const tours = all.filter(p => p.tour).slice(0, 3);
    if (!tours.length) return c('seeAll');
    return c('tourList') + '\n' + tours.map(p => '· ' + plain(T(p.title))).join('\n');
  }

  function greeting() {
    const h = new Date().getHours();
    return c(h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening');
  }

  /* --- the panel ----------------------------------------------------------- */
  let root, log, input, form, launcher, chipRow, open = false, busy = false;
  const history = [];

  function build() {
    launcher = document.createElement('button');
    launcher.type = 'button';
    launcher.className = 'fab fab-chat';
    launcher.innerHTML =
      `<svg class="i-open" viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 01-9 8.4 9 9 0 01-3.9-.9L3 21l1.9-4.6A8.4 8.4 0 013 11.5 8.5 8.5 0 0112 3a8.5 8.5 0 019 8.5z"/></svg>
       <svg class="i-close" viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor"
            stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`;
    (window.DEFabRail || document.body).prepend(launcher);

    root = document.createElement('section');
    root.className = 'chat';
    root.hidden = true;
    root.innerHTML =
      `<header class="chat-head">
         <span class="chat-dot" aria-hidden="true"></span>
         <span class="chat-id"><b></b><small></small></span>
         <button class="chat-x" type="button"><svg viewBox="0 0 24 24" width="18" height="18" fill="none"
           stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
       </header>
       <div class="chat-log" role="log" aria-live="polite"></div>
       <div class="chat-chips"></div>
       <form class="chat-form">
         <input type="text" autocomplete="off">
         <button type="submit"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor"
           stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg></button>
       </form>`;
    document.body.appendChild(root);

    log = root.querySelector('.chat-log');
    input = root.querySelector('.chat-form input');
    form = root.querySelector('.chat-form');
    chipRow = root.querySelector('.chat-chips');

    launcher.addEventListener('click', () => toggle());
    root.querySelector('.chat-x').addEventListener('click', () => toggle(false));
    form.addEventListener('submit', e => { e.preventDefault(); submit(input.value); });
    chipRow.addEventListener('click', e => {
      const b = e.target.closest('button');
      // a quick reply is a known question, so it carries its own answer rather
      // than being fed back through the matcher — reworded copy can never
      // leave a suggested question the assistant cannot answer
      if (b) submit(b.textContent, b.dataset.intent);
    });
    addEventListener('keydown', e => { if (e.key === 'Escape' && open) toggle(false); });

    paint();
  }

  function paint() {
    launcher.setAttribute('aria-label', c('launcher'));
    launcher.title = c('launcher');
    root.querySelector('.chat-id b').textContent = c('title');
    root.querySelector('.chat-id small').textContent = c('status');
    root.querySelector('.chat-x').setAttribute('aria-label', c('close'));
    input.placeholder = c('field');
    form.querySelector('button').setAttribute('aria-label', c('send'));
    chips(['qFees', 'qTime', 'qWhat', 'qStart', 'qWork', 'qWhere']);
  }

  const CHIPS = { qFees: 'fees', qTime: 'time', qWhat: 'services',
                  qStart: 'start', qWork: 'work', qWhere: 'where' };

  function chips(keys) {
    chipRow.innerHTML = keys
      .map(k => `<button type="button" data-intent="${CHIPS[k] || ''}">${c(k)}</button>`)
      .join('');
  }

  function toggle(want) {
    open = want === undefined ? !open : want;
    root.hidden = !open;
    launcher.classList.toggle('is-open', open);
    document.body.classList.toggle('chat-open', open);
    if (open) {
      if (!history.length) hello();
      setTimeout(() => input.focus({ preventScroll: true }), 60);
    }
  }

  /* --- bubbles ------------------------------------------------------------- */
  function bubble(who, html) {
    const b = document.createElement('div');
    b.className = 'chat-msg ' + who;
    b.innerHTML = String(html).replace(/\n/g, '<br>');
    log.appendChild(b);
    log.scrollTop = log.scrollHeight;
    return b;
  }

  function typing() {
    const t = document.createElement('div');
    t.className = 'chat-msg bot chat-typing';
    t.innerHTML = '<i></i><i></i><i></i>';
    log.appendChild(t);
    log.scrollTop = log.scrollHeight;
    return t;
  }

  // long answers take longer to "write", the way a person's would, but never
  // so long that the visitor thinks it has hung
  const pause = text => Math.min(1500, 350 + String(text).length * 12);
  const wait = ms => new Promise(r => setTimeout(r, ms));

  async function say(lines) {
    for (const line of lines) {
      if (!line) continue;
      const dots = typing();
      await wait(pause(line));
      dots.remove();
      bubble('bot', line);
      history.push({ role: 'assistant', content: plain(line) });
      await wait(120);
    }
    save();
  }

  async function hello() {
    const extra = pageNote();
    await say([greeting() + ' ' + c('opener'), extra].filter(Boolean));
  }

  function pageNote() {
    const p = location.pathname;
    if (/project\.html/.test(p)) return c('onProject');
    if (/services\.html/.test(p)) return c('onServices');
    if (/contact\.html/.test(p)) return c('onContact');
    return '';
  }

  /* --- sending ------------------------------------------------------------- */
  async function submit(text, forced) {
    text = String(text || '').trim();
    if (!text || busy) return;
    busy = true;
    input.value = '';
    bubble('me', escapeHtml(text));
    history.push({ role: 'user', content: text });

    try {
      if (ENDPOINT()) {
        await live(text);
      } else {
        // a project name is more specific than any keyword, so it wins
        const p = forced ? null : findProject(text);
        if (p) await say(projectAnswer(p));
        else await say(answer(forced || match(text)));
      }
    } finally {
      busy = false;
      save();
    }
  }

  // Only used when a server has been wired up. The key stays on that server.
  async function live(text) {
    const dots = typing();
    try {
      const res = await fetch(ENDPOINT(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history.slice(-12), lang: window.DELang ? window.DELang.current : 'en' })
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      dots.remove();
      bubble('bot', escapeHtml(data.reply || '').replace(/\n/g, '<br>'));
      history.push({ role: 'assistant', content: data.reply || '' });
    } catch (err) {
      console.error('[chat] live endpoint failed', err);
      dots.remove();
      // fall back to the local answers rather than leaving them with nothing
      await say([c('offline'), ...answer(match(text))]);
    }
  }

  const escapeHtml = s => String(s).replace(/[&<>"']/g,
    ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

  /* --- keeping the thread across pages ------------------------------------- */
  function save() {
    try { sessionStorage.setItem(STORE, JSON.stringify({ history })); } catch (e) { /* private mode */ }
  }

  function restore() {
    let saved;
    try { saved = JSON.parse(sessionStorage.getItem(STORE) || 'null'); } catch (e) { return; }
    if (!saved || !Array.isArray(saved.history) || !saved.history.length) return;
    saved.history.forEach(m => {
      history.push(m);
      bubble(m.role === 'user' ? 'me' : 'bot', escapeHtml(m.content).replace(/\n/g, '<br>'));
    });
    // The panel deliberately does not reopen itself. Carrying the open state
    // across pages meant that opening it once made it spring up on every page
    // afterwards, which is the behaviour of an advert rather than an assistant.
    // The conversation is kept; deciding to see it stays with the visitor.
  }

  /* --- go ------------------------------------------------------------------ */
  function init() {
    build();
    restore();
    // the labels and the canned answers are translated, so a language change
    // repaints the frame; the transcript already said what it said
    document.addEventListener('de:lang', paint);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.DEChat = { open: () => toggle(true), close: () => toggle(false), ask: submit };
})();
