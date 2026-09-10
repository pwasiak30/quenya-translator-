/* =====================================================================
   QUETTAPARMA — script.js
   Vanilla JS. Zero zależności.

   STRUKTURA PLIKU:
   1. Motyw (dark/light) + FOUC + mikrointerakcje ogólne (z base-template)
   2. Słownik: dane (DICT) — quenya + polski gloss
   3. Silnik gramatyczny quenya: deklinacja (10 przypadków) i koniugacja (5 czasów)
   4. Indeks form quenya (do wyszukiwarki — rozpoznaje też formy odmienione)
   5. Wyszukiwarka słownika — UI
   6. Statyczne sekcje: zwroty, kalendarz
   7. Dane "rdzenia zdaniowego": polskie formy rzeczowników/czasowników/przymiotników
      dla kontrolowanego podzbioru słownictwa używanego w kompozytorze zdań
   8. Silnik składni: polski → quenya
   9. Silnik składni: quenya → polski
   10. Kompozytor zdań — UI
===================================================================== */

/* ---------------------------------------------------------------------
   1. MOTYW + MIKROINTERAKCJE OGÓLNE
--------------------------------------------------------------------- */
(function () {
  'use strict';

  const STORAGE_KEY = 'quettaparma-theme';
  const root = document.documentElement;
  const toggleBtn = document.getElementById('theme-toggle');

  function getPreferredTheme() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    if (toggleBtn) toggleBtn.setAttribute('aria-pressed', String(theme === 'dark'));
  }

  function toggleTheme() {
    const current = root.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
  }

  applyTheme(getPreferredTheme());
  if (toggleBtn) toggleBtn.addEventListener('click', toggleTheme);

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem(STORAGE_KEY)) applyTheme(e.matches ? 'dark' : 'light');
  });

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const targetId = link.getAttribute('href');
      if (!targetId || targetId === '#') return;
      const target = document.querySelector(targetId);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  });

  const animatedEls = document.querySelectorAll('.bento-card, .sentence-col, .cal-card');
  if ('IntersectionObserver' in window && animatedEls.length) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add('in-view'); observer.unobserve(entry.target); }
      });
    }, { threshold: 0.15 });
    animatedEls.forEach((el) => observer.observe(el));
  }

  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();

