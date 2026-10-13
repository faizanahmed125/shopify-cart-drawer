(() => {
  const drawer = document.getElementById('custom-cart-drawer');
  if (!drawer) return;

  const overlay = document.getElementById('custom-cart-overlay');
  const closeButton = document.getElementById('custom-cart-close');
  const itemsContainer = document.getElementById('custom-cart-items');
  const emptyState = document.getElementById('custom-cart-empty');
  const footer = document.getElementById('custom-cart-footer');
  const subtotal = document.getElementById('custom-cart-subtotal');
  const status = document.getElementById('custom-cart-status');
  const routesRoot = window.Shopify?.routes?.root || '/';
  const moneyFormat = drawer.dataset.moneyFormat || '$' + '{{amount}}';

  let previouslyFocusedElement = null;

  function formatWithDelimiters(cents, precision = 2, thousands = ',', decimal = '.') {
    const value = Number(cents);
    if (!Number.isFinite(value)) return '0';

    const fixed = (value / 100).toFixed(precision);
    const parts = fixed.split('.');
    const dollars = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousands);
    return parts[1] ? dollars + decimal + parts[1] : dollars;
  }

  function formatMoney(cents) {
    const match = moneyFormat.match(/\{\{\s*(\w+)\s*\}\}/);
    const placeholder = match?.[1] || 'amount';
    let value;

    switch (placeholder) {
      case 'amount_no_decimals':
        value = formatWithDelimiters(cents, 0);
        break;
      case 'amount_with_comma_separator':
        value = formatWithDelimiters(cents, 2, '.', ',');
        break;
      case 'amount_no_decimals_with_comma_separator':
        value = formatWithDelimiters(cents, 0, '.', ',');
        break;
      case 'amount_with_apostrophe_separator':
        value = formatWithDelimiters(cents, 2, "'", '.');
        break;
      default:
        value = formatWithDelimiters(cents);
    }

    return moneyFormat.replace(match?.[0] || '{{amount}}', value);
  }

  function setStatus(message = '', isError = false) {
    status.textContent = message;
    status.classList.toggle('is-error', isError);
  }

  function setBusy(isBusy) {
    drawer.setAttribute('aria-busy', String(isBusy));
    itemsContainer.classList.toggle('is-loading', isBusy);
  }

  function openDrawer() {
    previouslyFocusedElement = document.activeElement;
    drawer.classList.add('is-open');
    overlay.classList.add('is-visible');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('cart-drawer-open');
    window.requestAnimationFrame(() => closeButton.focus());
  }

  function closeDrawer() {
    drawer.classList.remove('is-open');
    overlay.classList.remove('is-visible');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('cart-drawer-open');
    closeAllPopovers();

    if (previouslyFocusedElement instanceof HTMLElement) {
      previouslyFocusedElement.focus();
    }
  }

  async function requestCart(path = 'cart.js', options = {}) {
    const response = await fetch(routesRoot + path, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.headers || {})
      }
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.description || data.message || 'Cart request failed.');
    }

    return data;
  }

  function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function createCartItem(item) {
    const itemElement = createElement('article', 'custom-cart-item');
    itemElement.dataset.key = item.key;

    const imageWrapper = createElement('div', 'custom-cart-item__image-wrap');
    if (item.image) {
      const image = createElement('img', 'custom-cart-item__image');
      image.src = item.image;
      image.alt = item.product_title || item.title || '';
      image.loading = 'lazy';
      imageWrapper.appendChild(image);
    }

    const details = createElement('div', 'custom-cart-item__details');
    details.appendChild(createElement('p', 'custom-cart-item__title', item.product_title || item.title));

    if (item.variant_title && item.variant_title !== 'Default Title') {
      details.appendChild(createElement('p', 'custom-cart-item__variant', item.variant_title));
    }

    details.appendChild(createElement('p', 'custom-cart-item__price', formatMoney(item.final_line_price)));

    const actions = createElement('div', 'custom-cart-item__actions');
    const quantityWrapper = createElement('div', 'quantity-popover-wrapper');
    const trigger = createElement('button', 'quantity-popover-trigger');
    trigger.type = 'button';
    trigger.dataset.key = item.key;
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-label', `Change quantity for ${item.product_title || item.title}`);
    trigger.append('Qty: ', createElement('span', 'quantity-popover-value', item.quantity), ' ▾');

    const popover = createElement('div', 'quantity-popover');
    popover.dataset.key = item.key;
    popover.setAttribute('aria-hidden', 'true');

    const decrease = createElement('button', 'quantity-popover__btn', '−');
    decrease.type = 'button';
    decrease.dataset.action = 'decrease';
    decrease.dataset.key = item.key;
    decrease.setAttribute('aria-label', 'Decrease quantity');

    const count = createElement('span', 'quantity-popover__count', item.quantity);

    const increase = createElement('button', 'quantity-popover__btn', '+');
    increase.type = 'button';
    increase.dataset.action = 'increase';
    increase.dataset.key = item.key;
    increase.setAttribute('aria-label', 'Increase quantity');

    popover.append(decrease, count, increase);
    quantityWrapper.append(trigger, popover);

    const remove = createElement('button', 'custom-cart-item__remove', 'Remove');
    remove.type = 'button';
    remove.dataset.key = item.key;
    remove.setAttribute('aria-label', `Remove ${item.product_title || item.title} from cart`);

    actions.append(quantityWrapper, remove);
    details.appendChild(actions);
    itemElement.append(imageWrapper, details);

    return itemElement;
  }

  function renderCart(cart) {
    itemsContainer.replaceChildren();

    const hasItems = cart.item_count > 0;
    emptyState.style.display = hasItems ? 'none' : 'flex';
    footer.style.display = hasItems ? 'block' : 'none';

    if (hasItems) {
      const fragment = document.createDocumentFragment();
      cart.items.forEach((item) => fragment.appendChild(createCartItem(item)));
      itemsContainer.appendChild(fragment);
      subtotal.textContent = formatMoney(cart.total_price);
    }

    updateCartBubble(cart.item_count);
    document.dispatchEvent(new CustomEvent('custom-cart:updated', { detail: cart }));
  }

  function openPopover(key) {
    closeAllPopovers();
    const popover = [...itemsContainer.querySelectorAll('.quantity-popover')]
      .find((element) => element.dataset.key === key);

    if (!popover) return;

    popover.classList.add('is-open');
    popover.setAttribute('aria-hidden', 'false');
    popover.previousElementSibling?.setAttribute('aria-expanded', 'true');
  }

  function closeAllPopovers() {
    itemsContainer.querySelectorAll('.quantity-popover.is-open').forEach((popover) => {
      popover.classList.remove('is-open');
      popover.setAttribute('aria-hidden', 'true');
      popover.previousElementSibling?.setAttribute('aria-expanded', 'false');
    });
  }

  async function updateQuantity(key, quantity) {
    setBusy(true);
    setStatus('Updating cart…');

    try {
      const cart = await requestCart('cart/change.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: key, quantity })
      });
      renderCart(cart);
      setStatus(quantity === 0 ? 'Item removed.' : 'Cart updated.');
    } catch (error) {
      console.error('Cart update error:', error);
      setStatus(error.message, true);
    } finally {
      setBusy(false);
    }
  }

  function updateCartBubble(count) {
    const cartLink = document.getElementById('cart-icon-bubble');
    if (!cartLink) return;

    let bubble = cartLink.querySelector('.cart-count-bubble');

    if (count < 1) {
      bubble?.remove();
      return;
    }

    if (!bubble) {
      bubble = createElement('div', 'cart-count-bubble');
      bubble.append(createElement('span'), createElement('span', 'visually-hidden'));
      bubble.firstElementChild.setAttribute('aria-hidden', 'true');
      cartLink.appendChild(bubble);
    }

    bubble.firstElementChild.textContent = count;
    bubble.lastElementChild.textContent = `${count} ${count === 1 ? 'item' : 'items'}`;
  }

  closeButton.addEventListener('click', closeDrawer);
  overlay.addEventListener('click', closeDrawer);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && drawer.classList.contains('is-open')) {
      closeDrawer();
    }
  });

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.quantity-popover-wrapper')) {
      closeAllPopovers();
    }
  });

  itemsContainer.addEventListener('click', (event) => {
    const trigger = event.target.closest('.quantity-popover-trigger');
    if (trigger) {
      event.stopPropagation();
      const isOpen = trigger.getAttribute('aria-expanded') === 'true';
      isOpen ? closeAllPopovers() : openPopover(trigger.dataset.key);
      return;
    }

    const quantityButton = event.target.closest('.quantity-popover__btn');
    if (quantityButton) {
      event.stopPropagation();
      const popover = quantityButton.closest('.quantity-popover');
      const currentQuantity = Number.parseInt(
        popover.querySelector('.quantity-popover__count').textContent,
        10
      );
      const nextQuantity = quantityButton.dataset.action === 'increase'
        ? currentQuantity + 1
        : currentQuantity - 1;

      updateQuantity(quantityButton.dataset.key, Math.max(nextQuantity, 0));
      return;
    }

    const removeButton = event.target.closest('.custom-cart-item__remove');
    if (removeButton) {
      updateQuantity(removeButton.dataset.key, 0);
    }
  });

  window.CustomCartDrawer = {
    async open() {
      setBusy(true);
      setStatus('');

      try {
        const cart = await requestCart();
        renderCart(cart);
        openDrawer();
      } catch (error) {
        console.error('Cart loading error:', error);
        setStatus(error.message, true);
        openDrawer();
      } finally {
        setBusy(false);
      }
    },
    showError(message) {
      setStatus(message, true);
      openDrawer();
    }
  };
})();
