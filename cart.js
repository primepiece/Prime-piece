/* Prime Piece — Cart System */
(function () {
  const KEY = 'pp_cart_v2';

  function getItems() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch { return []; }
  }

  function setItems(items) {
    localStorage.setItem(KEY, JSON.stringify(items));
  }

  function inject() {
    const style = document.createElement('style');
    style.textContent = `
      .cart-nav-btn {
        display: flex; align-items: center; position: relative;
        background: none; border: none; cursor: pointer;
        color: var(--ink-soft); transition: color 0.2s; padding: 4px;
      }
      .cart-nav-btn:hover { color: var(--sage); }
      .cart-nav-btn svg { width: 19px; height: 19px; }
      .cart-count-badge {
        display: none; align-items: center; justify-content: center;
        width: 17px; height: 17px; border-radius: 50%;
        background: var(--sage, #7BA5A8); color: white;
        font-size: 9px; font-weight: 600; font-family: 'Inter Tight', sans-serif;
        position: absolute; top: -4px; right: -6px; line-height: 1;
      }
      .cart-count-badge.visible { display: flex; }

      #cart-overlay {
        position: fixed; inset: 0; z-index: 300;
        background: rgba(44,42,38,0.5); backdrop-filter: blur(4px);
        opacity: 0; pointer-events: none; transition: opacity 0.3s;
      }
      #cart-overlay.open { opacity: 1; pointer-events: all; }

      #cart-drawer {
        position: fixed; top: 0; right: 0; bottom: 0; width: 420px; max-width: 100vw;
        background: #F5F1EA; z-index: 301; display: flex; flex-direction: column;
        transform: translateX(100%);
        transition: transform 0.38s cubic-bezier(0.25,0.46,0.45,0.94);
        border-left: 1px solid rgba(44,42,38,0.1);
        box-shadow: -12px 0 48px rgba(44,42,38,0.12);
      }
      #cart-drawer.open { transform: translateX(0); }

      .cart-header {
        padding: 28px 28px 20px; border-bottom: 1px solid rgba(44,42,38,0.1);
        display: flex; justify-content: space-between; align-items: flex-start;
      }
      .cart-title {
        font-family: 'Cormorant Garamond', serif;
        font-size: 28px; font-weight: 300; color: #2C2A26; letter-spacing: -0.01em; line-height: 1;
      }
      .cart-title-sub {
        font-size: 9px; letter-spacing: 0.28em; text-transform: uppercase;
        color: #8A8275; font-weight: 500; margin-top: 4px;
        font-family: 'Inter Tight', sans-serif;
      }
      .cart-close-btn {
        width: 34px; height: 34px; border-radius: 50%;
        border: 1px solid rgba(44,42,38,0.12); background: transparent;
        cursor: pointer; display: flex; align-items: center; justify-content: center;
        color: #8A8275; font-size: 15px; transition: all 0.2s; flex-shrink: 0;
      }
      .cart-close-btn:hover { background: white; color: #2C2A26; }

      #cart-items { flex: 1; overflow-y: auto; padding: 8px 28px 0; }

      .cart-empty {
        display: flex; flex-direction: column; align-items: center;
        justify-content: center; height: 280px; text-align: center;
      }
      .cart-empty-glyph {
        font-family: 'Cormorant Garamond', serif; font-size: 52px;
        color: #A8C3C5; margin-bottom: 16px; opacity: 0.4; line-height: 1;
      }
      .cart-empty h3 {
        font-family: 'Cormorant Garamond', serif;
        font-size: 22px; font-weight: 300; color: #2C2A26; margin-bottom: 8px;
      }
      .cart-empty p {
        font-size: 13px; color: #8A8275; line-height: 1.7;
        font-family: 'Inter Tight', sans-serif; max-width: 220px;
      }

      .cart-item {
        display: flex; gap: 14px; padding: 18px 0;
        border-bottom: 1px solid rgba(44,42,38,0.08);
        align-items: flex-start;
      }
      .cart-item-img {
        width: 68px; height: 68px; object-fit: cover;
        border-radius: 2px; flex-shrink: 0; background: #EBE5DA;
      }
      .cart-item-body { flex: 1; min-width: 0; }
      .cart-item-name {
        font-family: 'Cormorant Garamond', serif;
        font-size: 19px; font-weight: 300; color: #2C2A26;
        margin-bottom: 2px; letter-spacing: -0.01em; line-height: 1.1;
      }
      .cart-item-meta {
        font-size: 9px; letter-spacing: 0.22em; text-transform: uppercase;
        color: #8A8275; font-weight: 500; margin-bottom: 6px;
        font-family: 'Inter Tight', sans-serif;
      }
      .cart-item-price {
        font-family: 'Cormorant Garamond', serif;
        font-size: 17px; color: #7BA5A8; font-weight: 300;
      }
      .cart-item-remove {
        background: none; border: none; cursor: pointer;
        color: #8A8275; font-size: 14px; padding: 2px 4px;
        transition: color 0.2s; flex-shrink: 0; line-height: 1;
        margin-top: 2px;
      }
      .cart-item-remove:hover { color: #2C2A26; }

      .cart-footer {
        padding: 20px 28px 32px; border-top: 1px solid rgba(44,42,38,0.1);
      }
      .cart-subtotal-row {
        display: flex; justify-content: space-between; align-items: baseline;
        padding-bottom: 16px; margin-bottom: 16px;
        border-bottom: 1px solid rgba(44,42,38,0.08);
      }
      .cart-subtotal-label {
        font-size: 9px; letter-spacing: 0.28em; text-transform: uppercase;
        color: #8A8275; font-weight: 500; font-family: 'Inter Tight', sans-serif;
      }
      .cart-subtotal-val {
        font-family: 'Cormorant Garamond', serif;
        font-size: 30px; font-weight: 300; color: #2C2A26; letter-spacing: -0.02em;
      }
      .cart-checkout-btn {
        display: flex; align-items: center; justify-content: center; gap: 10px;
        width: 100%; padding: 16px; text-decoration: none;
        background: #7BA5A8; color: white; border: none; border-radius: 1px;
        font-family: 'Inter Tight', sans-serif; font-size: 10px;
        letter-spacing: 0.28em; text-transform: uppercase; font-weight: 500;
        cursor: pointer; transition: background 0.2s;
      }
      .cart-checkout-btn:hover { background: #5D8588; }
      .cart-note {
        font-size: 11px; color: #8A8275; text-align: center; margin-top: 10px;
        font-family: 'Inter Tight', sans-serif; line-height: 1.5; display: flex;
        align-items: center; justify-content: center; gap: 6px;
      }
      .cart-note svg { width: 12px; height: 12px; flex-shrink: 0; }

      .pp-add-btn {
        display: inline-flex; align-items: center; gap: 8px;
        padding: 10px 20px; font-size: 10px; letter-spacing: 0.24em; text-transform: uppercase;
        border: 1px solid #7BA5A8; color: #7BA5A8;
        background: transparent; cursor: pointer; transition: all 0.3s;
        font-family: 'Inter Tight', sans-serif; font-weight: 500; border-radius: 1px;
      }
      .pp-add-btn:hover, .pp-add-btn.in-cart {
        background: #7BA5A8; color: white;
      }
      .pp-price {
        font-family: 'Cormorant Garamond', serif;
        font-size: 21px; font-weight: 300; color: #7BA5A8;
        margin-bottom: 4px; letter-spacing: -0.01em;
      }
      .pp-price-label {
        font-size: 9px; letter-spacing: 0.24em; text-transform: uppercase;
        color: #8A8275; font-weight: 500; font-family: 'Inter Tight', sans-serif;
        margin-bottom: 14px; display: block;
      }

      @media (max-width: 480px) { #cart-drawer { width: 100vw; } }
    `;
    document.head.appendChild(style);

    document.body.insertAdjacentHTML('beforeend', `
      <div id="cart-overlay" onclick="Cart.close()"></div>
      <aside id="cart-drawer" aria-label="Shopping cart">
        <div class="cart-header">
          <div>
            <div class="cart-title">Your Cart</div>
            <div class="cart-title-sub">Prime Piece — One of one</div>
          </div>
          <button class="cart-close-btn" onclick="Cart.close()" aria-label="Close cart">✕</button>
        </div>
        <div id="cart-items"></div>
        <div class="cart-footer">
          <div class="cart-subtotal-row">
            <span class="cart-subtotal-label">Total (NZD incl. GST)</span>
            <span class="cart-subtotal-val" id="cart-total">$0</span>
          </div>
          <a href="checkout.html" class="cart-checkout-btn" id="cart-checkout-btn" onclick="Cart.beginCheckout()">
            Proceed to Checkout &nbsp;→
          </a>
          <p class="cart-note">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
            Secure checkout · Powered by Stripe
          </p>
        </div>
      </aside>
    `);

    const navLinks = document.querySelector('.nav-links');
    if (navLinks) {
      const li = document.createElement('li');
      li.innerHTML = `
        <button class="cart-nav-btn" onclick="Cart.open()" aria-label="View cart">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 01-8 0"/>
          </svg>
          <span class="cart-count-badge" id="cart-count-badge">0</span>
        </button>
      `;
      navLinks.appendChild(li);
    }
  }

  function render() {
    const items = getItems();
    const el = document.getElementById('cart-items');
    if (!el) return;

    const total = items.reduce((s, i) => s + i.price, 0);
    const totalEl = document.getElementById('cart-total');
    if (totalEl) totalEl.textContent = '$' + total.toLocaleString('en-NZ');

    if (items.length === 0) {
      el.innerHTML = `
        <div class="cart-empty">
          <div class="cart-empty-glyph">◯</div>
          <h3>Nothing here yet.</h3>
          <p>Browse the collection and add a piece to get started.</p>
        </div>`;
      return;
    }

    el.innerHTML = items.map(item => `
      <div class="cart-item">
        <img class="cart-item-img" src="${item.image}" alt="${item.name}" loading="lazy">
        <div class="cart-item-body">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-meta">${item.type}</div>
          <div class="cart-item-price">NZD $${item.price.toLocaleString('en-NZ')}</div>
        </div>
        <button class="cart-item-remove" onclick="Cart.remove('${item.id}')" aria-label="Remove ${item.name}">✕</button>
      </div>
    `).join('');
  }

  function updateBadge() {
    const count = getItems().length;
    const badge = document.getElementById('cart-count-badge');
    if (badge) {
      badge.textContent = count;
      badge.classList.toggle('visible', count > 0);
    }
    const ids = getItems().map(i => i.id);
    document.querySelectorAll('.pp-add-btn[data-id]').forEach(btn => {
      const inCart = ids.includes(btn.dataset.id);
      btn.classList.toggle('in-cart', inCart);
      btn.textContent = inCart ? 'In Cart ✓' : 'Add to Cart →';
    });
  }

  function track(gaEvent, gaParams, fbEvent, fbParams) {
    try { if (typeof gtag !== 'undefined') gtag('event', gaEvent, gaParams); } catch(e) {}
    try { if (typeof fbq !== 'undefined' && fbEvent) fbq('track', fbEvent, fbParams); } catch(e) {}
  }

  window.Cart = {
    open() {
      document.getElementById('cart-drawer')?.classList.add('open');
      document.getElementById('cart-overlay')?.classList.add('open');
      document.body.style.overflow = 'hidden';
      render();
      const items = getItems();
      if (items.length > 0) {
        track('view_cart', {
          currency: 'NZD',
          value: items.reduce((s, i) => s + i.price, 0),
          items: items.map(i => ({ item_id: i.id, item_name: i.name, item_category: i.type, price: i.price, quantity: 1 })),
        });
      }
    },
    close() {
      document.getElementById('cart-drawer')?.classList.remove('open');
      document.getElementById('cart-overlay')?.classList.remove('open');
      document.body.style.overflow = '';
    },
    add(item) {
      const items = getItems();
      if (items.find(i => i.id === item.id)) { Cart.open(); return; }
      items.push(item);
      setItems(items);
      updateBadge();
      track(
        'add_to_cart',
        { currency: 'NZD', value: item.price, items: [{ item_id: item.id, item_name: item.name, item_category: item.type, price: item.price, quantity: 1 }] },
        'AddToCart',
        { content_ids: [item.id], content_name: item.name, content_type: 'product', value: item.price, currency: 'NZD' }
      );
      // Klaviyo "Added to Cart" — only fires when customer email is already known
      try {
        const knownEmail = localStorage.getItem('pp_customer_email');
        if (knownEmail) {
          const allItems = getItems();
          const cartValue = allItems.reduce((s, i) => s + i.price, 0) + item.price;
          const fullCart = allItems.concat([item]);
          fetch('/api/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: knownEmail,
              event: 'Added to Cart',
              properties: {
                product_id: item.id,
                product_name: item.name,
                price: item.price,
                product_image: 'https://primepiece.co.nz/' + (item.image || ''),
                currency: 'NZD',
                cart_value: cartValue,
                checkout_url: 'https://primepiece.co.nz/checkout.html',
                url: window.location.href,
                items: fullCart.map(i => ({
                  id: i.id,
                  name: i.name,
                  price: i.price,
                  image: 'https://primepiece.co.nz/' + (i.image || ''),
                })),
              },
            }),
          }).catch(() => {});
        }
      } catch(_) {}
      Cart.open();
    },
    remove(id) {
      const item = getItems().find(i => i.id === id);
      setItems(getItems().filter(i => i.id !== id));
      updateBadge();
      render();
      if (item) track('remove_from_cart', { currency: 'NZD', value: item.price, items: [{ item_id: item.id, item_name: item.name, price: item.price, quantity: 1 }] });
    },
    beginCheckout() {
      const items = getItems();
      const value = items.reduce((s, i) => s + i.price, 0);
      track(
        'begin_checkout',
        { currency: 'NZD', value, items: items.map(i => ({ item_id: i.id, item_name: i.name, item_category: i.type, price: i.price, quantity: 1 })) },
        'InitiateCheckout',
        { content_ids: items.map(i => i.id), value, currency: 'NZD', num_items: items.length }
      );
    },
    getItems,
    getTotal() { return getItems().reduce((s, i) => s + i.price, 0); },
  };

  inject();
  updateBadge();
})();