/* ---------------------------------------------------------------------
   2. SŁOWNIK — DANE
   pos: n=rzeczownik, adj=przymiotnik, v=czasownik, pron=zaimek,
        num=liczebnik, conj=spójnik, prep=przyimek, part=partykuła,
        phrase=zwrot stały
   verb class (c): 'a' = temat na -a, 'b' = pierwotny (spółgłoskowy)
--------------------------------------------------------------------- */
const DICT = [
// liczebniki
{q:"minë",p:"jeden",pos:"num"},
{q:"atta",p:"dwa",pos:"num"},
{q:"neldë",p:"trzy",pos:"num"},
{q:"canta",p:"cztery",pos:"num"},
{q:"lempë",p:"pięć",pos:"num"},
{q:"enquë",p:"sześć",pos:"num"},
{q:"otso",p:"siedem",pos:"num"},
{q:"tolto",p:"osiem",pos:"num"},
{q:"nertë",p:"dziewięć",pos:"num"},
{q:"cainen",p:"dziesięć",pos:"num"},
{q:"minquë",p:"jedenaście",pos:"num"},
{q:"yunquë",p:"dwanaście",pos:"num"},
// zaimki
{q:"ni",p:"ja",pos:"pron"},
{q:"elyë",p:"ty",pos:"pron",n:"grzecznościowa/emfatyczna forma"},
{q:"se",p:"on / ona / ono",pos:"pron"},
{q:"me",p:"my (wyłączające — bez odbiorcy)",pos:"pron"},
{q:"ve",p:"my (włączające — z odbiorcą)",pos:"pron"},
{q:"le",p:"wy",pos:"pron"},
{q:"te",p:"oni / one",pos:"pron"},
// rodzina
{q:"atar",p:"ojciec",pos:"n"},
{q:"amil",p:"matka",pos:"n"},
{q:"yondo",p:"syn",pos:"n"},
{q:"yendë",p:"córka",pos:"n"},
{q:"háno",p:"brat",pos:"n"},
{q:"seler",p:"siostra",pos:"n"},
{q:"veru",p:"mąż",pos:"n"},
{q:"vessë",p:"żona",pos:"n"},
{q:"hína",p:"dziecko",pos:"n"},
{q:"nossë",p:"rodzina, ród, krewni",pos:"n"},
{q:"nér",p:"mężczyzna",pos:"n"},
{q:"nís",p:"kobieta",pos:"n"},
{q:"elda",p:"elf",pos:"n"},
// ciało
{q:"hroa",p:"ciało (fizyczne)",pos:"n"},
{q:"fëa",p:"dusza, duch",pos:"n"},
{q:"cas",p:"głowa",pos:"n"},
{q:"hen",p:"oko",pos:"n"},
{q:"má",p:"ręka, dłoń",pos:"n"},
{q:"hón",p:"serce",pos:"n"},
{q:"anto",p:"usta",pos:"n"},
{q:"tál",p:"stopa, noga",pos:"n"},
{q:"sercë",p:"krew",pos:"n"},
{q:"handë",p:"wiedza, rozumienie",pos:"n"},
// przyroda
{q:"Anar",p:"Słońce",pos:"n"},
{q:"Isil",p:"Księżyc",pos:"n"},
{q:"elen",p:"gwiazda",pos:"n"},
{q:"menel",p:"niebo, firmament",pos:"n"},
{q:"vilya",p:"niebo, powietrze",pos:"n"},
{q:"cemen",p:"ziemia, grunt",pos:"n"},
{q:"nén",p:"woda",pos:"n"},
{q:"nár",p:"ogień",pos:"n"},
{q:"súlë",p:"wiatr",pos:"n"},
{q:"alda",p:"drzewo",pos:"n"},
{q:"taurë",p:"las",pos:"n"},
{q:"lótë",p:"kwiat",pos:"n"},
{q:"lassë",p:"liść",pos:"n"},
{q:"ondo",p:"kamień, skała",pos:"n"},
{q:"oron",p:"góra",pos:"n"},
{q:"sírë",p:"rzeka",pos:"n"},
{q:"ëar",p:"morze",pos:"n"},
{q:"mistë",p:"drobny deszcz, mżawka",pos:"n"},
{q:"lossë",p:"śnieg",pos:"n"},
{q:"salquë",p:"trawa",pos:"n"},
{q:"helyanwë",p:"tęcza",pos:"n"},
{q:"tië",p:"ścieżka, szlak",pos:"n"},
// zwierzęta
{q:"rocco",p:"koń",pos:"n"},
{q:"aiwë",p:"ptak (mały)",pos:"n"},
{q:"lingwë",p:"ryba",pos:"n"},
{q:"wilwarin",p:"motyl",pos:"n"},
{q:"sorno",p:"orzeł",pos:"n"},
{q:"leuca",p:"wąż",pos:"n"},
// kolory
{q:"ninquë",p:"biały",pos:"adj"},
{q:"morna",p:"czarny, mroczny",pos:"adj"},
{q:"carnë",p:"czerwony",pos:"adj"},
{q:"laiquë",p:"zielony",pos:"adj"},
{q:"luinë",p:"niebieski",pos:"adj"},
{q:"malina",p:"żółty",pos:"adj"},
{q:"laurëa",p:"złoty (o świetle, barwie)",pos:"adj"},
{q:"telpina",p:"srebrny",pos:"adj"},
{q:"sinda",p:"szary",pos:"adj"},
// przymiotniki
{q:"mára",p:"dobry",pos:"adj"},
{q:"ulca",p:"zły, niegodziwy",pos:"adj"},
{q:"alta",p:"duży, wielki",pos:"adj"},
{q:"pitya",p:"mały",pos:"adj"},
{q:"vanya",p:"piękny",pos:"adj"},
{q:"saila",p:"mądry",pos:"adj"},
{q:"linta",p:"szybki",pos:"adj",n:"l.mn. poświadczona jako lintë"},
{q:"lenca",p:"powolny",pos:"adj"},
{q:"yára",p:"stary",pos:"adj"},
{q:"nessë",p:"młody",pos:"adj"},
{q:"urëa",p:"gorący",pos:"adj"},
{q:"ringa",p:"zimny",pos:"adj"},
{q:"polda",p:"silny, krzepki",pos:"adj"},
{q:"calima",p:"jasny, promienny",pos:"adj"},
{q:"lissë",p:"słodki",pos:"adj"},
// czasowniki tematyczne (-a)
{q:"lelya",p:"iść, podróżować",pos:"v",c:"a"},
{q:"mapa",p:"chwytać, brać",pos:"v",c:"a"},
{q:"anta",p:"dawać",pos:"v",c:"a"},
{q:"tira",p:"patrzeć, pilnować",pos:"v",c:"a"},
{q:"harya",p:"mieć, posiadać",pos:"v",c:"a"},
{q:"lanta",p:"upadać",pos:"v",c:"a"},
{q:"orta",p:"wstawać, podnosić",pos:"v",c:"a"},
{q:"vala",p:"rządzić, mieć moc",pos:"v",c:"a"},
{q:"laita",p:"błogosławić, wychwalać",pos:"v",c:"a"},
{q:"sana",p:"myśleć, sądzić",pos:"v",c:"a"},
{q:"hanya",p:"rozumieć",pos:"v",c:"a"},
{q:"onta",p:"tworzyć, stwarzać",pos:"v",c:"a"},
{q:"tulta",p:"wzywać, przywoływać",pos:"v",c:"a"},
{q:"envinyata",p:"uzdrawiać, odnawiać",pos:"v",c:"a"},
{q:"nurta",p:"ukrywać",pos:"v",c:"a"},
{q:"caita",p:"leżeć",pos:"v",c:"a"},
{q:"ista",p:"wiedzieć, znać",pos:"v",c:"a"},
{q:"hanta",p:"dziękować",pos:"v",c:"a",n:"poświadczone tylko pośrednio, np. w Eruhantalë (Dziękczynienie)"},
// czasowniki pierwotne (spółgłoskowe)
{q:"car",p:"robić, tworzyć",pos:"v",c:"b"},
{q:"mat",p:"jeść",pos:"v",c:"b"},
{q:"suc",p:"pić",pos:"v",c:"b"},
{q:"quet",p:"mówić",pos:"v",c:"b"},
{q:"tul",p:"przychodzić",pos:"v",c:"b"},
{q:"mel",p:"kochać",pos:"v",c:"b"},
{q:"cen",p:"widzieć",pos:"v",c:"b"},
{q:"hlar",p:"słyszeć",pos:"v",c:"b"},
{q:"lir",p:"śpiewać",pos:"v",c:"b"},
{q:"men",p:"iść, kierować się, zmierzać",pos:"v",c:"b"},
{q:"sav",p:"wierzyć",pos:"v",c:"b"},
{q:"tam",p:"stukać, pukać",pos:"v",c:"b"},
// rzeczowniki ogólne
{q:"coa",p:"dom",pos:"n"},
{q:"mallë",p:"droga, gościniec",pos:"n"},
{q:"osto",p:"miasto, gród",pos:"n"},
{q:"ando",p:"brama, drzwi",pos:"n"},
{q:"macil",p:"miecz",pos:"n"},
{q:"cú",p:"łuk (broń)",pos:"n"},
{q:"pilin",p:"strzała",pos:"n"},
{q:"ríë",p:"korona, diadem",pos:"n"},
{q:"corma",p:"pierścień",pos:"n"},
{q:"mírë",p:"klejnot, kamień szlachetny",pos:"n"},
{q:"parma",p:"księga",pos:"n"},
{q:"quessë",p:"pióro",pos:"n"},
{q:"cirya",p:"statek",pos:"n"},
{q:"lindë",p:"pieśń, melodia",pos:"n"},
{q:"quettë",p:"słowo",pos:"n"},
{q:"quenta",p:"opowieść, historia",pos:"n"},
{q:"essë",p:"imię",pos:"n"},
{q:"meldo",p:"przyjaciel",pos:"n"},
{q:"cotumo",p:"wróg",pos:"n"},
{q:"aran",p:"król",pos:"n"},
{q:"tári",p:"królowa",pos:"n"},
{q:"lië",p:"lud, naród",pos:"n"},
{q:"cala",p:"światło",pos:"n"},
{q:"lumbë",p:"cień, mrok, chmura",pos:"n"},
{q:"lómë",p:"noc",pos:"n"},
{q:"aurë",p:"dzień",pos:"n"},
{q:"loa",p:"rok",pos:"n"},
{q:"lúmë",p:"czas, godzina, chwila",pos:"n"},
{q:"yanta",p:"most",pos:"n"},
{q:"mindon",p:"wieża",pos:"n"},
{q:"estel",p:"nadzieja, ufność",pos:"n"},
{q:"melmë",p:"miłość",pos:"n"},
{q:"tengwa",p:"litera, znak (pismo)",pos:"n"},
{q:"nótë",p:"liczba",pos:"n"},
{q:"hravan",p:"dzikie zwierzę, bestia",pos:"n"},
{q:"quenya",p:"język quenya, mowa Wysokich Elfów",pos:"n"},
// funkcyjne
{q:"ar",p:"i (spójnik)",pos:"conj"},
{q:"mal",p:"ale",pos:"conj"},
{q:"ná",p:"jest (3.os.lp. od być)",pos:"v"},
{q:"nai",p:"oby, niech się stanie",pos:"part"},
{q:"na",p:"do, ku (przyimek kierunku)",pos:"prep"},
{q:"man",p:"kto",pos:"pron"},
{q:"mana",p:"co",pos:"pron"},
// zwroty
{q:"Aiya!",p:"Witaj! Bądź pozdrowiony!",pos:"phrase",n:"powitanie, dosłownie ach!"},
{q:"Namárië!",p:"Żegnaj! (dosł. bądź dobrze)",pos:"phrase",n:"tytuł pieśni Galadrieli w Władcy Pierścieni"},
{q:"Elen síla lúmenn' omentielvo",p:"Gwiazda świeci nad godziną naszego spotkania",pos:"phrase",n:"klasyczne pozdrowienie elfów, Władca Pierścieni"},
{q:"Nai hiruvalyë Valimar",p:"Oby(ś) odnalazł(a) Valimar",pos:"phrase",n:"z pieśni Namárië"},
];

const SEASONS = [
  {q:"tuilë", p:"wiosna"}, {q:"lairë", p:"lato"}, {q:"yávië", p:"jesień, plony"},
  {q:"quellë", p:"więdnięcie (schyłek jesieni)"}, {q:"hrívë", p:"zima"}, {q:"coirë", p:"przebudzenie (przedwiośnie)"},
];
const WEEKDAYS = [
  {q:"Elenya", p:"dzień gwiazd (1.)"}, {q:"Anarya", p:"dzień słońca (2.)"}, {q:"Isilya", p:"dzień księżyca (3.)"},
  {q:"Aldúya", p:"dzień drzew (4.)"}, {q:"Menelya", p:"dzień nieba (5.)"}, {q:"Valanya", p:"dzień Valarów (6., ostatni)"},
];

