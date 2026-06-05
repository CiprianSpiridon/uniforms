/* =================================================================
   Mumzworld × Threads uniform landing page — interactivity
   Data: window.UNIFORM_DATA (see data.js). Vanilla JS, no deps.
   ================================================================= */
(() => {
  'use strict';
  const D = window.UNIFORM_DATA || {};
  const SCHOOLS = D.schools || [];
  const YEARS = D.yearCategories || [];
  const UNIFORMS = D.uniformProducts || [];
  const RAILS = D.crossSellRails || [];

  /* ---------- tiny helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const money = (n) => 'AED ' + Number(n).toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };
  const initials = (name) => name.replace(/[^A-Za-z ]/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'S';
  const SHIRT_SVG = '<span class="pcard__ph"><svg viewBox="0 0 24 24"><path d="M4 7l4-3 2 2h4l2-2 4 3-3 3v8H7v-8z"/></svg></span>';
  const phSpan = () => { const s = document.createElement('span'); s.className = 'pcard__ph'; s.innerHTML = '<svg viewBox="0 0 24 24"><path d="M4 7l4-3 2 2h4l2-2 4 3-3 3v8H7v-8z"/></svg>'; return s; };
  const wireImgFallback = (root) => root.querySelectorAll('img').forEach((im) => im.addEventListener('error', () => im.replaceWith(phSpan()), { once: true }));
  const PLUS = '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>';
  const STAR = '<svg viewBox="0 0 24 24"><path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19l1-5.8L3.5 9l5.9-.9z"/></svg>';
  const TRUCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h11v8H3z"/><path d="M14 10h4l3 3v2h-7z"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/></svg>';
  const HEART = '<svg viewBox="0 0 24 24"><path d="M12 21s-7-4.5-9.5-9A5 5 0 0 1 12 6a5 5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z"/></svg>';

  /* deterministic demo discount / rating so the cards look like real Mumzworld cards */
  const promoFor = (key, price) => {
    const h = hash(key);
    const out = { rating: (4.2 + (h % 8) / 10).toFixed(1), reviews: 15 + (h % 480) };
    if (h % 100 < 55) { const d = 10 + (h % 6) * 5; out.disc = d; out.was = Math.round((price / (1 - d / 100)) * 100) / 100; }
    return out;
  };

  /* ---------- state ---------- */
  const state = { school: null, year: null, gender: null, emirate: 'All', activeStep: 'school', cart: new Map(), wish: new Set() };

  /* =====================================================
     UTILITY BAR rotation
     ===================================================== */
  (() => {
    const msgs = $$('#utilityMsgs li'); if (!msgs.length) return;
    let i = 0; msgs[0].classList.add('is-on');
    setInterval(() => { msgs[i].classList.remove('is-on'); i = (i + 1) % msgs.length; msgs[i].classList.add('is-on'); }, 3500);
  })();

  /* =====================================================
     HERO carousel
     ===================================================== */
  (() => {
    const slides = [
      { eyebrow: 'Back to School 2026', title: 'School uniforms, sorted in minutes', sub: 'Pick your school, year and child — we line up the exact kit plus everything else they need for the new term.', cta: 'Find your school', bg: 'radial-gradient(120% 140% at 85% 15%,#FF3D86 0%,#E50056 42%,#9C0037 100%)' },
      { eyebrow: 'Bundle & save', title: 'Build the whole kit in one tap', sub: 'Core, PE and winter uniform bundled — plus lunch boxes, bottles and labels from Mumzworld.', cta: 'Shop the bundles', bg: 'radial-gradient(120% 140% at 85% 15%,#0a78c4 0%,#004372 60%,#012c4c 100%)' },
      { eyebrow: '70+ UAE schools', title: 'Official, school-approved uniforms', sub: 'From FS 1 to Year 13 — across Dubai, Abu Dhabi, Sharjah and beyond.', bg: 'radial-gradient(120% 140% at 85% 15%,#12b06a 0%,#009246 55%,#0a6e4f 100%)', cta: 'Get started' }
    ];
    const track = $('#heroTrack'), dots = $('#heroDots');
    track.innerHTML = slides.map((s) => `
      <div class="hero__slide" style="background:${s.bg}" role="group" aria-roledescription="slide">
        <div class="hero__deco" aria-hidden="true"><span></span><span></span><span></span></div>
        <div class="hero__slide-content">
          <span class="hero__eyebrow">${esc(s.eyebrow)}</span>
          <h1 class="hero__title">${esc(s.title)}</h1>
          <p class="hero__sub">${esc(s.sub)}</p>
          <div class="hero__cta"><button class="btn btn--primary" data-hero-cta>${esc(s.cta)} →</button></div>
        </div>
      </div>`).join('');
    dots.innerHTML = slides.map((_, i) => `<button role="tab" aria-label="Slide ${i + 1}"></button>`).join('');
    const dotEls = $$('button', dots);
    let idx = 0, timer;
    const go = (n) => {
      idx = (n + slides.length) % slides.length;
      track.style.transform = `translateX(${document.dir === 'rtl' ? '' : '-'}${idx * 100}%)`;
      dotEls.forEach((d, i) => d.classList.toggle('is-on', i === idx));
    };
    const auto = () => { clearInterval(timer); timer = setInterval(() => go(idx + 1), 5000); };
    $('#heroNext').onclick = () => { go(idx + 1); auto(); };
    $('#heroPrev').onclick = () => { go(idx - 1); auto(); };
    dotEls.forEach((d, i) => (d.onclick = () => { go(i); auto(); }));
    track.addEventListener('click', (e) => { if (e.target.closest('[data-hero-cta]')) startJourney(); });
    go(0); auto();
  })();

  function startJourney() {
    document.getElementById('step-school').scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => $('#schoolSearch').focus(), 400);
  }

  /* =====================================================
     PRODUCT CARD
     ===================================================== */
  function productCard(p, key) {
    const id = key || p.url || p.name;
    const media = p.image
      ? `<img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">`
      : SHIRT_SVG;
    const disc = p.discountPct, was = p.originalPriceAed;
    const badges = [];
    if (disc) badges.push(`<span class="badge badge--disc">-${disc}%</span>`);
    if (p.tag) badges.push(`<span class="badge badge--tag">${esc(p.tag)}</span>`);
    const wished = state.wish.has(id) ? ' is-on' : '';
    const priceBits = `<span class="pcard__now">${money(p.priceAed)}</span>` +
      (was && disc ? `<span class="pcard__was">${money(was)}</span><span class="pcard__disc">-${disc}%</span>` : '');
    const ratingRow = p.rating ? `<span class="pcard__rating">${STAR}<strong>${p.rating}</strong> <span>(${p.reviews || 0})</span></span>` : '';
    const li = document.createElement('li');
    li.className = 'pcard';
    li.innerHTML = `
      <div class="pcard__media">
        ${media}
        <div class="pcard__badges">${badges.join('')}</div>
        <button class="wish${wished}" type="button" aria-label="Add to wishlist" data-wish>${HEART}</button>
        <button class="pcard__add" type="button" aria-label="Add ${esc(p.name)} to cart" data-add>${PLUS}</button>
      </div>
      <div class="pcard__body">
        ${p.brand ? `<span class="pcard__brand">${esc(p.brand)}</span>` : ''}
        <span class="pcard__name">${esc(p.name)}</span>
        ${ratingRow}
        <span class="pcard__price">${priceBits}</span>
        <span class="pcard__deliver">${TRUCK} by ${deliverDate()}</span>
      </div>`;
    li.querySelector('[data-add]').onclick = () => addToCart({ id, name: p.name, brand: p.brand, priceAed: p.priceAed, image: p.image });
    const w = li.querySelector('[data-wish]');
    w.onclick = () => { state.wish.has(id) ? state.wish.delete(id) : state.wish.add(id); w.classList.toggle('is-on'); };
    wireImgFallback(li);
    return li;
  }
  function deliverDate() { const d = new Date(2026, 7, 18); return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); }

  /* =====================================================
     STEP 1 — SCHOOL
     ===================================================== */
  const EMIRATES = ['All', 'Dubai', 'Abu Dhabi', 'Sharjah', 'Al Ain', 'Ras Al Khaimah', 'Fujairah'];
  function crestMarkup(s, cls) {
    return s.hasLogo && s.logo
      ? `<img src="${esc(s.logo)}" alt="" onerror="this.replaceWith(document.createTextNode('${initials(s.name)}'))">`
      : initials(s.name);
  }
  function renderEmirateChips() {
    const wrap = $('#emirateChips');
    wrap.innerHTML = EMIRATES.map((e) => {
      const n = e === 'All' ? SCHOOLS.length : SCHOOLS.filter((s) => s.emirate === e).length;
      if (e !== 'All' && !n) return '';
      return `<button class="chip${e === state.emirate ? ' is-on' : ''}" data-emirate="${esc(e)}">${esc(e)}<span class="chip__count">${n}</span></button>`;
    }).join('');
    $$('[data-emirate]', wrap).forEach((b) => (b.onclick = () => { state.emirate = b.dataset.emirate; renderEmirateChips(); renderPopular(); }));
  }
  function renderPopular() {
    const list = state.emirate === 'All' ? SCHOOLS : SCHOOLS.filter((s) => s.emirate === state.emirate);
    // surface schools with logos first (nicer crests), keep it to a sensible scroller length
    const ordered = [...list].sort((a, b) => (b.hasLogo - a.hasLogo) || a.name.localeCompare(b.name)).slice(0, 24);
    const ul = $('#popularSchools');
    ul.innerHTML = ordered.map((s) => `
      <li><button class="crest" data-school="${s.id}" title="${esc(s.name)}">
        <span class="crest__badge">${crestMarkup(s)}</span>
        <span class="crest__name">${esc(s.name)}</span>
        <span class="crest__loc">${esc(s.emirate)}</span>
      </button></li>`).join('');
    $$('[data-school]', ul).forEach((b) => (b.onclick = () => selectSchool(SCHOOLS.find((s) => s.id == b.dataset.school))));
    refreshScrollers();
  }
  /* autocomplete */
  (() => {
    const input = $('#schoolSearch'), box = $('#schoolResults'), clear = $('#schoolClear');
    let active = -1, current = [];
    const close = () => { box.hidden = true; input.setAttribute('aria-expanded', 'false'); active = -1; };
    const render = (q) => {
      const needle = q.trim().toLowerCase();
      current = needle ? SCHOOLS.filter((s) => s.name.toLowerCase().includes(needle)).slice(0, 8) : [];
      clear.hidden = !q;
      if (!needle) return close();
      if (!current.length) { box.innerHTML = `<li class="schoolpick__noresult">No school matches “${esc(q)}”. Try another spelling.</li>`; box.hidden = false; input.setAttribute('aria-expanded', 'true'); return; }
      box.innerHTML = current.map((s, i) => {
        const hl = s.name.replace(new RegExp('(' + needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '<mark>$1</mark>');
        return `<li role="option" data-i="${i}"><span class="crest-sm">${crestMarkup(s)}</span><span><span class="r-name">${hl}</span><br><span class="r-meta">${esc(s.emirate)} · ${esc(s.curriculum)}</span></span></li>`;
      }).join('');
      box.hidden = false; input.setAttribute('aria-expanded', 'true'); active = -1;
      $$('li[role=option]', box).forEach((li) => (li.onclick = () => selectSchool(current[+li.dataset.i])));
    };
    input.addEventListener('input', () => render(input.value));
    input.addEventListener('keydown', (e) => {
      const opts = $$('li[role=option]', box);
      if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(active + 1, opts.length - 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(active - 1, 0); }
      else if (e.key === 'Enter') { if (current[active]) { e.preventDefault(); selectSchool(current[active]); } else if (current[0]) { e.preventDefault(); selectSchool(current[0]); } return; }
      else if (e.key === 'Escape') { close(); return; }
      opts.forEach((o, i) => o.classList.toggle('is-active', i === active));
    });
    clear.onclick = () => { input.value = ''; close(); input.focus(); };
    document.addEventListener('click', (e) => { if (!e.target.closest('.schoolpick__search')) close(); });
  })();

  /* =====================================================
     STEP transitions
     ===================================================== */
  function reveal(stepEl) { stepEl.classList.remove('is-locked'); stepEl.setAttribute('aria-hidden', 'false'); stepEl.classList.add('reveal'); }
  // Single-step wizard: only the active step (or shop) is shown; the rest collapse into the progress bar + breadcrumb.
  function goToStep(name, noScroll) {
    state.activeStep = name;
    ['school', 'year', 'gender', 'shop'].forEach((s) => {
      const el = document.getElementById('step-' + s); if (!el) return;
      const show = s === name;
      el.classList.toggle('is-locked', !show);
      el.setAttribute('aria-hidden', show ? 'false' : 'true');
      if (show) { el.classList.remove('reveal'); void el.offsetWidth; el.classList.add('reveal'); }
    });
    setStepper();
    if (!noScroll) setTimeout(() => {
      const j = document.getElementById('journey'); if (!j) return;
      const y = j.getBoundingClientRect().top + window.scrollY - 60; // clear the sticky header
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    }, 40);
  }
  function setStepper() {
    const done = { school: !!state.school, year: !!state.year, gender: !!state.gender };
    ['school', 'year', 'gender', 'shop'].forEach((k) => {
      const it = $(`.progress__step[data-step="${k}"]`); if (!it) return;
      it.classList.toggle('is-current', k === state.activeStep);
      it.classList.toggle('is-done', !!done[k] && k !== state.activeStep);
    });
    updateCrumbs();
  }
  const cap = (g) => g.charAt(0) + g.slice(1).toLowerCase();
  const shortSchool = (n) => n.split(' - ')[0];
  function updateCrumbs() {
    const trail = $('#crumbTrail'); if (!trail) return;
    let h = '';
    if (state.school) h += `<span class="crumbs__sep">/</span><a href="#step-school" class="crumbs__crumb" data-goto="school">${esc(shortSchool(state.school.name))}</a>`;
    if (state.year) h += `<span class="crumbs__sep">/</span><a href="#step-year" class="crumbs__crumb" data-goto="year">${esc(state.year.name)}</a>`;
    if (state.gender) h += `<span class="crumbs__sep">/</span><a href="#step-gender" class="crumbs__crumb" data-goto="gender">${cap(state.gender)}</a>`;
    trail.innerHTML = h;
  }
  function updateURL() {
    const p = new URLSearchParams();
    if (state.school) p.set('school', state.school.slug);
    if (state.year) p.set('year', state.year.code);
    if (state.gender) p.set('gender', state.gender);
    const q = p.toString();
    try { history.replaceState(null, '', q ? ('?' + q) : location.pathname); } catch (e) {}
  }

  function selectSchool(s, silent) {
    if (!s) return; state.school = s; state.year = null; state.gender = null;
    $('#schoolResults').hidden = true; $('#schoolSearch').value = s.name; $('#schoolClear').hidden = false; $('#schoolSearch').setAttribute('aria-expanded', 'false');
    $('#ctxSchool').innerHTML = ctxRow(s, 'school');
    renderYears(); updateURL();
    if (!silent) goToStep('year');
  }
  function ctxRow(s, changeStep) {
    return `<span class="ctxbanner__crest">${crestMarkup(s)}</span>
      <span class="ctxbanner__meta"><strong>${esc(s.name)}</strong><span>${esc(s.emirate)} · ${esc(s.curriculum)} curriculum</span></span>
      <button class="ctxbanner__change" data-goto="${changeStep}">Change school</button>`;
  }
  function ctxYearRow() {
    const s = state.school; if (!s) return '';
    return `<span class="ctxbanner__crest">${crestMarkup(s)}</span>
      <span class="ctxbanner__meta"><strong>${esc(shortSchool(s.name))} · ${esc(state.year ? state.year.name : '')}</strong><span>${esc(s.emirate)} · ${esc(s.curriculum)} curriculum</span></span>
      <button class="ctxbanner__change" data-goto="year">Change year</button>`;
  }

  /* STEP 2 — YEAR */
  function renderYears() {
    const stages = [...new Set(YEARS.map((y) => y.stage))];
    const wrap = $('#yearGroups');
    wrap.innerHTML = stages.map((stage) => `
      <div class="yeargroup" data-stage="${esc(stage)}">
        <div class="yeargroup__label">${esc(stage)}</div>
        <div class="yeargroup__row">
          ${YEARS.filter((y) => y.stage === stage).map((y) => `
            <button class="yeartile${state.year && state.year.code === y.code ? ' is-on' : ''}" data-year="${y.code}">
              <span class="yeartile__name">${esc(y.name)}</span>
              <span class="yeartile__age">Ages ${esc(y.typicalAge)}</span>
            </button>`).join('')}
        </div>
      </div>`).join('');
    $$('[data-year]', wrap).forEach((b) => (b.onclick = () => selectYear(b.dataset.year)));
  }
  function selectYear(code, silent) {
    state.year = YEARS.find((y) => y.code === code); state.gender = null;
    renderYears(); updateURL();
    $('#ctxYear') && ($('#ctxYear').innerHTML = ctxYearRow());
    if (!silent) goToStep('gender');
  }

  /* STEP 3 — GENDER */
  (() => {
    const GICON = {
      GIRLS: '<svg viewBox="0 0 24 24"><path d="M12 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM9 7l-2 5h2l-1 9h8l-1-9h2l-2-5z"/></svg>',
      BOYS: '<svg viewBox="0 0 24 24"><path d="M8 3 4 6l2 3v11h12V9l2-3-4-3-2 2h-4z"/><path d="M10 5h4"/></svg>',
      UNISEX: '<svg viewBox="0 0 24 24"><path d="M9 3 4 7l2 2v11h12V9l2-2-5-4-2 2.5L9 3z"/></svg>'
    };
    const repImg = (g) => { const p = UNIFORMS.find((x) => x.gender === g && x.image); return p ? p.image : null; };
    const tiles = [
      { g: 'GIRLS', sub: 'Blouses, pinafores & skorts' },
      { g: 'BOYS', sub: 'Shirts, trousers & shorts' },
      { g: 'UNISEX', sub: 'Polos & shared basics' }
    ];
    $('#genderTiles').innerHTML = tiles.map((t) => {
      const img = repImg(t.g);
      const media = img ? `<img src="${esc(img)}" alt="">` : `<span class="gtile__ico">${GICON[t.g]}</span>`;
      return `<button class="gtile" data-g="${t.g}">
        <span class="gtile__media">${media}</span>
        <span class="gtile__body"><span class="gtile__name">${cap(t.g)}</span><span class="gtile__sub">${esc(t.sub)}</span><span class="gtile__pick">Choose ${cap(t.g)} →</span></span>
      </button>`;
    }).join('');
    $$('#genderTiles .gtile').forEach((b) => {
      const im = b.querySelector('.gtile__media img');
      if (im) im.addEventListener('error', () => { im.outerHTML = `<span class="gtile__ico">${GICON[b.dataset.g]}</span>`; }, { once: true });
      b.onclick = () => selectGender(b.dataset.g);
    });
  })();
  function selectGender(g, silent) {
    state.gender = g;
    $$('#genderTiles .gtile').forEach((t) => t.classList.toggle('is-on', t.dataset.g === g));
    renderShop(); updateURL();
    if (!silent) goToStep('shop');
  }
  function applyDeeplink() {
    const p = new URLSearchParams(location.search);
    const sl = p.get('school'); if (!sl) return false;
    const sc = SCHOOLS.find((s) => s.slug === sl); if (!sc) return false;
    selectSchool(sc, true);
    const yc = p.get('year'); if (yc && YEARS.find((y) => y.code === yc)) selectYear(yc, true);
    const g = p.get('gender'); if (g && ['BOYS', 'GIRLS', 'UNISEX'].includes(g)) selectGender(g, true);
    goToStep(state.gender ? 'shop' : state.year ? 'gender' : 'school', false);
    return true;
  }

  /* =====================================================
     STEP 4 — SHOP / SUGGESTIONS
     ===================================================== */
  const matchesYear = (years) => !years || !years.length || years.includes(state.year.code);
  const matchesGender = (g) => g === 'UNISEX' || g === state.gender;

  function uniformsForSelection() {
    return UNIFORMS.filter((p) => matchesYear(p.years) && matchesGender(p.gender));
  }

  function renderShop() {
    const s = state.school;
    $('#ctxSummary').innerHTML = `
      <span class="ctxbanner__crest">${crestMarkup(s)}</span>
      <span class="ctxbanner__meta"><strong>${esc(s.name)}</strong><span>${esc(state.year.name)} · ${cap(state.gender)} · ${esc(s.emirate)}</span></span>
      <button class="ctxbanner__change" data-goto="school">Start over</button>`;
    $('#uniformViewAll').href = s.url;
    $('#uniformViewAll').textContent = 'View all uniform at ' + s.name.split(' - ')[0];
    $('#uniformBannerTitle').textContent = `${state.year.name} ${cap(state.gender)} uniform`;

    renderBundles();
    // uniform rail
    const rail = $('#uniformRail');
    const items = uniformsForSelection();
    rail.innerHTML = '';
    if (items.length) items.forEach((p) => rail.appendChild(productCard(p, p.url)));
    else rail.innerHTML = `<li class="schoolpick__noresult">Full range for ${esc(state.year.name)} is on the school page — tap “View all”.</li>`;

    renderCrossSell();
    renderBrands();
    refreshScrollers();
  }

  function renderBundles() {
    const core = UNIFORMS.filter((p) => p.uniformType === 'CORE UNIFORM' && matchesYear(p.years) && matchesGender(p.gender));
    const pe = UNIFORMS.filter((p) => p.uniformType === 'PE' && matchesYear(p.years) && matchesGender(p.gender));
    const winter = UNIFORMS.filter((p) => p.uniformType === 'WINTER UNIFORM' && matchesYear(p.years) && matchesGender(p.gender));
    const essRail = activeRails().find((r) => r.key === 'lunch-hydration' || r.key === 'name-labels');
    const ess = essRail ? essRail.items.slice(0, 3) : [];

    const defs = [
      { tag: 'Most popular', name: 'Complete uniform bundle', desc: `Every core ${cap(state.gender).toLowerCase()} item for ${state.year.name}.`, items: core },
      { tag: 'PE ready', name: 'PE kit', desc: 'Sports polo, shorts & track basics.', items: pe },
      { tag: 'Winter', name: 'Winter set', desc: 'Stay-warm layers for cooler months.', items: winter },
      { tag: 'First day', name: 'First-day essentials', desc: 'Lunch, hydration & name labels from Mumzworld.', items: ess }
    ].filter((d) => d.items.length);

    $('#bundlePicks').innerHTML = defs.map((d, i) => {
      const sum = d.items.reduce((t, x) => t + x.priceAed, 0);
      const save = d.items.length >= 2;
      const now = save ? Math.round(sum * 0.9 * 100) / 100 : sum;
      return `<div class="pick">
        <span class="pick__tag">${esc(d.tag)}</span>
        <span class="pick__name">${esc(d.name)}</span>
        <span class="pick__desc">${esc(d.desc)} <em>${d.items.length} item${d.items.length > 1 ? 's' : ''}</em></span>
        <span class="pick__price"><span class="pick__now">${money(now)}</span>${save ? `<span class="pick__was">${money(sum)}</span><span class="pick__save">Save 10%</span>` : ''}</span>
        <button class="btn btn--primary" data-bundle="${i}">Add bundle</button>
      </div>`;
    }).join('') || `<p class="schoolpick__noresult">Bundles for this selection are on the school page.</p>`;

    $$('#bundlePicks [data-bundle]').forEach((b) => (b.onclick = () => {
      defs[+b.dataset.bundle].items.forEach((p) => addToCart({ id: p.url || p.name, name: p.name, brand: p.brand, priceAed: p.priceAed, image: p.image }, true));
      toast(`Added ${defs[+b.dataset.bundle].name} to bag`); updateCart();
    }));
  }

  function activeRails() {
    return RAILS.filter((r) => r.appliesTo.years.includes(state.year.code) && r.appliesTo.genders.includes(state.gender));
  }
  function renderCrossSell() {
    const fills = ['lavender', 'blue', 'green', 'amber', 'pink'];
    const host = $('#crossSellRails');
    const rails = activeRails();
    host.innerHTML = rails.map((r, i) => `
      <div class="container block">
        <div class="themed-banner" data-fill="${fills[i % fills.length]}">
          <div class="themed-banner__text"><strong>${esc(r.title)}</strong><span>${esc(r.subtitle || '')}</span></div>
        </div>
        <div class="scroller" data-scroller>
          <button class="carousel-arrow carousel-arrow--prev" data-scroll-prev aria-label="Scroll left" type="button"><svg viewBox="0 0 24 24"><path d="m15 6-6 6 6 6"/></svg></button>
          <ul class="scroller__track grid-rail" data-rail="${r.key}"></ul>
          <button class="carousel-arrow carousel-arrow--next" data-scroll-next aria-label="Scroll right" type="button"><svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg></button>
        </div>
      </div>`).join('');
    rails.forEach((r) => {
      const ul = host.querySelector(`[data-rail="${r.key}"]`);
      r.items.forEach((p) => ul.appendChild(productCard(p, p.url)));
    });
  }

  function renderBrands() {
    const brands = [...new Set(RAILS.flatMap((r) => r.items.map((i) => i.brand)).filter(Boolean))];
    $('#brandStrip').innerHTML = '<span class="pcard__brand" style="align-self:center">Mum-approved brands</span>' +
      brands.slice(0, 12).map((b) => `<span class="brandstrip__logo">${esc(b)}</span>`).join('');
  }

  /* =====================================================
     CART
     ===================================================== */
  function addToCart(item, silent) {
    const e = state.cart.get(item.id);
    if (e) e.qty++; else state.cart.set(item.id, { ...item, qty: 1 });
    if (!silent) { toast(`Added to bag`); updateCart(); }
  }
  function cartCount() { let n = 0; state.cart.forEach((e) => (n += e.qty)); return n; }
  function cartTotal() { let t = 0; state.cart.forEach((e) => (t += e.priceAed * e.qty)); return t; }
  function updateCart() {
    const n = cartCount();
    const badge = $('#cartCount'); badge.textContent = n; badge.hidden = !n;
    $('#drawerCount').textContent = `(${n})`;
    $('#drawerSubtotal').textContent = money(cartTotal());
    renderCartBody();
  }
  function renderCartBody() {
    const body = $('#drawerBody');
    if (!state.cart.size) {
      body.innerHTML = `<div class="drawer__empty"><svg viewBox="0 0 24 24"><path d="M6 6h15l-1.5 9h-12z"/><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M6 6 5 2H2"/></svg><p>Your bag is empty.<br>Pick a school to get started.</p></div>`;
      $('#drawerNudge').hidden = true; return;
    }
    body.innerHTML = '';
    state.cart.forEach((e, id) => {
      const row = document.createElement('div'); row.className = 'citem';
      row.innerHTML = `
        <div class="citem__media">${e.image ? `<img src="${esc(e.image)}" alt="">` : SHIRT_SVG}</div>
        <div class="citem__info">
          ${e.brand ? `<span class="citem__brand">${esc(e.brand)}</span>` : ''}
          <span class="citem__name">${esc(e.name)}</span>
          <div class="citem__row">
            <div class="qty"><button data-dec aria-label="Decrease">−</button><span>${e.qty}</span><button data-inc aria-label="Increase">+</button></div>
            <span class="citem__price">${money(e.priceAed * e.qty)}</span>
          </div>
          <button class="citem__remove" data-rm>Remove</button>
        </div>`;
      row.querySelector('[data-inc]').onclick = () => { e.qty++; updateCart(); };
      row.querySelector('[data-dec]').onclick = () => { e.qty--; if (e.qty <= 0) state.cart.delete(id); updateCart(); };
      row.querySelector('[data-rm]').onclick = () => { state.cart.delete(id); updateCart(); };
      wireImgFallback(row);
      body.appendChild(row);
    });
    renderNudge();
  }
  function renderNudge() {
    const nudge = $('#drawerNudge');
    const pool = (state.gender ? activeRails() : RAILS).flatMap((r) => r.items);
    const pick = pool.find((p) => !state.cart.has(p.url || p.name));
    if (!pick) { nudge.hidden = true; return; }
    nudge.hidden = false;
    nudge.innerHTML = `<h4>Frequently bought together</h4>
      <div class="nudge-item">
        ${pick.image ? `<img class="nudge-item" style="width:44px;height:44px" src="${esc(pick.image)}" alt="">` : `<span class="nudge-ph">${SHIRT_SVG}</span>`}
        <div><strong>${esc(pick.name)}</strong><span class="np">${money(pick.priceAed)}</span></div>
        <button class="nudge-add" data-nudge>Add</button>
      </div>`;
    nudge.querySelector('[data-nudge]').onclick = () => { addToCart({ id: pick.url || pick.name, name: pick.name, brand: pick.brand, priceAed: pick.priceAed, image: pick.image }); };
  }
  /* drawer open/close */
  const drawer = $('#cartDrawer'), scrim = $('#drawerScrim');
  function openCart() { drawer.classList.add('is-open'); drawer.setAttribute('aria-hidden', 'false'); scrim.hidden = false; document.body.style.overflow = 'hidden'; }
  function closeCart() { drawer.classList.remove('is-open'); drawer.setAttribute('aria-hidden', 'true'); scrim.hidden = true; document.body.style.overflow = ''; }
  $('#cartBtn').onclick = openCart; $('#drawerClose').onclick = closeCart; scrim.onclick = closeCart;
  $('#checkoutBtn').onclick = () => toast(state.cart.size ? 'Demo — checkout would open here' : 'Your bag is empty');
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeCart(); });

  /* =====================================================
     SCROLLERS (Embla-style arrows + snap)
     ===================================================== */
  function refreshScrollers() {
    $$('[data-scroller]').forEach((sc) => {
      const track = $('.scroller__track', sc), prev = $('[data-scroll-prev]', sc), next = $('[data-scroll-next]', sc);
      if (!track || sc._wired) { sc._update && sc._update(); return; }
      const step = () => Math.max(track.clientWidth * 0.8, 200);
      const rtl = () => document.dir === 'rtl';
      prev.onclick = () => track.scrollBy({ left: rtl() ? step() : -step(), behavior: 'smooth' });
      next.onclick = () => track.scrollBy({ left: rtl() ? -step() : step(), behavior: 'smooth' });
      const update = () => {
        const max = track.scrollWidth - track.clientWidth - 2;
        const x = Math.abs(track.scrollLeft);
        prev.disabled = x <= 2; next.disabled = x >= max;
      };
      track.addEventListener('scroll', update, { passive: true });
      window.addEventListener('resize', update);
      sc._wired = true; sc._update = update; update();
    });
  }

  /* =====================================================
     Stepper back-nav + change links
     ===================================================== */
  document.addEventListener('click', (e) => {
    const goto = e.target.closest('[data-goto]');
    if (goto) { e.preventDefault(); goToStep(goto.dataset.goto); return; }
    const st = e.target.closest('.progress__step.is-done');
    if (st) goToStep(st.dataset.step);
  });

  /* =====================================================
     Language (LTR/RTL) toggle
     ===================================================== */
  $('#langToggle').onclick = () => {
    const rtl = document.documentElement.dir === 'rtl';
    document.documentElement.dir = rtl ? 'ltr' : 'rtl';
    document.documentElement.lang = rtl ? 'en' : 'ar';
    $('#langToggle').textContent = rtl ? 'العربية' : 'English';
    refreshScrollers();
  };

  /* =====================================================
     Toast
     ===================================================== */
  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.innerHTML = `<svg viewBox="0 0 24 24"><path d="m5 13 4 4L19 7"/></svg>${esc(msg)}`;
    t.hidden = false; requestAnimationFrame(() => t.classList.add('is-on'));
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.classList.remove('is-on'); }, 2200);
  }

  /* =====================================================
     INIT
     ===================================================== */
  function resetJourney() {
    state.school = null; state.year = null; state.gender = null; state.emirate = 'All';
    $('#schoolSearch').value = ''; $('#schoolClear').hidden = true; $('#schoolResults').hidden = true;
    renderEmirateChips(); renderPopular();
    try { history.replaceState(null, '', location.pathname); } catch (e) {}
    goToStep('school', true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  const brand = $('.brand'); if (brand) brand.addEventListener('click', (e) => { e.preventDefault(); resetJourney(); });

  renderEmirateChips();
  renderPopular();
  updateCart();
  refreshScrollers();
  if (!applyDeeplink()) goToStep('school', true);
})();
