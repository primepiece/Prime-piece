/* Prime Piece — global navigation behaviour (see site-nav.css). */
(function () {
  var nav = document.querySelector('nav.site-nav');
  if (!nav) return;

  // Overlay header: transparent over the hero, solid once scrolled.
  if (nav.classList.contains('site-nav--overlay')) {
    var onScroll = function () { nav.classList.toggle('scrolled', window.scrollY > 80); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Collections dropdown: hover on pointer devices, click/tap and keyboard everywhere.
  var dd = nav.querySelector('.nav-dd');
  if (dd) {
    var toggle = dd.querySelector('.nav-dd-toggle');
    var links = dd.querySelectorAll('.nav-dd-menu a');
    var closeTimer, hoverOpenedAt = 0;
    var setOpen = function (open) {
      dd.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    var canHover = window.matchMedia('(hover: hover)').matches;
    if (canHover) {
      dd.addEventListener('mouseenter', function () {
        clearTimeout(closeTimer);
        if (!dd.classList.contains('is-open')) hoverOpenedAt = Date.now();
        setOpen(true);
      });
      dd.addEventListener('mouseleave', function () { closeTimer = setTimeout(function () { setOpen(false); }, 160); });
    }
    toggle.addEventListener('click', function (e) {
      e.preventDefault();
      // A click that follows the hover which just opened the menu should keep it open.
      if (Date.now() - hoverOpenedAt < 800) { setOpen(true); return; }
      setOpen(!dd.classList.contains('is-open'));
    });
    toggle.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); links[0] && links[0].focus(); }
    });
    dd.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { setOpen(false); toggle.focus(); }
    });
    dd.addEventListener('focusout', function (e) { if (!dd.contains(e.relatedTarget)) setOpen(false); });
    document.addEventListener('click', function (e) { if (!dd.contains(e.target)) setOpen(false); });
  }

  // Mobile menu.
  var ham = document.getElementById('nav-hamburger');
  var menu = document.getElementById('mobile-menu');
  if (ham && menu) {
    var setMenu = function (open) {
      ham.classList.toggle('open', open);
      menu.classList.toggle('open', open);
      document.body.classList.toggle('site-nav-open', open);
      ham.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.style.overflow = open ? 'hidden' : '';
    };
    ham.addEventListener('click', function () { setMenu(!menu.classList.contains('open')); });
    menu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { setMenu(false); });
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('open')) setMenu(false); });

    // "Enquire Now" opens the page's own enquiry form when it has one.
    var enquire = menu.querySelector('[data-enquire]');
    if (enquire) {
      enquire.addEventListener('click', function (e) {
        if (typeof window.openEnquireModal === 'function') { e.preventDefault(); window.openEnquireModal('General Enquiry'); }
        else if (typeof window.openEnquiry === 'function') { e.preventDefault(); window.openEnquiry('General Enquiry'); }
      });
    }
  }
})();