/* ---------------------------------------------------------------------
   3. SILNIK GRAMATYCZNY QUENYA
--------------------------------------------------------------------- */
const VOWELS = "aeiouëáéíóú";
const LENGTHEN = {a:"á",e:"é",i:"í",o:"ó",u:"ú","ë":"é"};

function stemClass(stem){
  const last = stem.slice(-1);
  if(last === "ë") return "E";
  if("aeiou".includes(last)) return "V";
  return "C";
}
function lengthenFinal(stem){
  const last = stem.slice(-1);
  if(LENGTHEN[last]) return stem.slice(0,-1)+LENGTHEN[last];
  return stem;
}
function lengthenFirstVowel(str){
  for(let i=0;i<str.length;i++){
    const ch = str[i];
    if(LENGTHEN[ch]) return str.slice(0,i)+LENGTHEN[ch]+str.slice(i+1);
  }
  return str;
}

const CASES = [
  {k:"nom", pl:"Mianownik", hint:"kto? co?"},
  {k:"acc", pl:"Biernik", hint:"kogo? co?"},
  {k:"gen", pl:"Dopełniacz", hint:"kogo? czego?"},
  {k:"poss",pl:"Dzierżawczy", hint:"czyj?"},
  {k:"dat", pl:"Celownik", hint:"komu? czemu?"},
  {k:"loc", pl:"Miejscownik", hint:"gdzie? w czym?"},
  {k:"all", pl:"Allatyw", hint:"dokąd?"},
  {k:"abl", pl:"Ablatyw", hint:"skąd?"},
  {k:"ins", pl:"Narzędnik", hint:"czym?"},
  {k:"resp",pl:"Respektyw", hint:"w odniesieniu do czego? (rzadki, niepewny)"},
];

function declineSingular(stem, caseKey){
  const cls = stemClass(stem);
  switch(caseKey){
    case "nom": return stem;
    case "acc": return cls==="C" ? stem : lengthenFinal(stem);
    case "gen":
      if(cls!=="C" && stem.endsWith("a")) return stem.slice(0,-1)+"o";
      return stem+"o";
    case "poss": return cls==="C" ? stem+"wa" : stem+"va";
    case "dat":  return cls==="C" ? stem+"en" : stem+"n";
    case "loc":  return cls==="C" ? stem+"essë" : stem+"ssë";
    case "all":  return cls==="C" ? stem+"enna" : stem+"nna";
    case "abl":  return cls==="C" ? stem+"ello" : stem+"llo";
    case "ins":  return stem+"nen";
    case "resp": return cls==="C" ? stem+"es" : stem+"s";
  }
}

function declinePlural(stem, caseKey){
  const cls = stemClass(stem);
  if(cls === "V"){
    const root = stem;
    switch(caseKey){
      case "nom": return root+"r";
      case "acc": return root+"i";
      case "gen": return root+"ron";
      case "poss":return root+"iva";
      case "dat": return root+"in";
      case "loc": return root+"ssen";
      case "all": return root+"nnar";
      case "abl": return root+"llon";
      case "ins": return root+"inen";
      case "resp":return root+"is";
    }
  } else {
    const root = cls==="E" ? stem.slice(0,-1) : stem;
    const linkC = cls==="C";
    switch(caseKey){
      case "nom": return root+"i";
      case "acc": return root+"í";
      case "gen": return root+"ion";
      case "poss":return root+"íva";
      case "dat": return root+"ín";
      case "loc": return root+(linkC?"issen":"essen");
      case "all": return root+(linkC?"innar":"ennar");
      case "abl": return root+(linkC?"illon":"ellon");
      case "ins": return root+"ínen";
      case "resp":return root+"ís";
    }
  }
}

function adjectivePlural(stem){
  if(stem.endsWith("a")) return stem.slice(0,-1)+"ë";
  return stem;
}

const TENSES = [
  {k:"aorist",  pl:"Aoryst (ogólny/zwyczajowy)"},
  {k:"present", pl:"Teraźniejszy (ciągły)"},
  {k:"past",    pl:"Przeszły"},
  {k:"future",  pl:"Przyszły"},
  {k:"perfect", pl:"Dokonany"},
];

function conjugate(stem, cls, tenseKey){
  if(cls === "a"){
    const root = stem.slice(0,-1);
    switch(tenseKey){
      case "aorist": return stem;
      case "present": return lengthenFirstVowel(root)+"ea";
      case "past": return stem+"në";
      case "future": return root+"uva";
      case "perfect": {
        if(VOWELS.includes(root[0])) return lengthenFirstVowel(root)+"ië";
        let prefix = "";
        for(const ch of root){ if(VOWELS.includes(ch)){ prefix = ch; break; } }
        return prefix+lengthenFirstVowel(root)+"ië";
      }
    }
  } else {
    const root = stem;
    switch(tenseKey){
      case "aorist": return root+"ë";
      case "present": return lengthenFirstVowel(root)+"a";
      case "past": {
        const last = root.slice(-1);
        if(last==="t") return root.slice(0,-1)+"ntë";
        if(last==="p") return root.slice(0,-1)+"mpë";
        if(last==="k"||last==="c") return root.slice(0,-1)+"nkë";
        if(last==="m") return root.slice(0,-1)+"mbë";
        return lengthenFirstVowel(root)+"ë";
      }
      case "future": return root+"uva";
      case "perfect": {
        let prefix = "";
        for(const ch of root){ if(VOWELS.includes(ch)){ prefix = ch; break; } }
        return prefix+lengthenFirstVowel(root)+"ië";
      }
    }
  }
}

/* ---------------------------------------------------------------------
   4. INDEKS FORM QUENYA (wyszukiwarka słownika)
--------------------------------------------------------------------- */
function stripAccents(s){
  return s.normalize("NFD").replace(/[̀-ͯ]/g,"")
    .replace(/ł/g,"l").replace(/Ł/g,"L")
    .toLowerCase();
}

const FORMS_INDEX = new Map();
function addForm(entry, formQ, label){
  if(!formQ) return;
  const key = stripAccents(formQ);
  if(!FORMS_INDEX.has(key)) FORMS_INDEX.set(key, []);
  FORMS_INDEX.get(key).push({entry, formQ, label});
}

DICT.forEach(entry=>{
  addForm(entry, entry.q, "forma słownikowa");
  if(entry.pos === "n"){
    CASES.forEach(c=>{
      addForm(entry, declineSingular(entry.q,c.k), c.pl+" l.poj.");
      addForm(entry, declinePlural(entry.q,c.k), c.pl+" l.mn.");
    });
  } else if(entry.pos === "adj"){
    addForm(entry, adjectivePlural(entry.q), "l.mn.");
  } else if(entry.pos === "v"){
    TENSES.forEach(t=>{ addForm(entry, conjugate(entry.q, entry.c, t.k), t.pl); });
  }
});

/* ---------------------------------------------------------------------
   5. WYSZUKIWARKA SŁOWNIKA — UI
--------------------------------------------------------------------- */
const $ = sel => document.querySelector(sel);
const resultsEl = $("#results");
const countEl = $("#resultsCount");
const searchInput = $("#searchInput");

