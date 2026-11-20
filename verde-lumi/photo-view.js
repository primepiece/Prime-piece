// Verde Lumi: photo view of the illuminated green onyx plinth.
//
// The picture is the actual plinth (from workshop footage) placed into a styled night room.
// This script only frames the photo for the screen and runs the light switch. The switch fades
// to a second photo of the plinth lit, set with data-lit-src on #stage. Until that photo exists
// the switch stays disabled.
(function () {
  const IMG = 1254;                                       // the photo is 1254 x 1254
  // Areas that must stay in frame. Wide screens see the room; portrait screens crop tighter on
  // the plinth, with the sofa arm beside it for scale.
  const FOCUS_WIDE = { x0: 0, x1: 1150, y0: 240, y1: 1130 };
  const FOCUS_TALL = { x0: 330, x1: 960, y0: 420, y1: 1090 };

  const stage = document.getElementById('stage');
  const shots = Array.from(stage.querySelectorAll('.room-shot'));
  const lightBtn = document.getElementById('light-switch');
  const lightLabel = document.getElementById('light-label');

  function computeCrop(w, h) {
    const a = w / h;
    const F = w < 640 ? FOCUS_TALL : FOCUS_WIDE;
    let ch = Math.max(F.y1 - F.y0, (F.x1 - F.x0) / a);
    ch = Math.min(ch, IMG, IMG / a);
    const cw = ch * a;
    const x = Math.min(Math.max((F.x0 + F.x1) / 2 - cw / 2, 0), IMG - cw);
    let y = (F.y0 + F.y1) / 2 - ch / 2;
    y = Math.max(y, F.y1 - ch);
    y = Math.min(Math.max(y, 0), IMG - ch);
    return { x, y, w: cw };
  }

  function layout() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    const c = computeCrop(w, h);
    const s = w / c.w;
    shots.forEach((img) => {
      img.style.width = IMG + 'px';
      img.style.height = IMG + 'px';
      img.style.transform = `translate(${(-c.x * s).toFixed(2)}px, ${(-c.y * s).toFixed(2)}px) scale(${s})`;
    });
  }
  new ResizeObserver(layout).observe(stage);
  layout();

  // ---- Light switch ----
  const litSrc = stage.dataset.litSrc;
  if (!litSrc) {
    lightBtn.disabled = true;
    lightLabel.textContent = 'Lit photo coming soon';
    return;
  }
  const lit = document.createElement('img');
  lit.className = 'room-layer room-shot room-shot--lit';
  lit.alt = '';
  lit.setAttribute('aria-hidden', 'true');
  lit.decoding = 'async';
  lit.src = litSrc;
  stage.insertBefore(lit, shots[shots.length - 1].nextSibling);
  shots.push(lit);
  layout();

  let on = false;
  lightBtn.setAttribute('aria-pressed', 'false');
  lightBtn.addEventListener('click', () => {
    on = !on;
    lightBtn.classList.toggle('is-on', on);
    lightBtn.setAttribute('aria-pressed', String(on));
    lightLabel.textContent = on ? 'Switch off the light' : 'Switch on the light';
    stage.classList.toggle('is-lit', on);
  });
})();
