(function () {
  // Reliable viewport height across embedded/tool contexts where 100dvh
  // doesn't resolve correctly (e.g. some headless screenshot tools, some
  // in-app webviews). Sets --vh from actual measured window height.
  function setVH() {
    document.documentElement.style.setProperty('--vh', window.innerHeight * 0.01 + 'px');
  }
  window.addEventListener('resize', setVH);
  window.addEventListener('orientationchange', setVH);
  setVH();

  // ---------- Version / changelog ----------
  // Each new release: bump CURRENT_VERSION and add an entry to the FRONT
  // of CHANGELOG (newest first). The footer tag and version-history modal
  // both read from this array — nothing else needs to change by hand.
  var CURRENT_VERSION = 'v0.1.3';
  var CHANGELOG = [
    {
      version: 'v0.1.3',
      date: '2026-09-09',
      notes: [
        'Fixed arena being too small in the desktop/landscape layout: it was width-bound by a circular measurement (using its own shrink-to-fit container to size itself) instead of using the full available height, so it now grows to fill 100% of the vertical space on both Battle and Platform View',
        'Arena sizing now correctly accounts for the D-pad/diamond/Exit controls even though they render as a "display: contents" group, which was previously being miscounted as a single zero-width item'
      ]
    },
    {
      version: 'v0.1.2',
      date: '2026-09-09',
      notes: [
        'Arena is now a true 1:1 square on both Battle and Platform View, measured and sized in JS instead of via CSS aspect-ratio (which couldn’t size correctly inside the desktop layout’s shrink-to-fit column)',
        'Desktop/landscape layout: D-pad, arena, and action diamond + Exit are now one centered horizontal cluster (pad left, arena center, diamond right) instead of the arena and controls being pinned to opposite edges',
        'Title screen particle effect is now a centered square panel instead of a full-screen background'
      ]
    },
    {
      version: 'v0.1.1',
      date: '2026-09-08',
      notes: [
        'Fixed desktop layout: Platform View now gets the same side-by-side landscape layout as Battle (was stacking in a column)',
        'Added a centered, max-width layout for Title and Character Select on desktop'
      ]
    },
    {
      version: 'v0.1.0',
      date: '2026-09-08',
      notes: [
        'Initial prototype: Title, Character Select, Battle, and Platform View screens',
        '18-fighter roster (School vs. Office, 3x3 archetype/tech grid) with placeholder colors',
        'Platform View physics: gravity, jump, double jump, dash, fold, world-space scrolling camera',
        '4-button diamond controls (Attack/Defend/Movement/Special) with touch and keyboard support'
      ]
    }
  ];

  function renderVersionTag() {
    document.getElementById('version-tag').textContent = CURRENT_VERSION + ' · DESK WARS';
  }
  function buildVersionModal() {
    var body = document.getElementById('version-modal-body');
    body.innerHTML = CHANGELOG.map(function (entry) {
      return '<div class="changelog-entry">' +
        '<span class="cl-version">' + entry.version + '</span>' +
        '<span class="cl-date">' + entry.date + '</span>' +
        '<ul>' + entry.notes.map(function (n) { return '<li>' + n + '</li>'; }).join('') + '</ul>' +
        '</div>';
    }).join('');
  }
  function openVersionModal() {
    buildVersionModal();
    document.getElementById('version-modal').classList.add('active');
  }
  function closeVersionModal() {
    document.getElementById('version-modal').classList.remove('active');
  }
  renderVersionTag();
  var versionTagEl = document.getElementById('version-tag');
  versionTagEl.addEventListener('click', openVersionModal);
  versionTagEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openVersionModal(); }
  });
  document.getElementById('version-modal-close').addEventListener('click', closeVersionModal);
  document.getElementById('version-modal').addEventListener('click', function (e) {
    if (e.target.id === 'version-modal') closeVersionModal(); // click outside the box closes it
  });
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && document.getElementById('version-modal').classList.contains('active')) closeVersionModal();
  });

  // ---------- Dev aid: layout-mode badge ----------
  // Mirrors the actual media queries in app.css so the corner badge always
  // reflects reality even if the breakpoints change later. Small Phone and
  // Desktop are width tiers; Landscape is the separate side-by-side rule
  // that can combine with either (e.g. a 900px+ window that's also
  // landscape-oriented shows "Desktop + Landscape").
  var mqSmallPhone = window.matchMedia('(max-width: 380px)');
  var mqLandscapeRow = window.matchMedia('(min-width: 640px) and (orientation: landscape)');
  var mqDesktop = window.matchMedia('(min-width: 900px)');
  function updateModeBadge() {
    var tier = mqSmallPhone.matches ? 'Small Phone' : (mqDesktop.matches ? 'Desktop' : 'Mobile');
    var label = tier + (mqLandscapeRow.matches ? ' + Landscape' : '');
    document.getElementById('mode-badge').textContent = label + ' (' + window.innerWidth + 'px)';
  }
  window.addEventListener('resize', updateModeBadge);
  window.addEventListener('orientationchange', updateModeBadge);
  updateModeBadge();

  // ---------- Shared: square arena sizing (Battle + Platform View) ----------
  // Both arenas must render as a perfect 1:1 square in every layout: the
  // mobile stacked column (arena on top, controls at the bottom) and the
  // desktop/landscape row (D-pad left, arena centered, diamond+Exit
  // right). CSS alone can't do this reliably here — see the comment on
  // #battle-arena, #pf-arena in app.css — so this measures the real
  // available box and sets an explicit pixel width/height (the same
  // "measure, then set" approach pfLayout() below already uses for
  // physics). Keeping this ONE function used by both screens is what
  // avoids the classic bug in this project where a fix lands on one
  // screen and not the other.
  // Expands any `display: contents` wrapper (e.g. .battle-controls) into
  // its own children instead of counting it as a single box — a
  // `display:contents` element has no rendered box of its own (its
  // children become the real flex participants) but DOM APIs like
  // `.children` still see it as one node, so a naive width sum silently
  // gets a wrong (near-zero) answer for that item.
  function expandedChildren(container) {
    var out = [];
    Array.prototype.forEach.call(container.children, function (child) {
      if (getComputedStyle(child).display === 'contents') {
        out = out.concat(expandedChildren(child));
      } else {
        out.push(child);
      }
    });
    return out;
  }
  function sizeArenaSquare(arenaEl) {
    if (!arenaEl) return;
    var parent = arenaEl.parentElement; // .battle-main
    var parentRect = parent.getBoundingClientRect();
    var usedHeight = 0;
    Array.prototype.forEach.call(parent.children, function (sibling) {
      if (sibling !== arenaEl) usedHeight += sibling.offsetHeight;
    });
    var availH = parentRect.height - usedHeight;

    var availW;
    var screenEl = parent.closest('.screen');
    var isRow = screenEl && getComputedStyle(screenEl).flexDirection === 'row';
    if (isRow) {
      // In the desktop/landscape row, .battle-main is itself `flex: 0 0
      // auto` (shrink-to-fit) — measuring its own rect for availW would be
      // circular, since the arena we're about to size lives inside it and
      // feeds that shrink-to-fit width. Instead, work out how much row
      // width is left for .battle-main by subtracting every OTHER
      // top-level row item (pad, diamond, exit-battle — unwrapped from
      // .battle-controls — and, on Platform View, the .cs-header) plus the
      // row gaps, from the screen's own content width.
      var screenRect = screenEl.getBoundingClientRect();
      var screenCS = getComputedStyle(screenEl);
      var padLR = (parseFloat(screenCS.paddingLeft) || 0) + (parseFloat(screenCS.paddingRight) || 0);
      var gap = parseFloat(screenCS.columnGap || screenCS.gap) || 0;
      var others = expandedChildren(screenEl).filter(function (el) { return el !== parent; });
      var otherWidth = 0;
      others.forEach(function (el) { otherWidth += el.getBoundingClientRect().width; });
      var gapsTotal = gap * others.length; // one gap between .battle-main and each other item
      availW = screenRect.width - padLR - otherWidth - gapsTotal;
    } else {
      availW = parentRect.width;
    }

    var side = Math.max(0, Math.min(availW, availH));
    arenaEl.style.width = side + 'px';
    arenaEl.style.height = side + 'px';
  }
  var battleArenaEl = document.getElementById('battle-arena');
  var platformArenaEl = document.getElementById('pf-arena');
  function sizeAllArenas() {
    sizeArenaSquare(battleArenaEl);
    sizeArenaSquare(platformArenaEl);
    if (typeof pfLayout === 'function') pfLayout(); // refresh physics wrapW/wrapH against the new square size
  }
  window.addEventListener('resize', sizeAllArenas);
  window.addEventListener('orientationchange', sizeAllArenas);
  // Catches the display:none -> visible transition when a screen becomes
  // active, which the resize listeners above would miss on their own.
  if (window.ResizeObserver) {
    new ResizeObserver(sizeAllArenas).observe(document.getElementById('screen-battle'));
    new ResizeObserver(sizeAllArenas).observe(document.getElementById('screen-platform'));
  }

  // ---------- Screen navigation ----------
  function goto(id) {
    document.querySelectorAll('.screen').forEach(function (s) { s.classList.remove('active'); });
    document.getElementById(id).classList.add('active');
  }
  document.querySelectorAll('[data-goto]').forEach(function (b) {
    b.addEventListener('click', function () { goto(b.getAttribute('data-goto')); });
  });
  document.getElementById('play-btn').addEventListener('click', function () { goto('screen-select'); });

  var stats = { matches: 0, wins: 0 };
  function renderStats() {
    document.getElementById('stat-matches-title').textContent = stats.matches;
    document.getElementById('stat-wins-title').textContent = stats.wins;
  }
  renderStats();

  // ---------- Screen 1: upward particle system ----------
  var canvas = document.getElementById('particle-canvas');
  var ctx = canvas.getContext('2d');
  var particles = [];
  function resizeCanvas() { canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight; }
  function spawnParticle() {
    return {
      x: Math.random() * canvas.width, y: canvas.height + 10,
      w: 4 + Math.random() * 6, h: 4 + Math.random() * 6,
      speed: 0.3 + Math.random() * 0.7, sway: Math.random() * 2 - 1, swayPhase: Math.random() * Math.PI * 2,
      rot: Math.random() * Math.PI, rotSpeed: (Math.random() - 0.5) * 0.02,
      opacity: 0.15 + Math.random() * 0.35
    };
  }
  function initParticles() {
    particles = [];
    for (var i = 0; i < 26; i++) { var p = spawnParticle(); p.y = Math.random() * canvas.height; particles.push(p); }
  }
  function tickParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(function (p) {
      p.y -= p.speed; p.swayPhase += 0.02; p.x += Math.sin(p.swayPhase) * p.sway * 0.4; p.rot += p.rotSpeed;
      if (p.y < -20) Object.assign(p, spawnParticle());
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = 'rgba(217,166,43,' + p.opacity + ')';
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
    requestAnimationFrame(tickParticles);
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas(); initParticles(); requestAnimationFrame(tickParticles);

  // ---------- Screen 2: character select ----------
  var ARCHETYPES = ['rush', 'bruiser', 'zoner'];
  var TECHS = ['sharp', 'sticky', 'blunt'];
  var ARCH_COLOR = { rush: '#D9A62B', bruiser: '#E0653A', zoner: '#3B6FE0' };

  var ROSTER_NAMES = {
    school: {
      'rush-sharp': 'Snip Kid', 'rush-sticky': 'Sticky Sam', 'rush-blunt': 'Rubber Rascal',
      'bruiser-sharp': 'Puncher Jr.', 'bruiser-sticky': "Ol' Sticky", 'bruiser-blunt': 'Detention',
      'zoner-sharp': 'Wax Blaster', 'zoner-sticky': 'Swarm Jr.', 'zoner-blunt': 'Dust Buster'
    },
    office: {
      'rush-sharp': 'Blade Dancer', 'rush-sticky': 'Whip Fighter', 'rush-blunt': 'Bouncer',
      'bruiser-sharp': 'The Guillotine', 'bruiser-sticky': 'Iron Jaw', 'bruiser-blunt': 'Rule Breaker',
      'zoner-sharp': 'Click Shot', 'zoner-sticky': 'Swarm', 'zoner-blunt': 'Full Send'
    }
  };

  var currentTier = 'school';
  var selection = { p1: null, p2: null };
  var cpuOn = true;
  var activeSlot = 'p1';

  var rosterGrid = document.getElementById('roster-grid');

  function buildRoster() {
    rosterGrid.innerHTML = '';
    ARCHETYPES.forEach(function (arch) {
      TECHS.forEach(function (tech) {
        var key = arch + '-' + tech;
        var name = ROSTER_NAMES[currentTier][key];
        var card = document.createElement('button');
        card.className = 'fighter-card';
        card.dataset.key = key;
        card.innerHTML =
          '<div class="swatch" style="background:' + ARCH_COLOR[arch] + '"></div>' +
          '<div class="fname">' + name + '</div>' +
          '<div class="ftype">' + arch.toUpperCase() + ' / ' + tech.toUpperCase() + '</div>';
        card.addEventListener('click', function () { selectFighter(key, name, arch, tech); });
        rosterGrid.appendChild(card);
      });
    });
    refreshCardSelection();
  }

  function refreshCardSelection() {
    document.querySelectorAll('.fighter-card').forEach(function (c) {
      var p1sel = selection.p1, p2sel = selection.p2;
      var isP1 = p1sel && p1sel.key === c.dataset.key && p1sel.tier === currentTier;
      var isP2 = p2sel && p2sel.key === c.dataset.key && p2sel.tier === currentTier;
      c.classList.toggle('selected-p1', isP1 && !isP2);
      c.classList.toggle('selected-p2', isP2 && !isP1);
      c.classList.toggle('selected-both', isP1 && isP2);
    });
  }

  function selectFighter(key, name, arch, tech) {
    var label = (activeSlot === 'p2' && cpuOn) ? name + ' (CPU)' : name;
    selection[activeSlot] = { key: key, name: name, label: label, arch: arch, tech: tech, tier: currentTier };
    updateSlotUI(activeSlot);
    refreshCardSelection();
    checkFightReady();
  }

  function updateSlotUI(slot) {
    var el = document.getElementById('slot-' + slot);
    var data = selection[slot];
    el.querySelector('.slot-fighter').textContent = data ? data.name : '\u2014';
    el.querySelector('.slot-sub').innerHTML = data
      ? data.arch.toUpperCase() + ' / ' + data.tech.toUpperCase() + ' \u00b7 ' + data.tier
      : '&nbsp;';
  }

  function setActiveSlot(slot) {
    activeSlot = slot;
    document.getElementById('slot-p1').classList.toggle('active-slot', slot === 'p1');
    document.getElementById('slot-p2').classList.toggle('active-slot', slot === 'p2');
    document.getElementById('select-hint').textContent =
      'Selecting for ' + (slot === 'p1' ? 'Player 1' : (cpuOn ? 'CPU (Player 2)' : 'Player 2'));
    refreshCardSelection();
  }

  document.getElementById('slot-p1').addEventListener('click', function (e) {
    if (e.target.closest('.cpu-toggle')) return;
    setActiveSlot('p1');
  });
  document.getElementById('slot-p2').addEventListener('click', function (e) {
    if (e.target.closest('.cpu-toggle')) return;
    setActiveSlot('p2'); // always selectable — CPU still needs a fighter chosen
  });

  document.getElementById('cpu-toggle').addEventListener('click', function (e) {
    e.stopPropagation();
    cpuOn = !cpuOn;
    this.classList.toggle('active', cpuOn);
    this.textContent = 'CPU: ' + (cpuOn ? 'ON' : 'OFF');
    if (selection.p2) {
      selection.p2.label = cpuOn ? selection.p2.name + ' (CPU)' : selection.p2.name;
    }
    setActiveSlot(activeSlot);
    checkFightReady();
  });

  document.querySelectorAll('.tier-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.tier-tab').forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      currentTier = tab.getAttribute('data-tier');
      buildRoster();
    });
  });

  function checkFightReady() {
    document.getElementById('platform-mode-btn').disabled = !selection.p1;
    document.getElementById('battle-mode-btn').disabled = !(selection.p1 && selection.p2);
  }

  document.getElementById('battle-mode-btn').addEventListener('click', function () {
    if (this.disabled) return;
    document.getElementById('hud-p1-name').textContent = selection.p1.label;
    document.getElementById('hud-p2-name').textContent = selection.p2.label;
    document.getElementById('b-fighter-p1').style.background = ARCH_COLOR[selection.p1.arch];
    document.getElementById('b-fighter-p2').style.background = ARCH_COLOR[selection.p2.arch];
    goto('screen-battle');
    sizeArenaSquare(battleArenaEl);
  });

  document.getElementById('platform-mode-btn').addEventListener('click', function () {
    if (this.disabled) return;
    goto('screen-platform');
    startPlatformView(selection.p1);
  });

  buildRoster();
  setActiveSlot('p1');

  // ---------- Screen 3: battle ----------
  var ACTION_COLORS = { attack: '#D9463C', defend: '#3B6FE0', movement: '#D9A62B', special: '#33B76A' };
  var ACTION_SHAPES = { attack: 'x', defend: 'square', movement: 'circle', special: 'triangle' };
  function iconHTML(shape, color, size) {
    size = size || 16;
    if (shape === 'triangle') {
      var half = Math.round(size / 2);
      return '<span style="width:0;height:0;border-left:' + half + 'px solid transparent;border-right:' + half + 'px solid transparent;border-bottom:' + size + 'px solid ' + color + ';"></span>';
    }
    if (shape === 'circle') return '<span style="display:block;width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:' + color + ';"></span>';
    if (shape === 'square') return '<span style="display:block;width:' + (size - 1) + 'px;height:' + (size - 1) + 'px;border-radius:3px;background:' + color + ';"></span>';
    if (shape === 'x') {
      var bar = Math.round(size * 1.3);
      return '<span style="position:relative;display:block;width:' + size + 'px;height:' + size + 'px;">' +
        '<span style="position:absolute;top:50%;left:50%;width:' + bar + 'px;height:4px;border-radius:2px;background:' + color + ';transform:translate(-50%,-50%) rotate(45deg);"></span>' +
        '<span style="position:absolute;top:50%;left:50%;width:' + bar + 'px;height:4px;border-radius:2px;background:' + color + ';transform:translate(-50%,-50%) rotate(-45deg);"></span>' +
        '</span>';
    }
    return '';
  }
  Object.keys(ACTION_SHAPES).forEach(function (action) {
    document.getElementById('b-' + action).innerHTML = iconHTML(ACTION_SHAPES[action], 'rgba(0,0,0,0.55)');
  });

  var callout = document.getElementById('battle-callout');
  var calloutTimeout = null;
  function fireAction(action) {
    callout.textContent = action.charAt(0).toUpperCase() + action.slice(1);
    callout.style.color = ACTION_COLORS[action];
    var btn = document.getElementById('b-' + action);
    btn.setAttribute('data-pressed', 'true');
    setTimeout(function () { btn.setAttribute('data-pressed', 'false'); }, 130);
    clearTimeout(calloutTimeout);
    calloutTimeout = setTimeout(function () {
      callout.textContent = 'Idle';
      callout.style.color = 'var(--text-dim)';
    }, 450);
  }
  document.querySelectorAll('#screen-battle .diamond-btn[data-action]').forEach(function (b) {
    b.addEventListener('click', function () { fireAction(b.getAttribute('data-action')); });
  });

  function setDirHeld(dir, held) {
    var el = document.querySelector('#b-dpad [data-dir="' + dir + '"]');
    if (el) el.setAttribute('data-held', held ? 'true' : 'false');
  }
  document.querySelectorAll('#b-dpad button[data-dir]').forEach(function (b) {
    var dir = b.getAttribute('data-dir');
    function press(e) { e.preventDefault(); setDirHeld(dir, true); }
    function release() { setDirHeld(dir, false); }
    b.addEventListener('mousedown', press);
    b.addEventListener('touchstart', press, { passive: false });
    b.addEventListener('mouseup', release);
    b.addEventListener('mouseleave', release);
    b.addEventListener('touchend', release);
  });

  // ---------- Screen 4: Platform View (Player 1 solo, real physics) ----------
  var PF_ARCH_STATS = {
    rush:    { speed: 90, weight: 25 },
    bruiser: { speed: 30, weight: 90 },
    zoner:   { speed: 35, weight: 30 }
  };

  // Level bounds in world-space px. posX is now a WORLD coordinate, not a
  // screen offset — the camera converts world -> screen each frame. This is
  // what lets the character stay centered while the world scrolls past.
  // Bounds must comfortably exceed any real device's arena width, or the
  // camera runs out of room to follow and the character drifts off-center.
  var PF_LEVEL_MIN = -1200;
  var PF_LEVEL_MAX = 1200;
  var PF_LANDMARKS = [
    { x: -900, label: 'Desk 1' },
    { x: -450, label: 'Chair' },
    { x: 450, label: 'Locker' },
    { x: 900, label: 'SECRET?', secret: true }
  ];

  var pf = {
    arch: 'rush',
    posX: 0, posY: 0, velY: 0,
    facing: 1, grounded: true, airJumpsUsed: 0, maxAirJumps: 1,
    leftHeld: false, rightHeld: false, heldDir: 'neutral',
    wrapW: 0, wrapH: 0, fighterW: 0, groundPx: 0,
    effectActive: false,
    camX: 0,                 // current camera center, world-space
    cameraVerticalLock: true, // ground stays fixed on screen; flip false later for vertical secrets
    animState: 'idle'
  };

  var pfArenaEl = document.getElementById('pf-arena');
  var pfFighterEl = document.getElementById('pf-fighter');
  var pfCallout = document.getElementById('pf-callout');
  var pfDirLabel = document.getElementById('pf-dir-label');
  var pfAnimStateLabel = document.getElementById('pf-anim-state');
  var pfLandmarksEl = document.getElementById('pf-landmarks');
  var pfCalloutTimeout = null;
  var pfLandmarkEls = [];

  function pfBuildLandmarks() {
    pfLandmarksEl.innerHTML = '';
    pfLandmarkEls = PF_LANDMARKS.map(function (lm) {
      var marker = document.createElement('div');
      marker.className = 'pf-marker' + (lm.secret ? ' secret' : '');
      var label = document.createElement('div');
      label.className = 'pf-marker-label';
      label.textContent = lm.label;
      pfLandmarksEl.appendChild(marker);
      pfLandmarksEl.appendChild(label);
      return { worldX: lm.x, marker: marker, label: label };
    });
  }
  pfBuildLandmarks();

  function pfJumpVel() { var w = PF_ARCH_STATS[pf.arch].weight; return 13 - (w / 100) * 6; }
  function pfGravity() { var w = PF_ARCH_STATS[pf.arch].weight; return 0.5 + (w / 100) * 0.5; }
  function pfSpeedPerFrame() { return 4.2 * (PF_ARCH_STATS[pf.arch].speed / 90); }

  function pfLayout() {
    var r = pfArenaEl.getBoundingClientRect();
    pf.wrapW = r.width; pf.wrapH = r.height;
    pf.fighterW = pf.wrapW * 0.13;
    pf.groundPx = pf.wrapH * (1 / 3); // matches #pf-ground's bottom: 33.333%
  }
  window.addEventListener('resize', pfLayout);
  // ResizeObserver catches the display:none -> visible transition too, which
  // a plain 'resize' listener does not — this is what actually fixes
  // "measured 0x0 because the screen wasn't shown yet" bugs at the root,
  // rather than depending on getting call-order right by hand.
  if (window.ResizeObserver) {
    new ResizeObserver(pfLayout).observe(pfArenaEl);
  }

  function pfBaseTransform() { return 'scaleX(' + pf.facing + ')'; }
  function pfPlayEffect(transformStr, duration) {
    pf.effectActive = true;
    pfFighterEl.style.transform = transformStr;
    setTimeout(function () { pf.effectActive = false; pfFighterEl.style.transform = pfBaseTransform(); }, duration);
  }

  function startPlatformView(p1Selection) {
    pf.arch = p1Selection.arch;
    pf.posX = 0; pf.posY = 0; pf.velY = 0; pf.camX = 0;
    pf.facing = 1; pf.grounded = true; pf.airJumpsUsed = 0;
    pf.leftHeld = false; pf.rightHeld = false;
    pfSetHeldDir('neutral');
    document.getElementById('pf-fighter-name').textContent = p1Selection.name;
    pfFighterEl.style.background = ARCH_COLOR[p1Selection.arch];
    sizeArenaSquare(platformArenaEl);
    pfLayout();
  }

  function pfSetHeldDir(dir) {
    pf.heldDir = dir;
    pfDirLabel.textContent = 'dir: ' + dir + ' \u00b7 ' + (pf.grounded ? 'ground' : 'air');
    document.querySelectorAll('#pf-dpad button[data-dir]').forEach(function (b) { b.setAttribute('data-held', 'false'); });
    if (dir === 'up') document.querySelector('#pf-dpad [data-dir="up"]').setAttribute('data-held', 'true');
    if (dir === 'down') document.querySelector('#pf-dpad [data-dir="down"]').setAttribute('data-held', 'true');
    if (dir === 'side') {
      if (pf.leftHeld) document.querySelector('#pf-dpad [data-dir="left"]').setAttribute('data-held', 'true');
      if (pf.rightHeld) document.querySelector('#pf-dpad [data-dir="right"]').setAttribute('data-held', 'true');
    }
  }

  document.querySelectorAll('#pf-dpad button[data-dir]').forEach(function (b) {
    var dir = b.getAttribute('data-dir');
    function press(e) {
      e.preventDefault();
      if (dir === 'left') { pf.leftHeld = true; pfSetHeldDir('side'); }
      else if (dir === 'right') { pf.rightHeld = true; pfSetHeldDir('side'); }
      else { pfSetHeldDir(dir); }
    }
    function release() {
      if (dir === 'left') pf.leftHeld = false;
      if (dir === 'right') pf.rightHeld = false;
      if (dir === 'up' || dir === 'down') pfSetHeldDir('neutral');
      else if (!pf.leftHeld && !pf.rightHeld) pfSetHeldDir('neutral');
      else pfSetHeldDir('side');
    }
    b.addEventListener('mousedown', press);
    b.addEventListener('touchstart', press, { passive: false });
    b.addEventListener('mouseup', release);
    b.addEventListener('mouseleave', release);
    b.addEventListener('touchend', release);
  });

  var PF_ACTION_LABELS = {
    attack:   { neutral: 'Jab', side: 'Tilt Attack', up: 'Anti-Air', down: 'Low Sweep' },
    defend:   { neutral: 'Block', side: 'Side-Step', up: 'Parry', down: 'Crouch Block' },
    movement: { neutral: 'Jump', side: 'Dash', up: 'Double Jump', down: 'Fold / Fast Fall' },
    special:  { neutral: 'Neutral Special', side: 'Side Special', up: 'Up Special', down: 'Down Special' }
  };

  function pfHandleAction(action) {
    var label = PF_ACTION_LABELS[action][pf.heldDir];
    var color = ACTION_COLORS[action];
    clearTimeout(pfCalloutTimeout);
    pfCallout.textContent = action.charAt(0).toUpperCase() + action.slice(1) + ': ' + label;
    pfCallout.style.color = color;

    if (action === 'movement') {
      if (pf.heldDir === 'neutral' && pf.grounded) {
        pf.velY = pfJumpVel(); pf.grounded = false;
      } else if (pf.heldDir === 'up' && !pf.grounded && pf.airJumpsUsed < pf.maxAirJumps) {
        pf.velY = pfJumpVel() * 0.85; pf.airJumpsUsed++;
      } else if (pf.heldDir === 'side') {
        pf.posX += pf.facing * 34;
      } else if (pf.heldDir === 'down') {
        pfPlayEffect('scaleX(' + (0.08 * pf.facing) + ')', 160);
        if (!pf.grounded) pf.velY = Math.min(pf.velY, -9);
      }
    } else if (action === 'attack') {
      var scale = (pf.heldDir === 'up' || pf.heldDir === 'down') ? 1.28 : 1.15;
      pfPlayEffect(pfBaseTransform() + ' scale(' + scale + ')', 150);
    } else if (action === 'special') {
      pfPlayEffect(pfBaseTransform() + ' scale(1.4)', 220);
    } else if (action === 'defend') {
      pfFighterEl.style.boxShadow = '0 0 0 4px ' + color + '55';
      setTimeout(function () { pfFighterEl.style.boxShadow = 'none'; }, 200);
    }

    clearTimeout(pfCalloutTimeout);
    pfCalloutTimeout = setTimeout(function () {
      pfCallout.textContent = 'Idle';
      pfCallout.style.color = 'var(--text-dim)';
    }, 480);
  }

  document.querySelectorAll('#screen-platform .diamond-btn[data-action]').forEach(function (b) {
    b.addEventListener('click', function () { pfHandleAction(b.getAttribute('data-action')); });
  });
  Object.keys(ACTION_SHAPES).forEach(function (action) {
    document.getElementById('pf-' + action).innerHTML = iconHTML(ACTION_SHAPES[action], 'rgba(0,0,0,0.55)');
  });

  function pfUpdateAnimState() {
    var next;
    if (!pf.grounded) next = (pf.velY > 0) ? 'jump' : 'fall';
    else if (pf.leftHeld || pf.rightHeld) next = 'walk';
    else next = 'idle';
    if (next !== pf.animState) {
      pf.animState = next;
      pfAnimStateLabel.textContent = 'anim: ' + next; // this is the exact label Fighter.js would gotoAndPlay()
    }
  }

  function pfTick() {
    if (document.getElementById('screen-platform').classList.contains('active')) {
      var g = pfGravity();
      var wasGrounded = pf.grounded;
      if (!pf.grounded) {
        var extraFall = (pf.heldDir === 'down') ? g * 1.5 : 0;
        pf.velY -= (g + extraFall);
      }
      pf.posY += pf.velY;
      if (pf.posY <= 0) {
        pf.posY = 0; pf.velY = 0; pf.grounded = true; pf.airJumpsUsed = 0;
      } else {
        pf.grounded = false;
      }
      if (pf.grounded !== wasGrounded) pfSetHeldDir(pf.heldDir);

      // Horizontal movement now clamps to LEVEL bounds, not the visible arena —
      // the camera (below) is what keeps the character visually centered.
      if (pf.leftHeld) { pf.posX -= pfSpeedPerFrame(); pf.facing = -1; }
      if (pf.rightHeld) { pf.posX += pfSpeedPerFrame(); pf.facing = 1; }
      pf.posX = Math.max(PF_LEVEL_MIN, Math.min(PF_LEVEL_MAX, pf.posX));

      // --- Camera: follow player horizontally, ground locked vertically ---
      // cameraVerticalLock=true keeps the ground fixed on screen (current
      // behavior). Setting it false later lets the camera track player.y too,
      // e.g. for a level with vertical secret areas.
      var halfViewport = pf.wrapW / 2;
      var camTarget = Math.max(PF_LEVEL_MIN + halfViewport, Math.min(PF_LEVEL_MAX - halfViewport, pf.posX));
      pf.camX += (camTarget - pf.camX) * 0.15; // lerp smoothing

      var screenX = pf.wrapW / 2 + (pf.posX - pf.camX) - pf.fighterW / 2;
      pfFighterEl.style.left = screenX + 'px';
      pfFighterEl.style.bottom = (pf.groundPx + pf.posY) + 'px';
      if (!pf.effectActive) pfFighterEl.style.transform = pfBaseTransform();

      // Scroll the background grid with the camera so panning is visible
      pfArenaEl.style.backgroundPosition = (-pf.camX) + 'px center';

      // Position world-space landmarks relative to camera
      pfLandmarkEls.forEach(function (lm) {
        var lx = pf.wrapW / 2 + (lm.worldX - pf.camX);
        lm.marker.style.left = lx + 'px';
        lm.label.style.left = lx + 'px';
      });

      pfUpdateAnimState();
    }
    requestAnimationFrame(pfTick);
  }
  requestAnimationFrame(pfTick);

  // ---------- Keyboard controls (desktop) ----------
  // Matches the locked Controls & Input Scheme doc:
  // Attack = D, Defend = A, Movement = S, Special = W, Direction = Arrow keys
  var KEY_TO_ACTION = { d: 'attack', a: 'defend', s: 'movement', w: 'special' };
  var KEY_TO_DIR = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
  var keyHeldDirs = {};

  window.addEventListener('keydown', function (e) {
    var battleActive = document.getElementById('screen-battle').classList.contains('active');
    var platformActive = document.getElementById('screen-platform').classList.contains('active');
    if (!battleActive && !platformActive) return;
    var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;

    if (KEY_TO_ACTION[k] && !e.repeat) {
      if (battleActive) fireAction(KEY_TO_ACTION[k]);
      else pfHandleAction(KEY_TO_ACTION[k]);
    }
    if (KEY_TO_DIR[k] && !keyHeldDirs[k]) {
      keyHeldDirs[k] = true;
      if (battleActive) {
        setDirHeld(KEY_TO_DIR[k], true);
      } else {
        var dir = KEY_TO_DIR[k];
        if (dir === 'left') { pf.leftHeld = true; pfSetHeldDir('side'); }
        else if (dir === 'right') { pf.rightHeld = true; pfSetHeldDir('side'); }
        else { pfSetHeldDir(dir); }
      }
    }
  });
  window.addEventListener('keyup', function (e) {
    var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (KEY_TO_DIR[k]) {
      keyHeldDirs[k] = false;
      var dir = KEY_TO_DIR[k];
      setDirHeld(dir, false);
      if (dir === 'left') pf.leftHeld = false;
      if (dir === 'right') pf.rightHeld = false;
      if (dir === 'up' || dir === 'down') pfSetHeldDir('neutral');
      else if (!pf.leftHeld && !pf.rightHeld) pfSetHeldDir('neutral');
      else pfSetHeldDir('side');
    }
  });

  var timerEl = document.getElementById('round-timer');
  var timeLeft = 60;
  setInterval(function () {
    if (!document.getElementById('screen-battle').classList.contains('active')) return;
    timeLeft = Math.max(0, timeLeft - 1);
    timerEl.textContent = timeLeft;
    if (timeLeft === 0) timeLeft = 60;
  }, 1000);

})();