function posLabel(pos){
  return {n:"rzeczownik",adj:"przymiotnik",v:"czasownik",pron:"zaimek",num:"liczebnik",
    conj:"spójnik",prep:"przyimek",part:"partykuła",phrase:"zwrot",adv:"przysłówek"}[pos] || pos;
}
function escapeHtml(s){
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function searchDict(query){
  const q = stripAccents(query.trim());
  if(!q) return [];
  const out = new Map();

  FORMS_INDEX.forEach((hits, key)=>{
    if(key === q || key.startsWith(q)){
      hits.forEach(h=>{
        const score = (key===q ? 0 : 1) + (h.label==="forma słownikowa" ? 0 : 0.2);
        const cur = out.get(h.entry);
        if(!cur || cur.score > score) out.set(h.entry, {entry:h.entry, foundAs:h.formQ, label:h.label, score});
      });
    }
  });

  DICT.forEach(entry=>{
    const glossN = stripAccents(entry.p);
    if(glossN.includes(q)){
      const score = glossN.startsWith(q) ? 0.5 : 1.5;
      const cur = out.get(entry);
      if(!cur || cur.score > score) out.set(entry, {entry, foundAs:null, label:null, score});
    }
  });

  return Array.from(out.values()).sort((a,b)=>a.score-b.score || a.entry.q.localeCompare(b.entry.q));
}

function renderNounGrid(entry){
  let sgRows="", plRows="";
  CASES.forEach(c=>{
    sgRows += `<tr><td class="case-name">${c.pl}</td><td class="qform">${declineSingular(entry.q,c.k)}</td></tr>`;
    plRows += `<tr><td class="case-name">${c.pl}</td><td class="qform">${declinePlural(entry.q,c.k)}</td></tr>`;
  });
  return `
    <div class="grid-wrap">
      <table class="grid"><caption>Liczba pojedyncza</caption><tbody>${sgRows}</tbody></table>
      <table class="grid"><caption>Liczba mnoga</caption><tbody>${plRows}</tbody></table>
    </div>
    <div class="dual-box"><b>Liczba podwójna (informacyjnie):</b> quenya ma osobną liczbę podwójną dla par (np. <i>hendu</i> „para oczu" od <i>hen</i>). Końcówki -u / -t / -t- dobierane są w dużej mierze leksykalnie i nie są w pełni regularne, dlatego nie generujemy jej automatycznie dla każdego słowa.</div>
  `;
}
function renderVerbTenses(entry){
  let rows = "";
  TENSES.forEach(t=>{ rows += `<div class="tense-row"><span class="tense-name">${t.pl}</span><span class="tense-form">${conjugate(entry.q, entry.c, t.k)}</span></div>`; });
  return `<div class="tense-list">${rows}</div>
    <p class="note">Osobę (ja/ty/on…) najbezpieczniej wyrazić osobnym zaimkiem przed czasownikiem, np. <i>ni ${conjugate(entry.q,entry.c,"aorist")}</i> — dosłownie „ja: ${escapeHtml(entry.p)}" (ni = ja, elyë = ty, se = on/ona/ono, me/ve = my, le = wy, te = oni). ${entry.c==="b" ? "Czas przeszły czasowników pierwotnych bywa w źródłach nieregularny — powyższa forma to jeden z typowych wzorców, nie jedyny poświadczony." : ""}</p>`;
}
function renderAdjective(entry){
  return `<div class="tense-list">
    <div class="tense-row"><span class="tense-name">Liczba pojedyncza</span><span class="tense-form">${entry.q}</span></div>
    <div class="tense-row"><span class="tense-name">Liczba mnoga</span><span class="tense-form">${adjectivePlural(entry.q)}</span></div>
  </div>
  <p class="note">Przymiotniki w quenya zwykle nie odmieniają się przez przypadki — tylko opcjonalnie przez liczbę, gdy poprzedzają rzeczownik w liczbie mnogiej.</p>`;
}
function cardBody(entry, extra){
  let body = "";
  if(extra){ body += `<div class="found-as">Znaleziono formę <b>${escapeHtml(extra.foundAs)}</b> — ${extra.label} słowa <b>${entry.q}</b>.</div>`; }
  if(entry.n){ body += `<p class="note">${escapeHtml(entry.n)}</p>`; }
  if(entry.pos==="n") body += renderNounGrid(entry);
  else if(entry.pos==="adj") body += renderAdjective(entry);
  else if(entry.pos==="v") body += renderVerbTenses(entry);
  else if(!extra && !entry.n){ body += `<p class="note">Ta forma się nie odmienia.</p>`; }
  return body;
}

function renderResults(query){
  const hits = searchDict(query);
  countEl.textContent = query.trim() ? `${hits.length} ${hits.length===1?"wynik":"wyników"}` : "";
  if(!query.trim()){
    resultsEl.innerHTML = `<div class="empty-msg">Zacznij pisać po polsku lub w quenya — również formy odmienione, np. <i>eldaron</i>, <i>matuva</i>, <i>lasseva</i>.</div>`;
    return;
  }
  if(hits.length===0){
    resultsEl.innerHTML = `<div class="empty-msg">Brak wyników dla „${escapeHtml(query)}". Słownik obejmuje ok. ${DICT.length} rdzennych haseł — spróbuj innego słowa lub sprawdź pisownię.</div>`;
    return;
  }
  resultsEl.innerHTML = hits.slice(0,60).map((h)=>{
    const e = h.entry;
    const showFound = h.foundAs && h.foundAs !== e.q;
    return `
    <div class="card">
      <div class="card-head" role="button" tabindex="0">
        <span class="q-word">${e.q}</span>
        <span class="pos-badge">${posLabel(e.pos)}</span>
        <span class="gloss">${escapeHtml(e.p)}</span>
        ${showFound ? `<span class="match-tag">${escapeHtml(h.foundAs)}</span>` : ""}
        <svg class="chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="9 6 15 12 9 18"/></svg>
      </div>
      <div class="card-body">${cardBody(e, showFound ? h : null)}</div>
    </div>`;
  }).join("");

  resultsEl.querySelectorAll(".card-head").forEach(head=>{
    head.addEventListener("click", ()=> head.parentElement.classList.toggle("open"));
    head.addEventListener("keydown", ev=>{ if(ev.key==="Enter" || ev.key===" "){ ev.preventDefault(); head.click(); } });
  });
}

if(searchInput){
  searchInput.addEventListener("input", ()=> renderResults(searchInput.value));
  $("#clearBtn").addEventListener("click", ()=>{ searchInput.value=""; renderResults(""); searchInput.focus(); });
  document.querySelectorAll("[data-try]").forEach(btn=>{
    btn.addEventListener("click", ()=>{ searchInput.value = btn.dataset.try; renderResults(searchInput.value); searchInput.focus(); window.scrollTo({top:0}); document.querySelector('#slownik').scrollIntoView({behavior:'smooth'}); });
  });
  renderResults("");
}

/* ---------------------------------------------------------------------
   6. STATYCZNE SEKCJE: ZWROTY, KALENDARZ
--------------------------------------------------------------------- */
const phraseGrid = $("#phraseGrid");
if(phraseGrid){
  phraseGrid.innerHTML = DICT.filter(e=>e.pos==="phrase").map(e=>`
    <article class="bento-card">
      <span class="q-form-lg">${e.q}</span>
      <p>${escapeHtml(e.p)}</p>
      ${e.n ? `<span class="bento-card__tag">${escapeHtml(e.n)}</span>` : ""}
    </article>
  `).join("");
}
const seasonsList = $("#seasonsList");
if(seasonsList) seasonsList.innerHTML = SEASONS.map(s=>`<div class="cal-row"><span class="cal-q">${s.q}</span><span class="cal-pl">${s.p}</span></div>`).join("");
const weekList = $("#weekList");
if(weekList) weekList.innerHTML = WEEKDAYS.map(s=>`<div class="cal-row"><span class="cal-q">${s.q}</span><span class="cal-pl">${s.p}</span></div>`).join("");

const statWords = $("#statWords");
if(statWords) statWords.textContent = DICT.filter(e=>e.pos!=="phrase").length;
const wordCount = $("#wordCount");
if(wordCount) wordCount.textContent = DICT.filter(e=>e.pos!=="phrase").length;

/* ---------------------------------------------------------------------
   7. RDZEŃ ZDANIOWY — polskie formy dla kontrolowanego podzbioru słownictwa
   Klucz każdego obiektu to forma słownikowa quenya (q z DICT) — łączy się
   z silnikiem deklinacji/koniugacji z sekcji 3, więc formy quenya generowane
   są tym samym kodem co w słowniku (żadnej duplikacji reguł gramatycznych).
--------------------------------------------------------------------- */

// Rzeczowniki: mianownik/biernik/dopełniacz l.poj. + rodzaj (m/f/n) — potrzebny
// do zgodności przymiotnika orzecznikowego ("X jest przymiotnik").
const CORE_NOUNS = {
  elda:   {pl:"elf",       gender:"m", acc:"elfa",       gen:"elfa"},
  coa:    {pl:"dom",       gender:"m", acc:"dom",        gen:"domu"},
  nen_:   null, // placeholder removed below (nén handled explicitly, see key "nén")
  "nén":  {pl:"woda",      gender:"f", acc:"wodę",       gen:"wody"},
  "nár":  {pl:"ogień",     gender:"m", acc:"ogień",      gen:"ognia"},
  elen:   {pl:"gwiazda",   gender:"f", acc:"gwiazdę",    gen:"gwiazdy"},
  alda:   {pl:"drzewo",    gender:"n", acc:"drzewo",     gen:"drzewa"},
  rocco:  {pl:"koń",       gender:"m", acc:"konia",      gen:"konia"},
  aiwë:   {pl:"ptak",      gender:"m", acc:"ptaka",      gen:"ptaka"},
  aran:   {pl:"król",      gender:"m", acc:"króla",      gen:"króla"},
  meldo:  {pl:"przyjaciel",gender:"m", acc:"przyjaciela",gen:"przyjaciela"},
  cotumo: {pl:"wróg",      gender:"m", acc:"wroga",      gen:"wroga"},
  macil:  {pl:"miecz",     gender:"m", acc:"miecz",      gen:"miecza"},
  parma:  {pl:"księga",    gender:"f", acc:"księgę",     gen:"księgi"},
  lindë:  {pl:"pieśń",     gender:"f", acc:"pieśń",      gen:"pieśni"},
  "hína": {pl:"dziecko",   gender:"n", acc:"dziecko",    gen:"dziecka"},
  "nís":  {pl:"kobieta",   gender:"f", acc:"kobietę",    gen:"kobiety"},
  "nér":  {pl:"mężczyzna", gender:"m", acc:"mężczyznę",  gen:"mężczyzny"},
  amil:   {pl:"matka",     gender:"f", acc:"matkę",      gen:"matki"},
  atar:   {pl:"ojciec",    gender:"m", acc:"ojca",       gen:"ojca"},
  yondo:  {pl:"syn",       gender:"m", acc:"syna",       gen:"syna"},
  "yendë":{pl:"córka",     gender:"f", acc:"córkę",      gen:"córki"},
  Anar:   {pl:"słońce",    gender:"n", acc:"słońce",     gen:"słońca"},
  Isil:   {pl:"księżyc",   gender:"m", acc:"księżyc",    gen:"księżyca"},
  cala:   {pl:"światło",   gender:"n", acc:"światło",    gen:"światła"},
  "lómë": {pl:"noc",       gender:"f", acc:"noc",        gen:"nocy"},
  "aurë": {pl:"dzień",     gender:"m", acc:"dzień",      gen:"dnia"},
  loa:    {pl:"rok",       gender:"m", acc:"rok",        gen:"roku"},
  "mallë":{pl:"droga",     gender:"f", acc:"drogę",      gen:"drogi"},
  "essë": {pl:"imię",      gender:"n", acc:"imię",       gen:"imienia"},
  estel:  {pl:"nadzieja",  gender:"f", acc:"nadzieję",   gen:"nadziei"},
  "melmë":{pl:"miłość",    gender:"f", acc:"miłość",     gen:"miłości"},
  "sírë": {pl:"rzeka",     gender:"f", acc:"rzekę",      gen:"rzeki"},
  "ëar":  {pl:"morze",     gender:"n", acc:"morze",      gen:"morza"},
  ondo:   {pl:"kamień",    gender:"m", acc:"kamień",     gen:"kamienia"},
  oron:   {pl:"góra",      gender:"f", acc:"górę",       gen:"góry"},
  "lassë":{pl:"liść",      gender:"m", acc:"liść",       gen:"liścia"},
  "lótë": {pl:"kwiat",     gender:"m", acc:"kwiat",      gen:"kwiatu"},
};
delete CORE_NOUNS.nen_;

// Czasowniki: czas teraźniejszy, 1./2./3. os. lp (rodzaj nie wpływa na czas teraźniejszy w polskim)
const CORE_VERBS = {
  mel:        {pl:"kochać",     ja:"kocham",     ty:"kochasz",     on:"kocha"},
  cen:        {pl:"widzieć",    ja:"widzę",      ty:"widzisz",     on:"widzi"},
  quet:       {pl:"mówić",      ja:"mówię",      ty:"mówisz",      on:"mówi"},
  lelya:      {pl:"iść",        ja:"idę",        ty:"idziesz",     on:"idzie"},
  mat:        {pl:"jeść",       ja:"jem",        ty:"jesz",        on:"je"},
  suc:        {pl:"pić",        ja:"piję",       ty:"pijesz",      on:"pije"},
  anta:       {pl:"dawać",      ja:"daję",       ty:"dajesz",      on:"daje"},
  mapa:       {pl:"brać",       ja:"biorę",      ty:"bierzesz",    on:"bierze"},
  ista:       {pl:"wiedzieć",   ja:"wiem",       ty:"wiesz",       on:"wie"},
  sav:        {pl:"wierzyć",    ja:"wierzę",     ty:"wierzysz",    on:"wierzy"},
  lir:        {pl:"śpiewać",    ja:"śpiewam",    ty:"śpiewasz",    on:"śpiewa"},
  tira:       {pl:"patrzeć",    ja:"patrzę",     ty:"patrzysz",    on:"patrzy"},
  onta:       {pl:"tworzyć",    ja:"tworzę",     ty:"tworzysz",    on:"tworzy"},
  hanya:      {pl:"rozumieć",   ja:"rozumiem",   ty:"rozumiesz",   on:"rozumie"},
  laita:      {pl:"błogosławić",ja:"błogosławię",ty:"błogosławisz",on:"błogosławi"},
  harya:      {pl:"mieć",       ja:"mam",        ty:"masz",        on:"ma"},
  tul:        {pl:"przychodzić",ja:"przychodzę", ty:"przychodzisz",on:"przychodzi"},
  hlar:       {pl:"słyszeć",    ja:"słyszę",     ty:"słyszysz",    on:"słyszy"},
  car:        {pl:"robić",      ja:"robię",      ty:"robisz",      on:"robi"},
  vala:       {pl:"rządzić",    ja:"rządzę",     ty:"rządzisz",    on:"rządzi"},
  tulta:      {pl:"wzywać",     ja:"wzywam",     ty:"wzywasz",     on:"wzywa"},
  nurta:      {pl:"ukrywać",    ja:"ukrywam",    ty:"ukrywasz",    on:"ukrywa"},
  caita:      {pl:"leżeć",      ja:"leżę",       ty:"leżysz",      on:"leży"},
  envinyata:  {pl:"uzdrawiać",  ja:"uzdrawiam",  ty:"uzdrawiasz",  on:"uzdrawia"},
  lanta:      {pl:"upadać",     ja:"upadam",     ty:"upadasz",     on:"upada"},
  orta:       {pl:"wstawać",    ja:"wstaję",     ty:"wstajesz",    on:"wstaje"},
};

// Przymiotniki: rodzaj męski/żeński/nijaki
const CORE_ADJ = {
  "mára":  {m:"dobry",   f:"dobra",   n:"dobre"},
  ulca:    {m:"zły",     f:"zła",     n:"złe"},
  alta:    {m:"duży",    f:"duża",    n:"duże"},
  pitya:   {m:"mały",    f:"mała",    n:"małe"},
  vanya:   {m:"piękny",  f:"piękna",  n:"piękne"},
  saila:   {m:"mądry",   f:"mądra",   n:"mądre"},
  linta:   {m:"szybki",  f:"szybka",  n:"szybkie"},
  lenca:   {m:"powolny", f:"powolna", n:"powolne"},
  "yára":  {m:"stary",   f:"stara",   n:"stare"},
  "nessë": {m:"młody",   f:"młoda",   n:"młode"},
  "urëa":  {m:"gorący",  f:"gorąca",  n:"gorące"},
  ringa:   {m:"zimny",   f:"zimna",   n:"zimne"},
  polda:   {m:"silny",   f:"silna",   n:"silne"},
  calima:  {m:"jasny",   f:"jasna",   n:"jasne"},
  "lissë": {m:"słodki",  f:"słodka",  n:"słodkie"},
  "ninquë":{m:"biały",   f:"biała",   n:"białe"},
  morna:   {m:"czarny",  f:"czarna",  n:"czarne"},
  "carnë": {m:"czerwony",f:"czerwona",n:"czerwone"},
  "laiquë":{m:"zielony", f:"zielona", n:"zielone"},
  "luinë": {m:"niebieski",f:"niebieska",n:"niebieskie"},
  malina:  {m:"żółty",   f:"żółta",   n:"żółte"},
  sinda:   {m:"szary",   f:"szara",   n:"szare"},
};

// Zaimki: mianownik i biernik, z osobą/rodzajem potrzebnym do wyboru form czasownika/przymiotnika
const PRON_NOM = {
  ja:  {q:"ni",  person:"ja"},
  ty:  {q:"elyë",person:"ty"},
  on:  {q:"se",  person:"on", gender:"m"},
  ona: {q:"se",  person:"on", gender:"f"},
  ono: {q:"se",  person:"on", gender:"n"},
  my:  {q:"me",  person:"my"},
  wy:  {q:"le",  person:"wy"},
  oni: {q:"te",  person:"oni", gender:"m"},
  one: {q:"te",  person:"oni", gender:"f"},
};
const PRON_ACC = { mnie:"ni", "cię":"elyë", ciebie:"elyë", go:"se", "ją":"se", je:"se", nas:"me", was:"le", ich:"te" };
// Odwrotny kierunek: quenya zaimek -> domyślne polskie słowo (mianownik/biernik)
const PRON_Q2PL_NOM = { ni:"ja", "elyë":"ty", se:"on", me:"my", ve:"my", le:"wy", te:"oni" };
const PRON_Q2PL_ACC = { ni:"mnie", "elyë":"cię", se:"go", me:"nas", ve:"nas", le:"was", te:"ich" };
const COPULA_BY_PERSON = { ja:"jestem", ty:"jesteś", on:"jest", my:"jesteśmy", wy:"jesteście", oni:"są" };

/* ---------------------------------------------------------------------
   8. SILNIK SKŁADNI: POLSKI → QUENYA
--------------------------------------------------------------------- */
function findVerbByForm(word){
  for(const id in CORE_VERBS){
    const v = CORE_VERBS[id];
    if(v.ja===word) return {id, person:"ja"};
    if(v.ty===word) return {id, person:"ty"};
    if(v.on===word) return {id, person:"on"};
  }
  return null;
}
function findAdjByForm(word){
  for(const id in CORE_ADJ){
    const a = CORE_ADJ[id];
    if(a.m===word || a.f===word || a.n===word) return id;
  }
  return null;
}
function findNounByNom(word){
  for(const id in CORE_NOUNS){ if(CORE_NOUNS[id].pl===word) return id; }
  return null;
}
function findNounByAcc(word){
  for(const id in CORE_NOUNS){ if(CORE_NOUNS[id].acc===word) return id; }
  return null;
}
function findNounByGen(word){
  for(const id in CORE_NOUNS){ if(CORE_NOUNS[id].gen===word) return id; }
  return null;
}
function verbDictEntry(id){ return DICT.find(e=>e.q===id && e.pos==="v"); }

function tokenizePl(text){
  const isQuestion = /\?\s*$/.test(text.trim());
  const clean = text.toLowerCase().replace(/[.!?]/g,"").trim();
  const tokens = clean.length ? clean.split(/\s+/) : [];
  return {tokens, isQuestion};
}

const COPULA_FORMS = ["jestem","jesteś","jest","jesteśmy","jesteście","są"];
const COPULA_PERSON = {jestem:"ja",jesteś:"ty",jest:"on",jesteśmy:"my",jesteście:"wy",są:"oni"};

function translatePlToQuenya(text){
  let {tokens, isQuestion} = tokenizePl(text);
  if(tokens.length===0) return {error:"Wpisz jakieś zdanie."};

  let negation = false;
  if(tokens[0]==="nie"){ negation = true; tokens = tokens.slice(1); }

  let qWord = null; // 'kto' | 'co'
  if(tokens[0]==="kto" || tokens[0]==="co"){ qWord = tokens[0]; tokens = tokens.slice(1); }

  if(tokens.length===0) return {error:"Za mało słów po usunięciu przeczenia/zaimka pytającego."};

  // --- wzorzec: orzecznik przymiotnikowy (X jest/są Y) ---
  const copulaIdx = tokens.findIndex(t=>COPULA_FORMS.includes(t));
  if(copulaIdx !== -1){
    const person = COPULA_PERSON[tokens[copulaIdx]];
    const subjTokens = tokens.slice(0,copulaIdx);
    const predTokens = tokens.slice(copulaIdx+1);
    if(predTokens.length===0) return {error:`Brak przymiotnika po „${tokens[copulaIdx]}".`};

    let subjQ, subjGender;
    if(qWord){ subjQ = qWord==="kto" ? "man" : "mana"; }
    else if(subjTokens.length===0){
      const pron = Object.values(PRON_NOM).find(p=>p.person===person && !("gender" in p) ) || {ja:PRON_NOM.ja,ty:PRON_NOM.ty,my:PRON_NOM.my,wy:PRON_NOM.wy}[person];
      if(!pron) return {error:`Nie mogę ustalić podmiotu — dodaj zaimek lub rzeczownik przed „${tokens[copulaIdx]}".`};
      subjQ = pron.q;
    } else {
      const w = subjTokens.join(" ");
      if(PRON_NOM[w]){ subjQ = PRON_NOM[w].q; subjGender = PRON_NOM[w].gender; }
      else {
        const nid = findNounByNom(w);
        if(!nid) return {error:`Nierozpoznany podmiot: „${w}". Sprawdź listę rozpoznawanego słownictwa niżej.`};
        subjQ = nid; subjGender = CORE_NOUNS[nid].gender;
      }
    }

    const adjWord = predTokens.join(" ");
    const adjId = findAdjByForm(adjWord);
    if(!adjId) return {error:`Nierozpoznany przymiotnik: „${adjWord}". Sprawdź listę rozpoznawanego słownictwa niżej.`};

    const copulaQ = (negation ? "ú" : "") + "ná";
    const out = `${subjQ} ${copulaQ} ${adjId}${isQuestion || qWord ? "?" : "."}`;
    return {
      quenya: out,
      gloss: `${subjQ} = podmiot, ná = jest (copula)${negation?" z przeczeniem ú- (forma niepewna)":""}, ${adjId} = ${CORE_ADJ[adjId].m} (quenya nie odmienia przymiotnika przez rodzaj)`,
    };
  }

  // --- wzorzec: podmiot + czasownik (+ dopełnienie) ---
  let verbIdx = -1, verbMatch = null;
  for(let i=0;i<tokens.length;i++){
    const m = findVerbByForm(tokens[i]);
    if(m){ verbIdx = i; verbMatch = m; break; }
  }
  if(verbIdx !== -1){
    const subjTokens = tokens.slice(0,verbIdx);
    const objTokens = tokens.slice(verbIdx+1);
    const verbEntry = verbDictEntry(verbMatch.id);
    const verbQ = conjugate(verbMatch.id, verbEntry.c, "aorist");

    // Ustal podmiot — jeśli zaimek pytający stoi na początku, rozstrzygamy
    // czy pełni rolę podmiotu czy dopełnienia na podstawie jednoznaczności
    // formy czasownika (ja/ty są jednoznaczne — wtedy pytajnik to dopełnienie).
    let subjQ, isObjQWord = false;
    if(qWord && subjTokens.length===0){
      if(verbMatch.person==="on"){ subjQ = qWord==="kto" ? "man" : "mana"; }
      else { subjQ = PRON_NOM[verbMatch.person] ? PRON_NOM[verbMatch.person].q : null; isObjQWord = true; }
    } else if(subjTokens.length===0){
      const map = {ja:"ni", ty:"elyë"};
      subjQ = map[verbMatch.person] || "se";
    } else {
      const w = subjTokens.join(" ");
      if(PRON_NOM[w]) subjQ = PRON_NOM[w].q;
      else {
        const nid = findNounByNom(w);
        if(!nid) return {error:`Nierozpoznany podmiot: „${w}". Sprawdź listę rozpoznawanego słownictwa niżej.`};
        subjQ = nid;
      }
    }
    if(!subjQ) return {error:"Nie udało się ustalić podmiotu zdania."};

    let objQ = null, objGlossPart = "";
    if(isObjQWord){
      objQ = qWord==="kto" ? "man" : "mana";
    } else if(objTokens.length>0){
      const w = objTokens.join(" ");
      if(PRON_ACC[w]) objQ = PRON_ACC[w];
      else {
        const nid = findNounByAcc(w);
        if(!nid) return {error:`Nierozpoznane dopełnienie: „${w}". Sprawdź listę rozpoznawanego słownictwa niżej.`};
        objQ = declineSingular(nid, "acc");
      }
    }

    const verbOut = (negation ? "ú" : "") + verbQ;
    const parts = [subjQ, verbOut];
    if(objQ) parts.push(objQ);
    const out = parts.join(" ") + (isQuestion || qWord ? "?" : ".");
    return {
      quenya: out,
      gloss: `${subjQ} = podmiot, ${verbOut} = ${CORE_VERBS[verbMatch.id].pl} (aoryst${negation?", przeczenie ú- niepewne":""})${objQ?`, ${objQ} = dopełnienie (biernik)`:""}`,
    };
  }

  // --- wzorzec (fraza, nie zdanie): przymiotnik + rzeczownik ---
  if(tokens.length===2){
    const adjId = findAdjByForm(tokens[0]);
    const nomId = findNounByNom(tokens[1]);
    if(adjId && nomId){
      return {quenya: `${adjId} ${nomId}`, gloss:`${adjId} ${nomId} — przymiotnik poprzedza rzeczownik w quenya (fraza, nie pełne zdanie)`, isPhrase:true};
    }
    // --- wzorzec (fraza): rzeczownik + rzeczownik (dzierżawczość, dopełniacz) ---
    const n1 = findNounByNom(tokens[0]);
    const n2 = findNounByGen(tokens[1]);
    if(n1 && n2){
      return {quenya: `${n1} ${declineSingular(n2,"gen")}`, gloss:`${n1} ${declineSingular(n2,"gen")} — dosłownie „${CORE_NOUNS[n1].pl} ${CORE_NOUNS[n2].gen}" (dzierżawczość przez dopełniacz)`, isPhrase:true};
    }
  }

  return {error: `Nie rozpoznano wzorca zdania. Obsługiwane wzorce: „Podmiot + czasownik (+ dopełnienie)", „Podmiot + jest + przymiotnik", pytania z kto/co, oraz frazy „przymiotnik + rzeczownik" i „rzeczownik + rzeczownik" (dzierżawczość). Sprawdź listę rozpoznawanego słownictwa niżej.`};
}

/* ---------------------------------------------------------------------
   9. SILNIK SKŁADNI: QUENYA → POLSKI
--------------------------------------------------------------------- */
function classifyQToken(raw){
  let neg = false;
  let tok = raw;
  const tryMatch = (t) => {
    if(PRON_Q2PL_NOM[t]) return {type:"pron", q:t};
    if(t==="ná") return {type:"copula"};
    if(t==="man") return {type:"qword", pl:"kto"};
    if(t==="mana") return {type:"qword", pl:"co"};
    if(CORE_VERBS[t]) return {type:"verb", id:t, tense:"aorist"};
    if(CORE_ADJ[t]) return {type:"adj", id:t};
    if(CORE_NOUNS[t]) return {type:"noun", id:t, case:"nom"};
    // sprawdź odmienione formy czasownika (pozostałe czasy)
    for(const id in CORE_VERBS){
      const entry = verbDictEntry(id);
      if(!entry) continue;
      for(const tinfo of TENSES){
        if(conjugate(id, entry.c, tinfo.k) === t) return {type:"verb", id, tense:tinfo.k};
      }
    }
    // sprawdź odmienione formy rzeczownika (biernik/dopełniacz i inne przypadki)
    for(const id in CORE_NOUNS){
      for(const c of CASES){
        if(declineSingular(id, c.k) === t) return {type:"noun", id, case:c.k};
      }
    }
    // sprawdź liczbę mnogą przymiotnika
    for(const id in CORE_ADJ){ if(adjectivePlural(id) === t) return {type:"adj", id}; }
    return null;
  };

  let res = tryMatch(tok);
  if(!res && tok.startsWith("ú") && tok.length>1){
    res = tryMatch(tok.slice(1));
    if(res) neg = true;
  }
  return res ? Object.assign({neg}, res) : {type:"unknown", raw};
}

function translateQuenyaToPl(text){
  const isQuestion = /\?\s*$/.test(text.trim());
  const clean = text.replace(/[.!?]/g,"").trim();
  if(!clean) return {error:"Wpisz jakieś zdanie."};
  const rawTokens = clean.split(/\s+/);
  const roles = rawTokens.map(classifyQToken);

  const unknown = roles.find(r=>r.type==="unknown");
  if(unknown) return {error:`Nierozpoznane słowo: „${unknown.raw}". Sprawdź listę rozpoznawanego słownictwa niżej.`};

  const copulaIdx = roles.findIndex(r=>r.type==="copula");
  if(copulaIdx !== -1){
    const subjRoles = roles.slice(0,copulaIdx);
    const predRoles = roles.slice(copulaIdx+1);
    const negation = roles[copulaIdx].neg;
    if(subjRoles.length!==1) return {error:"Oczekiwano dokładnie jednego podmiotu przed ná."};
    const adjRole = predRoles.find(r=>r.type==="adj");
    if(!adjRole) return {error:"Nie znaleziono przymiotnika po ná."};

    const s = subjRoles[0];
    let subjPl, person, gender;
    if(s.type==="pron"){ subjPl = PRON_Q2PL_NOM[s.q]; person = subjPl; gender = ["my","wy","oni"].includes(subjPl) ? "n" : "m"; }
    else if(s.type==="qword"){ subjPl = s.pl; person="on"; gender = s.pl==="co" ? "n" : "m"; }
    else if(s.type==="noun"){ subjPl = CORE_NOUNS[s.id].pl; person="on"; gender=CORE_NOUNS[s.id].gender; }
    else return {error:"Nierozpoznany podmiot przed ná."};

    const copulaPl = COPULA_BY_PERSON[person] || "jest";
    const adjPl = CORE_ADJ[adjRole.id][gender] || CORE_ADJ[adjRole.id].m;
    const negTxt = negation ? "nie " : "";
    const sentence = `${subjPl[0].toUpperCase()}${subjPl.slice(1)} ${negTxt}${copulaPl} ${adjPl}${isQuestion?"?":"."}`;
    return {polish: sentence, gloss:`ná = jest${negation?" (przeczenie ú- — forma niepewna)":""}; forma przymiotnika (rodzaj/liczba) w polskim dobrana wg podmiotu — quenya tego nie oznacza`};
  }

  const verbIdx = roles.findIndex(r=>r.type==="verb");
  if(verbIdx !== -1){
    const subjRoles = roles.slice(0,verbIdx);
    const objRoles = roles.slice(verbIdx+1);
    const vRole = roles[verbIdx];
    const verbInfo = CORE_VERBS[vRole.id];

    let subjPl, person = "on";
    if(subjRoles.length===0) return {error:"Brak podmiotu — quenya nie oznacza osoby na czasowniku, więc potrzebny jest zaimek/rzeczownik przed czasownikiem (np. ni, elyë, se…)."};
    if(subjRoles.length===1 && subjRoles[0].type==="pron"){
      subjPl = PRON_Q2PL_NOM[subjRoles[0].q];
      person = ["ja","ty"].includes(subjPl) ? subjPl : "on";
    } else if(subjRoles.length===1 && subjRoles[0].type==="qword"){
      subjPl = subjRoles[0].pl; person = "on";
    } else if(subjRoles.length===1 && subjRoles[0].type==="noun"){
      subjPl = CORE_NOUNS[subjRoles[0].id].pl; person = "on";
    } else return {error:"Nie rozpoznano podmiotu przed czasownikiem."};

    let verbPl;
    let tenseNote = "";
    if(vRole.tense === "aorist"){ verbPl = verbInfo[person]; }
    else {
      const tenseLabel = TENSES.find(t=>t.k===vRole.tense).pl.toLowerCase();
      verbPl = verbInfo.on; // przybliżenie orientacyjne
      tenseNote = ` (uwaga: quenya użyło czasu „${tenseLabel}" — w tłumaczeniu pokazana forma teraźniejsza jako przybliżenie)`;
    }
    if(vRole.neg) verbPl = "nie " + verbPl;

    let objPl = "";
    if(objRoles.length===1){
      const o = objRoles[0];
      if(o.type==="pron") objPl = " " + PRON_Q2PL_ACC[o.q];
      else if(o.type==="qword") objPl = " " + o.pl;
      else if(o.type==="noun") objPl = " " + (CORE_NOUNS[o.id].acc || CORE_NOUNS[o.id].pl);
    } else if(objRoles.length>1){
      return {error:"Rozpoznaję tylko jedno dopełnienie po czasowniku."};
    }

    const sentence = `${subjPl[0].toUpperCase()}${subjPl.slice(1)} ${verbPl}${objPl}${isQuestion?"?":"."}`;
    return {polish: sentence, gloss:`${vRole.id}- = ${verbInfo.pl}${tenseNote}`};
  }

  // fraza: przymiotnik + rzeczownik / rzeczownik + rzeczownik(dopełniacz)
  if(roles.length===2){
    if(roles[0].type==="adj" && roles[1].type==="noun" && roles[1].case==="nom"){
      const adjPl = CORE_ADJ[roles[0].id][CORE_NOUNS[roles[1].id].gender] || CORE_ADJ[roles[0].id].m;
      return {polish: `${adjPl} ${CORE_NOUNS[roles[1].id].pl}`, gloss:"fraza: przymiotnik + rzeczownik", isPhrase:true};
    }
    if(roles[0].type==="noun" && roles[0].case==="nom" && roles[1].type==="noun" && roles[1].case==="gen"){
      return {polish: `${CORE_NOUNS[roles[0].id].pl} ${CORE_NOUNS[roles[1].id].gen}`, gloss:"fraza: dzierżawczość (dopełniacz)", isPhrase:true};
    }
  }

  return {error:"Nie rozpoznano struktury zdania (brak ná ani rozpoznanego czasownika). Sprawdź listę rozpoznawanego słownictwa niżej."};
}

/* ---------------------------------------------------------------------
   10. KOMPOZYTOR ZDAŃ — UI
--------------------------------------------------------------------- */
function renderSentenceResult(container, result, direction){
  if(result.error){
    container.innerHTML = `<div class="sentence-error">${escapeHtml(result.error)}</div>`;
    return;
  }
  if(direction==="pl2q"){
    container.innerHTML = `<div class="sentence-result">
      <span class="result-q">${escapeHtml(result.quenya)}</span>
      ${result.gloss ? `<span class="result-gloss">${escapeHtml(result.gloss)}</span>` : ""}
    </div>`;
  } else {
    container.innerHTML = `<div class="sentence-result">
      <span class="result-pl">${escapeHtml(result.polish)}</span>
      ${result.gloss ? `<span class="result-gloss">${escapeHtml(result.gloss)}</span>` : ""}
    </div>`;
  }
}

const plInput = $("#plInput");
const qInput = $("#qInput");
if(plInput && qInput){
  $("#plToQButton").addEventListener("click", ()=>{
    const result = translatePlToQuenya(plInput.value);
    renderSentenceResult($("#plToQOutput"), result, "pl2q");
  });
  $("#qToPlButton").addEventListener("click", ()=>{
    const result = translateQuenyaToPl(qInput.value);
    renderSentenceResult($("#qToPlOutput"), result, "q2pl");
  });
  plInput.addEventListener("keydown", e=>{ if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); $("#plToQButton").click(); } });
  qInput.addEventListener("keydown", e=>{ if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); $("#qToPlButton").click(); } });
}

// Lista rozpoznawanego słownictwa (do <details> w sekcji kompozytora)
const vocabListEl = $("#sentenceVocabList");
if(vocabListEl){
  const nounChips = Object.keys(CORE_NOUNS).map(id=>`<div class="vocab-chip"><span class="q-form">${id}</span> — ${CORE_NOUNS[id].pl}</div>`).join("");
  const verbChips = Object.keys(CORE_VERBS).map(id=>`<div class="vocab-chip"><span class="q-form">${id}-</span> — ${CORE_VERBS[id].pl}</div>`).join("");
  const adjChips = Object.keys(CORE_ADJ).map(id=>`<div class="vocab-chip"><span class="q-form">${id}</span> — ${CORE_ADJ[id].m}</div>`).join("");
  vocabListEl.innerHTML = `
    <div class="vocab-group"><h5>Rzeczowniki (${Object.keys(CORE_NOUNS).length})</h5>${nounChips}</div>
    <div class="vocab-group"><h5>Czasowniki (${Object.keys(CORE_VERBS).length})</h5>${verbChips}</div>
    <div class="vocab-group"><h5>Przymiotniki (${Object.keys(CORE_ADJ).length})</h5>${adjChips}</div>
  `;
}
