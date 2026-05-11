(function () {

  // ── ELEMENT REFERENCES ────────────────────────────────────────────────────
  const drawer   = document.getElementById('custom-cart-drawer');
  const overlay  = document.getElementById('custom-cart-overlay');
  const closeBtn = document.getElementById('custom-cart-close');
  const itemsCon = document.getElementById('custom-cart-items');
  const emptyEl  = document.getElementById('custom-cart-empty');
  const footerEl = document.getElementById('custom-cart-footer');
  const subtotal = document.getElementById('custom-cart-subtotal');

  // if the snippet isn't on this page, stop here
  if (!drawer) return;

  // ── OPEN / CLOSE ──────────────────────────────────────────────────────────
  function openDrawer() {
    drawer.classList.add('is-open');
    overlay.classList.add('is-visible');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('cart-drawer-open'); // locks page scroll
  }

  function closeDrawer() {
    drawer.classList.remove('is-open');
    overlay.classList.remove('is-visible');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('cart-drawer-open');
    closeAllPopovers();
  }

  closeBtn.addEventListener('click', closeDrawer);
  overlay.addEventListener('click', closeDrawer);  // click outside = close

  // ── FETCH CART DATA ───────────────────────────────────────────────────────
  // /cart.js returns the full cart as JSON — items, totals, count etc.
  function fetchCart() {
    return fetch('/cart.js').then(res => res.json());
  }

  // ── FORMAT PRICE ─────────────────────────────────────────────────────────
  // Shopify stores prices in CENTS (e.g. 1000 = $10.00)
  function formatPrice(cents) {
    return '$' + (cents / 100).toFixed(2);
  }

  // ── RENDER CART ───────────────────────────────────────────────────────────
  function renderCart(cart) {
    // clear previous items
    itemsCon.innerHTML = '';

    if (cart.item_count === 0) {
      // show empty state, hide items + footer
      emptyEl.style.display  = 'flex';
      footerEl.style.display = 'none';
      return;
    }

    // hide empty state, show footer
    emptyEl.style.display  = 'none';
    footerEl.style.display = 'block';

    // render each item
    cart.items.forEach(item => {
      itemsCon.insertAdjacentHTML('beforeend', buildItemHTML(item));
    });

    // update subtotal
    subtotal.textContent = formatPrice(cart.total_price);

    // update the cart icon bubble in Dawn's header
    updateCartBubble(cart.item_count);
  }

  // ── BUILD ITEM HTML ───────────────────────────────────────────────────────
  // Builds a string of HTML for one cart item.
  // data-key is the cart line item key Shopify uses to identify each line
  function buildItemHTML(item) {
    const image = item.image || '';

    // only show variant title if it's not the default
    const variantHTML = (item.variant_title && item.variant_title !== 'Default Title')
      ? `<p class="custom-cart-item__variant">${item.variant_title}</p>`
      : '';

    return `
      <div class="custom-cart-item" data-key="${item.key}">

        <div class="custom-cart-item__image-wrap">
          <img src="${image}" alt="${item.title}" class="custom-cart-item__image" />
        </div>

        <div class="custom-cart-item__details">
          <p class="custom-cart-item__title">${item.title}</p>
          ${variantHTML}
          <p class="custom-cart-item__price">${formatPrice(item.line_price)}</p>

          <div class="custom-cart-item__actions">

            <!-- QUANTITY POPOVER TRIGGER + POPOVER -->
            <div class="quantity-popover-wrapper">

              <!-- clicking this button opens the popover -->
              <button class="quantity-popover-trigger" data-key="${item.key}">
                Qty: <span class="quantity-popover-value">${item.quantity}</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              <!-- the floating panel — hidden until trigger is clicked -->
              <div class="quantity-popover" data-key="${item.key}" aria-hidden="true">
                <button class="quantity-popover__btn" data-action="decrease" data-key="${item.key}">−</button>
                <span class="quantity-popover__count">${item.quantity}</span>
                <button class="quantity-popover__btn" data-action="increase" data-key="${item.key}">+</button>
              </div>

            </div>

            <!-- REMOVE BUTTON -->
            <button class="custom-cart-item__remove" data-key="${item.key}">Remove</button>

          </div>
        </div>

      </div>
    `;
  }

  // ── POPOVER OPEN / CLOSE ──────────────────────────────────────────────────
  function openPopover(key) {
    closeAllPopovers(); // close any other open popovers first
    const popover = itemsCon.querySelector(`.quantity-popover[data-key="${key}"]`);
    if (popover) {
      popover.classList.add('is-open');
      popover.setAttribute('aria-hidden', 'false');
    }
  }

  function closeAllPopovers() {
    itemsCon.querySelectorAll('.quantity-popover.is-open').forEach(p => {
      p.classList.remove('is-open');
      p.setAttribute('aria-hidden', 'true');
    });
  }

  // close popovers if user clicks anywhere outside a popover wrapper
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.quantity-popover-wrapper')) {
      closeAllPopovers();
    }
  });

  // ── EVENT DELEGATION ──────────────────────────────────────────────────────
  // Instead of adding a click listener to EVERY button in every item,
  // we add ONE listener to the parent container.
  // When a click happens, we check what was actually clicked using .closest()
  itemsCon.addEventListener('click', function (e) {

    // -- Was the POPOVER TRIGGER clicked? --
    const trigger = e.target.closest('.quantity-popover-trigger');
    if (trigger) {
      e.stopPropagation(); // don't let this bubble up to the document listener
      const key = trigger.dataset.key;
      const popover = itemsCon.querySelector(`.quantity-popover[data-key="${key}"]`);
      // toggle: if already open → close it, if closed → open it
      if (popover.classList.contains('is-open')) {
        closeAllPopovers();
      } else {
        openPopover(key);
      }
      return;
    }

    // -- Was a + or − BUTTON inside the popover clicked? --
    const qtyBtn = e.target.closest('.quantity-popover__btn');
    if (qtyBtn) {
      e.stopPropagation();
      const key    = qtyBtn.dataset.key;
      const action = qtyBtn.dataset.action; // "increase" or "decrease"

      // read the current quantity from the popover's count display
      const countEl  = qtyBtn.closest('.quantity-popover').querySelector('.quantity-popover__count');
      const currentQty = parseInt(countEl.textContent);

      const newQty = action === 'increase' ? currentQty + 1 : currentQty - 1;

      if (newQty < 1) {
        removeItem(key);  // quantity hit 0 → remove the item entirely
      } else {
        updateQuantity(key, newQty);
      }
      return;
    }

    // -- Was the REMOVE button clicked? --
    const removeBtn = e.target.closest('.custom-cart-item__remove');
    if (removeBtn) {
      removeItem(removeBtn.dataset.key);
      return;
    }

  });

  // ── UPDATE QUANTITY ───────────────────────────────────────────────────────
  // /cart/change.js updates a line item by key and returns the updated cart
  function updateQuantity(key, quantity) {
    fetch('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: key, quantity: quantity })
    })
    .then(res => res.json())
    .then(cart => renderCart(cart))  // re-render with updated data
    .catch(err => console.error('Update qty error:', err));
  }

  // ── REMOVE ITEM ───────────────────────────────────────────────────────────
  // setting quantity to 0 removes the item from the cart
  function removeItem(key) {
    updateQuantity(key, 0);
  }

  // ── UPDATE CART BUBBLE ────────────────────────────────────────────────────
  // keeps the count badge on Dawn's header cart icon in sync
  function updateCartBubble(count) {
    const bubble = document.getElementById('cart-icon-bubble');
    if (!bubble) return;
    bubble.innerHTML = count > 0
      ? `<span class="visually-hidden">Cart</span><span class="cart-count-bubble">${count}</span>`
      : `<span class="visually-hidden">Cart</span>`;
  }

  // ── PUBLIC API ────────────────────────────────────────────────────────────
  // We expose one method on window so custom-cart.js can call it
  // after adding the item — it fetches fresh cart data then opens the drawer
  window.CustomCartDrawer = {
    open: function () {
      fetchCart().then(function (cart) {
        renderCart(cart);
        openDrawer();
      });
    }
  };

})();
