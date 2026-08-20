/* ==========================================================================
   Nepal–Oita Community — behaviour
   Progressive: every feature guards for its own markup, so this one file
   is safe to load on any page of the site.
   ========================================================================== */

(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ------------------------------------------------------------------ nav */

  var nav = document.querySelector('[data-nav]');
  var toTop = document.querySelector('[data-to-top]');

  /* How far the page can scroll. Measured once and re-measured when the layout
     changes, rather than read inside the scroll handler: `scrollHeight` forces
     a layout, and doing that on every frame of every scroll is the one thing
     in here that would actually cost something. */
  var scrollSpan = 0;
  function measureScroll() {
    scrollSpan = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0);
  }
  measureScroll();
  window.addEventListener('resize', measureScroll);
  window.addEventListener('load', measureScroll);
  // Filters hide and show whole rows of content, so the page gets shorter and
  // taller without a resize event ever firing.
  if ('ResizeObserver' in window) new ResizeObserver(measureScroll).observe(document.body);

  function onScroll() {
    var y = window.scrollY;
    if (nav) nav.classList.toggle('is-stuck', y > 12);
    if (toTop) toTop.classList.toggle('is-visible', y > 600);
    // Written on the nav, not on :root — the only thing reading it is
    // .nav::after, so scoping the write keeps style invalidation to one element
    // instead of the whole document.
    if (nav) {
      nav.style.setProperty('--scroll-progress',
        scrollSpan > 0 ? Math.min(y / scrollSpan, 1).toFixed(4) : '0');
    }
  }

  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      onScroll();
      ticking = false;
    });
  }, { passive: true });
  onScroll();

  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    });
  }

  /* --------------------------------------------------------------- drawer */

  var drawer = document.querySelector('[data-drawer]');
  var drawerOpener = document.querySelector('[data-drawer-open]');
  var lastFocused = null;

  function setDrawer(open) {
    if (!drawer) return;
    drawer.classList.toggle('is-open', open);
    // `inert` removes the closed panel from both the tab order and the
    // accessibility tree — aria-hidden alone would leave its links tabbable.
    if (open) drawer.removeAttribute('inert');
    else drawer.setAttribute('inert', '');
    document.body.style.overflow = open ? 'hidden' : '';
    if (drawerOpener) drawerOpener.setAttribute('aria-expanded', String(open));

    if (open) {
      lastFocused = document.activeElement;
      var first = drawer.querySelector('a, button');
      if (first) first.focus();
    } else if (lastFocused) {
      lastFocused.focus();
      lastFocused = null;
    }
  }

  if (drawer) {
    setDrawer(false);
    if (drawerOpener) drawerOpener.addEventListener('click', function () { setDrawer(true); });

    drawer.addEventListener('click', function (event) {
      if (event.target.closest('[data-drawer-close]') || event.target.closest('a')) {
        setDrawer(false);
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape' || !drawer.classList.contains('is-open')) return;
      setDrawer(false);
    });

    // Keep focus inside the panel while it is open
    drawer.addEventListener('keydown', function (event) {
      if (event.key !== 'Tab' || !drawer.classList.contains('is-open')) return;
      var focusables = drawer.querySelectorAll('a[href], button:not([disabled])');
      if (!focusables.length) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  /* ------------------------------------------------- drop-in photo slots */

  /* Each tile names a file in images/photos/. If that file exists the photo
     fades in over the generated artwork; if it 404s the <img> is removed and
     the artwork simply stays. Handled here rather than with inline onload /
     onerror attributes so the markup carries no JavaScript. */

  var settleImage = function (img) {
    if (!img.complete) return false;
    if (img.naturalWidth > 0) img.classList.add('is-loaded');
    else img.remove();
    return true;
  };

  document.querySelectorAll('.tile__img, .qr-frame__img, .hero__photo, .hero__cell img, .avatar__img, .quote__photo').forEach(function (img) {
    // A lazy image far down the page has not been fetched yet, so listen as
    // well as checking — whichever happens first wins.
    img.addEventListener('load', function () { settleImage(img); });
    img.addEventListener('error', function () { img.remove(); });
    settleImage(img);
  });

  /* ------------------------------------------------------- ambient motion */

  /* The hero photograph drifts continuously. Left running it would keep the
     compositor busy for as long as the tab is open, so it is paused the moment
     the hero leaves the viewport and resumed when it comes back. */
  var driftHost = document.querySelector('.hero, .page-head--photo');
  if (driftHost && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        entry.target.classList.toggle('is-paused', !entry.isIntersecting);
      });
    }, { threshold: 0 }).observe(driftHost);
  }

  /* A wash of the card's own accent colour follows the cursor across it. Only
     built where there is a real cursor to follow, and never when motion is
     turned down. The card's rectangle is cached on entry rather than measured
     per move — a pointermove is far more frequent than a scroll, and the effect
     is a soft gradient, so a few pixels of staleness cannot be seen. */
  var fineHover = window.matchMedia('(hover: hover) and (pointer: fine)');
  if (fineHover.matches && !reduceMotion.matches) {
    document.querySelectorAll('.card').forEach(function (card) {
      var box = null;
      var queued = false;
      var x = 0;
      var y = 0;

      card.addEventListener('pointerenter', function () {
        box = card.getBoundingClientRect();
      });

      card.addEventListener('pointermove', function (event) {
        if (!box) box = card.getBoundingClientRect();
        x = ((event.clientX - box.left) / box.width) * 100;
        y = ((event.clientY - box.top) / box.height) * 100;
        if (queued) return;
        queued = true;
        window.requestAnimationFrame(function () {
          card.style.setProperty('--mx', x.toFixed(1) + '%');
          card.style.setProperty('--my', y.toFixed(1) + '%');
          queued = false;
        });
      });

      card.addEventListener('pointerleave', function () { box = null; });
    });
  }

  /* ------------------------------------------------------------- events */

  /* Every event card carries a data-event-date. They are sorted into one
     horizontal rail laid out as a timeline: the past on the left, oldest first,
     then everything still to come on the right. The rail is then parked on the
     first upcoming event, so the three cards you see without touching anything
     are always the next three — and the history is one push of the left arrow
     away, in the direction a reader already expects the past to be.

     The split is computed from today, so the morning after an event it moves to
     the left of the anchor on its own and the next one takes its place. Nobody
     edits dates.

     The markup ships as a plain grid, and the rail is switched on here: with
     scripting off the section renders as an ordinary grid of every event, which
     is the right fallback. */
  var eventGrid = document.querySelector('[data-events]');
  if (eventGrid) {
    var cards = Array.prototype.slice.call(eventGrid.querySelectorAll('[data-event-date]'));

    // Local midnight, so an event still counts as upcoming on the day it runs.
    var today = new Date();
    today.setHours(0, 0, 0, 0);

    var dated = cards.map(function (el) {
      var parts = (el.getAttribute('data-event-date') || '').split('-');
      // Built from parts, not from the string: `new Date("2026-09-13")` is
      // parsed as UTC midnight, which is the previous day in Japan.
      var when = new Date(+parts[0], (+parts[1]) - 1, +parts[2]);
      return { el: el, when: when, past: when < today };
    }).filter(function (d) { return !isNaN(d.when); });

    var upcoming = dated.filter(function (d) { return !d.past; })
                        .sort(function (a, b) { return a.when - b.when; });
    // Oldest first, same as the upcoming half: one continuous left-to-right
    // timeline rather than two runs meeting in the middle.
    var past = dated.filter(function (d) { return d.past; })
                    .sort(function (a, b) { return a.when - b.when; });

    if (dated.length) {
      eventGrid.classList.remove('grid', 'grid--3');
      eventGrid.classList.add('rail');
      eventGrid.setAttribute('role', 'group');
      eventGrid.setAttribute('aria-label', 'Upcoming and past events');
      // A scrollable box is not focusable on its own, so without this a keyboard
      // user cannot reach the history at all.
      eventGrid.tabIndex = 0;

      past.concat(upcoming).forEach(function (d) {
        if (d.past) d.el.classList.add('event--past');
        eventGrid.appendChild(d.el);
      });

      /* A hint line and a pair of arrows. Dragging a rail is not obvious, and on
         a desktop with no touchpad there is nothing to drag with — the arrows
         make the direction explicit and give keyboard users a real control. */
      var bar = document.createElement('div');
      bar.className = 'rail-bar';

      var hint = document.createElement('p');
      hint.className = 'text-sm muted rail-hint';
      hint.textContent = past.length
        ? (upcoming.length ? 'Earlier events are to the left' : 'Scroll left through past events')
        : '';

      var railNav = document.createElement('div');
      railNav.className = 'rail-nav';
      var mkBtn = function (dir, label, icon) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'icon-btn rail-arrow';
        b.setAttribute('aria-label', label);
        b.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-chevron-' + icon + '"></use></svg>';
        b.addEventListener('click', function () {
          // One card plus its gap, so a click always lands on a card edge.
          var step = eventGrid.firstElementChild
            ? eventGrid.firstElementChild.getBoundingClientRect().width + 24
            : 320;
          eventGrid.scrollBy({ left: dir * step,
            behavior: reduceMotion.matches ? 'auto' : 'smooth' });
        });
        return b;
      };
      var railPrev = mkBtn(-1, 'Scroll left to earlier events', 'left');
      var railNext = mkBtn(1, 'Scroll right to later events', 'right');
      railNav.appendChild(railPrev);
      railNav.appendChild(railNext);
      bar.appendChild(hint);
      bar.appendChild(railNav);
      eventGrid.parentNode.insertBefore(bar, eventGrid);

      // Fade whichever edge still has something beyond it, and disable the arrow
      // that would do nothing.
      var setEdge = function () {
        var maxLeft = eventGrid.scrollWidth - eventGrid.clientWidth;
        var more = maxLeft - eventGrid.scrollLeft > 4;
        var started = eventGrid.scrollLeft > 4;
        eventGrid.classList.toggle('rail--more', more);
        eventGrid.classList.toggle('rail--start', started);
        railNext.disabled = !more;
        railPrev.disabled = !started;
        railNav.hidden = maxLeft <= 4;
      };
      eventGrid.addEventListener('scroll', setEdge, { passive: true });
      window.addEventListener('resize', setEdge);

      /* Park the rail on the first event still to come, so the past is behind
         the reader rather than in front of them.

         Both offsetLefts are measured against the same offsetParent, so
         subtracting one from the other cancels it out and this needs no
         assumption about which ancestor is positioned. scrollLeft is set
         directly rather than through scrollIntoView, which would drag the whole
         page down to the events section on load. */
      var anchorRail = function () {
        var first = upcoming.length ? upcoming[0].el : null;
        if (!first || !eventGrid.firstElementChild) return;
        eventGrid.scrollLeft = first.offsetLeft - eventGrid.firstElementChild.offsetLeft;
      };
      anchorRail();
      setEdge();
      /* Once more after layout settles: the web fonts and the lazy portraits
         both land after this line and either can change a card's width. Only
         once — from then on the scroll position belongs to the reader. */
      window.requestAnimationFrame(function () { anchorRail(); setEdge(); });
    }

    if (!upcoming.length) {
      var emptyNote = document.createElement('p');
      emptyNote.className = 'muted u-mt-1';
      emptyNote.textContent = 'Nothing on the calendar just now — new dates go up here as soon as they are set.';
      eventGrid.parentNode.insertBefore(emptyNote, eventGrid);
    }
  }

  /* ---------------------------------------------------------- show more */

  /* Any grid marked [data-more] shows its first row and hides the rest behind a
     control. The row is measured, never assumed: these grids change column count
     between phone and desktop, so counting children would collapse the wrong
     number. Everything is built here rather than in the markup, which means with
     scripting off the full grid simply renders and there is no dead button.

     Two kinds of control, decided by the markup:

       [data-more]                     — a button that expands the grid in place
       [data-more-href="page.html"]    — a link to a page holding the full set

     The link is the better answer for the long sections. A grid that expands to
     fifteen cards pushes everything below it off the screen and gives the reader
     no address to come back to or send to anyone; a page has a title, a URL and
     a back button. The preview on this page is then genuinely a preview.

     `hidden` is deliberate over a class — it takes the extra cards out of the
     tab order and the accessibility tree as well as out of the layout, so a
     keyboard lands on the control rather than in a stack of invisible cards. */
  document.querySelectorAll('[data-more]').forEach(function (grid, gridIndex) {
    var items = Array.prototype.slice.call(grid.children);
    if (items.length < 2) return;

    var href = grid.getAttribute('data-more-href');
    // Some full lists are members-only: the control asks for a number first and
    // follows the link once it checks out.
    var gated = grid.hasAttribute('data-more-gate');
    var collapsed = true;

    var wrap = document.createElement('div');
    wrap.className = 'more-row';
    /* A gated control is a button, not a link: it has to stop and ask before it
       goes anywhere, and a link that does not navigate lies to anyone who reads
       the status bar or opens it in a new tab. */
    var btn = document.createElement(href && !gated ? 'a' : 'button');
    btn.className = 'btn btn--ghost more-btn';
    if (!grid.id) grid.id = 'more-grid-' + (gridIndex + 1);
    if (href && !gated) {
      btn.href = href;
    } else {
      btn.type = 'button';
      if (!href) btn.setAttribute('aria-controls', grid.id);
    }
    var label = document.createElement('span');
    btn.appendChild(label);
    // A chevron promises the page will unfold, an arrow that it will move, and a
    // shield that it will ask who you are.
    btn.insertAdjacentHTML('beforeend',
      '<svg class="icon" aria-hidden="true"><use href="#i-'
      + (gated ? 'shield' : href ? 'arrow-right' : 'chevron-down') + '"></use></svg>');
    wrap.appendChild(btn);
    if (gated) {
      var gnote = document.createElement('p');
      gnote.className = 'more-note text-sm muted';
      gnote.textContent = 'Members only — you will be asked for your registered number.';
      wrap.appendChild(gnote);
    }
    grid.parentNode.insertBefore(wrap, grid.nextSibling);

    /* How many cards to leave showing: whole rows, never a part row, and enough
       of them to be worth looking at. On a desktop the first row is three to
       seven cards and that is the answer. On a phone the same grid is one column,
       where "the first row" is a single card above a "Show all 6" button — which
       reads as a mistake rather than as a preview. So rows are added until at
       least MIN cards are visible. */
    var MIN = 3;
    function previewCount() {
      var wasHidden = items.map(function (el) { return el.hidden; });
      items.forEach(function (el) { el.hidden = false; });

      // Group the cards by their top edge; each distinct top is one row.
      var rows = [];
      var lastTop = null;
      items.forEach(function (el) {
        var top = el.offsetTop;
        if (top !== lastTop) { rows.push(0); lastTop = top; }
        rows[rows.length - 1]++;
      });

      items.forEach(function (el, i) { el.hidden = wasHidden[i]; });

      var n = 0;
      for (var r = 0; r < rows.length; r++) {
        n += rows[r];
        if (n >= MIN) break;
      }
      return n || items.length;
    }

    function apply() {
      var n = previewCount();
      // Nothing worth hiding: either the preview already covers the grid, or it
      // leaves a single card behind, and a button that reveals one more card is
      // more work for the reader than just showing it.
      if (n >= items.length - 1) {
        items.forEach(function (el) { el.hidden = false; });
        wrap.hidden = true;
        return;
      }
      wrap.hidden = false;
      // A link never toggles, so the preview stays a preview and the label says
      // where it goes rather than what it will do.
      if (href) {
        items.forEach(function (el, i) { el.hidden = i >= n; });
        label.textContent = 'See all ' + items.length;
        return;
      }
      items.forEach(function (el, i) { el.hidden = collapsed && i >= n; });
      btn.setAttribute('aria-expanded', String(!collapsed));
      label.textContent = collapsed
        ? 'Show all ' + items.length
        : 'Show fewer';
    }

    if (gated) btn.addEventListener('click', function () { requireMember(href); });

    if (!href) btn.addEventListener('click', function () {
      collapsed = !collapsed;
      apply();
      if (collapsed) {
        // Collapsing can pull the page up from under the reader; keep the grid
        // in view rather than leaving them somewhere further down the page.
        grid.scrollIntoView({ block: 'nearest',
          behavior: reduceMotion.matches ? 'auto' : 'smooth' });
      } else {
        // The freshly shown cards carry .reveal, so nudge the observer by
        // letting layout settle first.
        window.requestAnimationFrame(function () {
          items.forEach(function (el) {
            if (el.classList.contains('reveal')) el.classList.add('is-in');
          });
        });
      }
    });

    apply();

    var resizeTick;
    window.addEventListener('resize', function () {
      window.clearTimeout(resizeTick);
      resizeTick = window.setTimeout(apply, 150);
    });
  });

  /* -------------------------------------------------------- scroll reveal */

  var revealables = document.querySelectorAll('.reveal');
  if (revealables.length) {
    if (!('IntersectionObserver' in window) || reduceMotion.matches) {
      revealables.forEach(function (el) { el.classList.add('is-in'); });
    } else {
      var revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          revealObserver.unobserve(entry.target);
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

      revealables.forEach(function (el, index) {
        // Stagger siblings within the same parent, capped so nothing lags
        var siblingIndex = Array.prototype.indexOf.call(el.parentElement.children, el);
        el.style.setProperty('--reveal-delay', Math.min(siblingIndex, 6) * 80 + 'ms');
        revealObserver.observe(el);
      });
    }
  }

  /* ------------------------------------------------------------ count-ups */

  var counters = document.querySelectorAll('[data-count-to]');
  if (counters.length) {
    var runCount = function (el) {
      var target = parseFloat(el.getAttribute('data-count-to'));
      var suffix = el.getAttribute('data-count-suffix') || '';
      if (isNaN(target)) return;

      if (reduceMotion.matches) {
        el.textContent = target.toLocaleString() + suffix;
        return;
      }

      var duration = 1600;
      var started = null;

      var step = function (now) {
        if (started === null) started = now;
        var progress = Math.min((now - started) / duration, 1);
        // easeOutExpo — fast start, gentle landing
        var eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        el.textContent = Math.round(target * eased).toLocaleString() + (progress === 1 ? suffix : '');
        if (progress < 1) window.requestAnimationFrame(step);
      };

      window.requestAnimationFrame(step);
    };

    if (!('IntersectionObserver' in window)) {
      counters.forEach(runCount);
    } else {
      var countObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          runCount(entry.target);
          countObserver.unobserve(entry.target);
        });
      }, { threshold: 0.5 });
      counters.forEach(function (el) { countObserver.observe(el); });
    }
  }

  /* --------------------------------------------------------- scroll spy */

  var spyLinks = document.querySelectorAll('[data-spy]');
  if (spyLinks.length && 'IntersectionObserver' in window) {
    var sections = [];
    spyLinks.forEach(function (link) {
      var id = link.getAttribute('href');
      if (!id || id.charAt(0) !== '#') return;
      var section = document.querySelector(id);
      if (section) sections.push({ link: link, section: section });
    });

    var spyObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var match = sections.filter(function (s) { return s.section === entry.target; })[0];
        if (!match) return;
        if (entry.isIntersecting) {
          spyLinks.forEach(function (l) { l.classList.remove('is-active'); });
          match.link.classList.add('is-active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    sections.forEach(function (s) { spyObserver.observe(s.section); });
  }

  /* -------------------------------------------------------------- dialogs */

  function openDialog(dialog) {
    if (!dialog) return;
    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
    document.body.style.overflow = 'hidden';
  }

  /* Release the page's scroll lock only when nothing is left open.

     The `close` event is queued, not synchronous, so closing one sheet in order
     to open another used to fire after the second was already up and hand the
     page its scrolling back underneath it. Deriving the lock from "is any dialog
     still open" makes the order of those two events stop mattering. */
  function releaseScroll() {
    if (!document.querySelector('dialog[open]')) document.body.style.overflow = '';
  }

  function closeDialog(dialog) {
    if (!dialog) return;
    if (typeof dialog.close === 'function') {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
    }
    releaseScroll();
  }

  // Any dialog: click on the backdrop area or a [data-close] control dismisses it
  document.querySelectorAll('dialog').forEach(function (dialog) {
    dialog.addEventListener('click', function (event) {
      if (event.target.closest('[data-close]')) {
        closeDialog(dialog);
        return;
      }
      // The shell fills the dialog; clicking it (not its card) means "outside"
      var shell = event.target.closest('.dialog-shell, .lightbox__stage');
      var card = event.target.closest('.sheet, .lightbox__frame, .lightbox__btn');
      if (shell && !card) closeDialog(dialog);
    });
    dialog.addEventListener('close', releaseScroll);
  });

  /* Event details now live on their own page (event-<slug>.html) and the
     "Details" control is a plain link, so the dialog that used to render them
     from data-event-source is gone. */

  /* ------------------------------------------------------------- lightbox */

  var lightbox = document.querySelector('[data-lightbox]');
  if (lightbox) {
    var slides = Array.prototype.slice.call(document.querySelectorAll('[data-slide]'));
    var frame = lightbox.querySelector('[data-lightbox-frame]');
    var capTitle = lightbox.querySelector('[data-lightbox-title]');
    var capText = lightbox.querySelector('[data-lightbox-text]');
    var counter = lightbox.querySelector('[data-lightbox-count]');
    var index = 0;

    // Only the slides on screen right now — with a gallery filter applied,
    // paging must not wander into hidden photos.
    var active = slides;
    var refreshActive = function () {
      active = slides.filter(function (s) { return !s.hidden; });
      if (!active.length) active = slides;
    };

    var render = function () {
      var slide = active[index];
      if (!slide) return;
      var art = slide.querySelector('.tile__art');
      var img = slide.querySelector('.tile__img');

      // A lazy <img> whose file is missing has not errored yet while it is off
      // screen, so only treat it as a photo once it has really decoded.
      if (img && !(img.complete && img.naturalWidth > 0)) img = null;

      // The colour wash lives on the tile, not the artwork, so carry it across
      // or every slide would render in the default crimson.
      frame.style.setProperty('--wash', getComputedStyle(slide).getPropertyValue('--wash'));

      if (img) {
        frame.innerHTML = '<img class="tile__img" src="' + img.getAttribute('src') +
          '" alt="' + (img.getAttribute('alt') || '') + '">';
      } else if (art) {
        frame.innerHTML = '<div class="' + art.className + '" style="' +
          (art.getAttribute('style') || '') + '"></div>';
      }

      capTitle.textContent = slide.getAttribute('data-slide-title') || '';
      capText.textContent = slide.getAttribute('data-slide-text') || '';
      if (counter) counter.textContent = (index + 1) + ' / ' + active.length;
    };

    var go = function (delta) {
      if (!active.length) return;
      index = (index + delta + active.length) % active.length;
      render();
    };

    slides.forEach(function (slide) {
      slide.addEventListener('click', function () {
        refreshActive();
        index = Math.max(active.indexOf(slide), 0);
        render();
        openDialog(lightbox);
      });
    });

    var prevBtn = lightbox.querySelector('[data-lightbox-prev]');
    var nextBtn = lightbox.querySelector('[data-lightbox-next]');
    if (prevBtn) prevBtn.addEventListener('click', function () { go(-1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { go(1); });

    lightbox.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowRight') { event.preventDefault(); go(1); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); go(-1); }
    });
  }

  /* Restart a one-shot CSS animation on an element. Removing the class is not
     enough on its own — the browser coalesces the removal and re-addition into
     no change at all, so a layout read has to be forced in between. */
  var replayClass = function (el, className) {
    el.classList.remove(className);
    void el.offsetWidth;
    el.classList.add(className);
  };

  // Filter chips confirm the press with one small overshoot.
  document.querySelectorAll('.chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      if (!reduceMotion.matches) replayClass(chip, 'is-picked');
    });
    chip.addEventListener('animationend', function (event) {
      if (event.animationName === 'chip-pop') chip.classList.remove('is-picked');
    });
  });

  /* ===================================================================== */
  /*  MEMBERS ONLY                                                         */
  /* ===================================================================== */

  /* One sign-in, shared by everything that needs it: the "See all" controls on
     the leadership and general-member sections, the full lists on members.html,
     the directory, and the form where a member edits their own card.

     The register is data/members.json. It holds NO readable phone numbers —
     each is stored only as a PBKDF2-SHA256 hash at 600,000 iterations, and the
     check here hashes what the visitor typed and compares.

     Be clear-eyed about what that buys, because the file is public:

       - It stops the numbers being harvested. There is nothing in the file a
         scraper can lift, and nothing a curious visitor can read.
       - It does NOT make the numbers secret from someone determined. A Japanese
         mobile number is about 27 bits; with a GPU and a few hours you can work
         back from these hashes. The iteration count is what makes it hours
         rather than seconds.
       - The lists it unlocks are in the page's HTML, so View Source still shows
         them. This gate is a courtesy to members, not a lock on the data.

     If either of those matters, the check belongs on a server — see
     PHOTO-SETUP-GUIDE.md. That is also the only way an uploaded photo can
     actually be saved for everybody. */

  var MEMBER_DATA_URL = 'data/members.json';
  var SESSION_KEY = 'noc-member';         // sessionStorage: the verified id
  var PROFILE_PREFIX = 'noc-profile-';    // localStorage: that member's own draft

  /* sessionStorage, not localStorage: the sign-in lasts until the tab closes.
     On a shared phone the next person does not inherit it. Wrapped because
     Safari in private mode throws on access rather than returning null. */
  var store = function (area) {
    return {
      get: function (k) { try { return window[area].getItem(k); } catch (e) { return null; } },
      set: function (k, v) { try { window[area].setItem(k, v); } catch (e) { } },
      del: function (k) { try { window[area].removeItem(k); } catch (e) { } }
    };
  };
  var session = store('sessionStorage');
  var local = store('localStorage');

  /* However the member types it: 080-0000-0000, +81 80 0000 0000, 8000000000 all
     reduce to the same string before hashing. Deliberately no real number in
     this comment — this file is public, and an example is how real ones creep in. */
  var canonicalPhone = function (raw) {
    var d = String(raw || '').replace(/\D/g, '');
    if (d.slice(0, 4) === '0081') d = d.slice(4);
    else if (d.slice(0, 2) === '81' && d.length >= 11) d = d.slice(2);
    return d.replace(/^0+/, '');
  };

  var b64ToBytes = function (b64) {
    var bin = window.atob(b64), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  };
  var bytesToB64 = function (bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return window.btoa(s);
  };

  var memberData = null, memberFetch = null;
  var loadMembers = function () {
    if (memberData) return Promise.resolve(memberData);
    if (!memberFetch) {
      memberFetch = fetch(MEMBER_DATA_URL, { cache: 'no-cache' })
        .then(function (r) {
          if (!r.ok) throw new Error('register');
          return r.json();
        })
        .then(function (d) { memberData = d; return d; });
    }
    return memberFetch;
  };

  var findMember = function (id) {
    if (!memberData) return null;
    return memberData.members.filter(function (m) { return m.id === id; })[0] || null;
  };

  /* Resolves with the member, or null for "not on the register". Rejects only
     when something is actually broken. */
  var verifyPhone = function (raw) {
    var phone = canonicalPhone(raw);
    return loadMembers().then(function (d) {
      if (!window.crypto || !crypto.subtle) throw new Error('nocrypto');
      var kdf = d.kdf;
      return crypto.subtle.importKey('raw', new TextEncoder().encode(phone),
        'PBKDF2', false, ['deriveBits'])
        .then(function (key) {
          return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: kdf.hash,
            salt: b64ToBytes(kdf.salt), iterations: kdf.iterations }, key, kdf.bits);
        })
        .then(function (bits) {
          var got = bytesToB64(new Uint8Array(bits));
          return d.members.filter(function (m) { return m.hash && m.hash === got; })[0] || null;
        });
    });
  };

  /* Called by the gated "See all" controls, which are built earlier in this file.
     A function declaration, not a var: it is hoisted whole, so the order of these
     two blocks cannot matter. */
  function requireMember(href) {
    if (signedIn) { window.location.href = href; return; }
    pendingHref = href;
    openDialog(directoryDialog);
  }

  /* ------------------------------------------------------- the unlocked state */

  var memberSections = document.querySelectorAll('[data-members-only]');
  var memberGates = document.querySelectorAll('[data-member-gate]');
  var roster = document.querySelector('[data-roster]');
  var signedIn = null;      // the member record, once known
  var pendingHref = null;   // where a gated "See all" was heading

  var applyFilters = function () { };

  var renderRoster = function (members) {
    if (!roster) return;
    roster.innerHTML = '';
    members.forEach(function (m) {
      var li = document.createElement('li');
      li.setAttribute('data-category', m.category || 'general');
      var av = document.createElement('span');
      av.className = 'avatar';
      av.setAttribute('aria-hidden', 'true');
      av.textContent = m.initials || (m.name || '?').trim().charAt(0).toUpperCase();
      var text = document.createElement('span');
      var nameEl = document.createElement('span');
      nameEl.className = 'roster__name';
      nameEl.textContent = m.name || '';
      var metaEl = document.createElement('span');
      metaEl.className = 'roster__meta';
      metaEl.textContent = [m.role, m.profession].filter(Boolean).join(' · ')
        || 'Profession not listed';
      text.appendChild(nameEl);
      text.appendChild(document.createElement('br'));
      text.appendChild(metaEl);
      /* Contact details only if the committee has put them in the register. They
         are not shipped there, because the file is public — see the note at the
         top of this section. */
      if (m.phone || m.facebook) {
        var links = document.createElement('span');
        links.className = 'roster__links';
        if (m.phone) {
          var a = document.createElement('a');
          a.href = 'tel:' + String(m.phone).replace(/[^+\d]/g, '');
          a.textContent = m.phone;
          links.appendChild(a);
        }
        if (m.facebook) {
          var f = document.createElement('a');
          f.href = m.facebook;
          f.rel = 'noopener nofollow';
          f.textContent = 'Facebook';
          links.appendChild(f);
        }
        text.appendChild(document.createElement('br'));
        text.appendChild(links);
      }
      li.appendChild(av);
      li.appendChild(text);
      roster.appendChild(li);
    });
    applyFilters();
  };

  var prefillProfile = function () { };
  var showLocalProfiles = function () { };

  var unlock = function (member) {
    signedIn = member;
    session.set(SESSION_KEY, member.id);

    memberSections.forEach(function (el) { el.classList.add('is-unlocked'); });
    document.querySelectorAll('[data-members-locked]').forEach(function (el) {
      el.hidden = true;
    });
    document.querySelectorAll('[data-member-name]').forEach(function (el) {
      el.textContent = member.name;
    });
    if (roster && memberData) renderRoster(memberData.members);
    prefillProfile();

    /* Newly revealed cards carry .reveal, and the observer will not fire for
       elements that were display:none when it last looked. */
    window.requestAnimationFrame(function () {
      document.querySelectorAll('[data-members-only] .reveal').forEach(function (el) {
        el.classList.add('is-in');
      });
    });

    if (pendingHref) {
      var href = pendingHref;
      pendingHref = null;
      window.location.href = href;
    }
  };

  /* Restore a sign-in made earlier in this tab, before anything renders. */
  if (session.get(SESSION_KEY) && (memberSections.length || roster
      || document.querySelector('[data-profile-form]'))) {
    loadMembers().then(function () {
      var m = findMember(session.get(SESSION_KEY));
      if (m) unlock(m); else session.del(SESSION_KEY);
    }).catch(function () { });
  }

  /* ------------------------------------------------------------- the gate form */

  memberGates.forEach(function (gate) {
    var note = gate.querySelector('[data-gate-note]');
    var submit = gate.querySelector('button[type="submit"]');
    var say = function (msg, bad) {
      if (!note) return;
      note.textContent = msg;
      note.classList.toggle('form-note--error', !!bad);
    };

    gate.addEventListener('submit', function (event) {
      event.preventDefault();
      var input = gate.querySelector('input[name="phone"]');
      var phone = canonicalPhone(input.value);
      if (phone.length < 9) {
        say('That does not look like a full mobile number.', true);
        return;
      }

      submit.disabled = true;
      // 600,000 rounds is deliberately slow — about a second. Say so, or it
      // reads as a page that has frozen.
      say('Checking your number — this takes a moment…');

      verifyPhone(input.value).then(function (member) {
        submit.disabled = false;
        if (!member) {
          say('We could not match that number. If you have just joined, the '
            + 'committee may not have added you yet — write to us and we will sort it.', true);
          return;
        }
        say('');
        unlock(member);
      }).catch(function (err) {
        submit.disabled = false;
        say(err.message === 'nocrypto'
          ? 'This browser will not let the page check the number. Try a newer one, or a different device.'
          : 'Could not read the member register just now. Please try again shortly.', true);
      });
    });
  });

  /* Signing out matters on a shared phone. */
  document.querySelectorAll('[data-member-signout]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      session.del(SESSION_KEY);
      window.location.reload();
    });
  });

  /* --------------------------------------------------------- roster filters */

  if (roster) {
    var searchInput = document.querySelector('[data-roster-search]');
    var chips = document.querySelectorAll('[data-roster-filter]');
    var emptyState = document.querySelector('[data-roster-empty]');
    var activeCategory = 'all';

    applyFilters = function () {
      var query = (searchInput && searchInput.value || '').trim().toLowerCase();
      var visible = 0;
      roster.querySelectorAll('li').forEach(function (row) {
        var matchesCategory =
          activeCategory === 'all' || row.getAttribute('data-category') === activeCategory;
        var matchesQuery = !query || row.textContent.toLowerCase().indexOf(query) !== -1;
        var show = matchesCategory && matchesQuery;
        row.hidden = !show;
        if (show) visible++;
      });
      if (emptyState) emptyState.hidden = visible !== 0 || !roster.children.length;
    };

    if (searchInput) searchInput.addEventListener('input', applyFilters);
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        activeCategory = chip.getAttribute('data-roster-filter');
        chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
        applyFilters();
      });
    });
  }

  var directoryDialog = document.querySelector('[data-directory-dialog]');
  document.querySelectorAll('[data-directory-open]').forEach(function (btn) {
    btn.addEventListener('click', function () { openDialog(directoryDialog); });
  });

  /* ------------------------------------------- a member's own card */

  var profileDialog = document.querySelector('[data-profile-dialog]');
  var profileForm = document.querySelector('[data-profile-form]');

  if (profileForm) {
    var formNote = profileForm.querySelector('[data-profile-note]');
    var whoLine = profileForm.querySelector('[data-profile-who]');
    var fileInput = profileForm.querySelector('[data-profile-file]');
    var previewImg = profileForm.querySelector('[data-profile-preview]');
    var previewAvatar = profileForm.querySelector('[data-profile-avatar]');
    var jobInput = profileForm.querySelector('input[name="profession"]');
    var fbInput = profileForm.querySelector('input[name="facebook"]');
    var dlLink = profileForm.querySelector('[data-profile-download]');
    var photoData = null;   // the resized photo, as a data URL

    var tell = function (msg, bad) {
      if (!formNote) return;
      formNote.textContent = msg;
      formNote.classList.toggle('form-note--error', !!bad);
    };

    prefillProfile = function () {
      if (!signedIn) return;
      var saved = {};
      try { saved = JSON.parse(local.get(PROFILE_PREFIX + signedIn.id) || '{}'); } catch (e) { }
      if (whoLine) whoLine.textContent = 'Editing your own card: ' + signedIn.name
        + (signedIn.role ? ' · ' + signedIn.role : '');
      if (jobInput) jobInput.value = saved.profession || signedIn.profession || '';
      if (fbInput) fbInput.value = saved.facebook || '';
      if (previewAvatar) previewAvatar.firstChild.nodeValue =
        signedIn.initials || signedIn.name.trim().charAt(0).toUpperCase();
      if (saved.photo && previewImg) {
        photoData = saved.photo;
        previewImg.src = saved.photo;
        previewImg.classList.add('is-loaded');
      }
    };

    /* Shrink the photo before it is stored or handed over. Two reasons: a 4 MB
       phone photo will not fit in localStorage at all, and the committee needs a
       web-sized file anyway. 512px square, which is four times what the card
       ever displays. */
    var resizePhoto = function (file) {
      return new Promise(function (resolve, reject) {
        var url = URL.createObjectURL(file);
        var img = new Image();
        img.onload = function () {
          var S = 512;
          var side = Math.min(img.naturalWidth, img.naturalHeight);
          var canvas = document.createElement('canvas');
          canvas.width = canvas.height = S;
          var ctx = canvas.getContext('2d');
          // Centre crop to a square, the same crop the round avatar will show.
          ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2,
            side, side, 0, 0, S, S);
          URL.revokeObjectURL(url);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('decode')); };
        img.src = url;
      });
    };

    /* Generous, because the photo is downscaled below before it goes anywhere —
       a modern phone camera produces 5-12 MB routinely, and refusing those was
       rejecting perfectly ordinary photographs. This is only a guard against
       something absurd being handed to the decoder. */
    var MAX_PHOTO_BYTES = 25 * 1024 * 1024;
    var OK_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

    if (fileInput) fileInput.addEventListener('change', function () {
      var file = fileInput.files && fileInput.files[0];
      if (!file) return;
      if (OK_PHOTO_TYPES.indexOf(file.type) === -1) {
        fileInput.value = '';
        tell('That file is not a JPEG, PNG or WebP image.', true);
        return;
      }
      if (file.size > MAX_PHOTO_BYTES) {
        fileInput.value = '';
        tell('That photo is ' + Math.round(file.size / 1048576) + ' MB, which is too big to handle here. '
          + 'Please send it to the committee directly.', true);
        return;
      }
      tell('Preparing your photo…');
      resizePhoto(file).then(function (dataUrl) {
        photoData = dataUrl;
        if (previewImg) {
          previewImg.src = dataUrl;
          previewImg.classList.add('is-loaded');
        }
        tell('That is how your photo will be cropped. Now press Save.');
      }).catch(function () {
        fileInput.value = '';
        tell('That image could not be read. Try a different file.', true);
      });
    });

    profileForm.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!signedIn) { tell('Check your number first.', true); return; }

      var record = {
        profession: jobInput ? jobInput.value.trim() : '',
        facebook: fbInput ? fbInput.value.trim() : '',
        photo: photoData || null,
        saved: new Date().toISOString().slice(0, 10)
      };
      try {
        window.localStorage.setItem(PROFILE_PREFIX + signedIn.id, JSON.stringify(record));
      } catch (e) {
        tell('This browser would not store the photo — it may be too large, or storage may be full.', true);
        return;
      }

      showLocalProfiles();

      /* Say exactly what just happened. Saving here CANNOT publish anything:
         there is no server to publish to. It updates this device and hands the
         member the file to send on. Anything vaguer than that would leave people
         believing their photo is live on the site when it is not. */
      /* Two different outcomes, and they must not be reported the same way. A
         photo that was refused a moment ago leaves photoData null; saying "send
         the photo below" then would point at a link that is not there and leave
         the member believing a photo went through. */
      if (photoData) {
        if (dlLink) {
          dlLink.href = photoData;
          dlLink.download = signedIn.id + '.jpg';
          dlLink.hidden = false;
        }
        tell('Saved on this device — your card shows it here, but not yet for anyone else. '
          + 'Send the photo below to the committee and they will publish it.');
      } else {
        if (dlLink) dlLink.hidden = true;
        tell('Profession saved on this device. No photo yet — choose one above, then save again.');
      }
    });
  }

  /* Apply a member's own saved card on their own device, and label it, so nobody
     mistakes a local draft for something the whole community can see. */
  showLocalProfiles = function () {
    document.querySelectorAll('[data-member-id]').forEach(function (card) {
      var saved;
      try { saved = JSON.parse(local.get(PROFILE_PREFIX + card.getAttribute('data-member-id')) || 'null'); }
      catch (e) { saved = null; }
      if (!saved) return;

      if (saved.photo) {
        var img = card.querySelector('.avatar__img');
        if (!img) {
          img = document.createElement('img');
          img.className = 'avatar__img';
          img.alt = '';
          var av = card.querySelector('.avatar');
          if (av) av.appendChild(img);
        }
        img.src = saved.photo;
        img.classList.add('is-loaded');
      }
      if (saved.profession) {
        var job = card.querySelector('.person__job');
        if (job) {
          job.textContent = saved.profession;
          job.classList.remove('person__job--empty');
        }
      }
      if (!card.querySelector('.person__local')) {
        var flag = document.createElement('p');
        flag.className = 'person__local';
        flag.textContent = 'Draft — only on this device';
        card.appendChild(flag);
      }
    });
  };
  showLocalProfiles();

  document.querySelectorAll('[data-profile-open]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      /* This control also sits inside the directory sheet. Close whichever
         dialog it was pressed in before opening this one: two stacked modals
         both write document.body.style.overflow. */
      var current = btn.closest('dialog');
      if (current) closeDialog(current);
      window.requestAnimationFrame(function () { openDialog(profileDialog); });
    });
  });


  /* ---------------------------------------------------------------- forms */

  var successDialog = document.querySelector('[data-success-dialog]');

  document.querySelectorAll('[data-confirm-form]').forEach(function (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      if (successDialog) {
        var heading = successDialog.querySelector('[data-success-title]');
        var body = successDialog.querySelector('[data-success-text]');
        if (heading) heading.textContent = form.getAttribute('data-success-title') || 'Message sent';
        if (body) body.textContent = form.getAttribute('data-success-text') || '';
        openDialog(successDialog);
      }
      form.reset();
    });
  });

  /* ------------------------------------------------- gallery page filters */

  var galleryGrid = document.querySelector('[data-gallery-grid]');
  if (galleryGrid) {
    var galleryChips = document.querySelectorAll('[data-gallery-filter]');
    var countLabel = document.querySelector('[data-gallery-count]');

    var filterGallery = function (category, animate) {
      var shown = 0;
      galleryGrid.querySelectorAll('[data-category]').forEach(function (item) {
        var show = category === 'all' || item.getAttribute('data-category') === category;
        item.hidden = !show;
        if (!show) return;

        /* Each surviving photo pops back in on its own beat, so changing a
           filter reads as the set being re-laid rather than as items blinking
           out. Skipped on first paint, where the reveal observer already owns
           the entrance and the two would fight over the same properties. */
        if (animate && !reduceMotion.matches) {
          item.style.setProperty('--pop-delay', Math.min(shown, 11) * 45 + 'ms');
          replayClass(item, 'is-popping');
        }
        shown++;
      });
      if (countLabel) {
        countLabel.textContent = shown + (shown === 1 ? ' photo' : ' photos');
      }
    };

    // Leave nothing behind: an element still carrying a finished `both`-filled
    // animation keeps its final keyframe pinned, which would freeze the tile's
    // scale and defeat the hover zoom.
    galleryGrid.addEventListener('animationend', function (event) {
      if (event.animationName === 'tile-pop') {
        event.target.classList.remove('is-popping');
        event.target.style.removeProperty('--pop-delay');
      }
    });

    galleryChips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        galleryChips.forEach(function (c) {
          c.setAttribute('aria-pressed', String(c === chip));
        });
        filterGallery(chip.getAttribute('data-gallery-filter'), true);
      });
    });

    filterGallery('all', false);
  }

  /* ------------------------------------------------------- smooth anchors */

  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (event) {
      var id = anchor.getAttribute('href');
      if (!id || id === '#' || id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({
        behavior: reduceMotion.matches ? 'auto' : 'smooth',
        block: 'start'
      });
      // Move keyboard focus with the viewport, not just the scroll position
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      if (history.replaceState) history.replaceState(null, '', id);
    });
  });

  /* --------------------------------------------------------- current year */

  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
