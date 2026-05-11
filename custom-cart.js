(function () {

  // Target the form, not the button — Dawn intercepts at submit level
  const form = document.querySelector('form[data-type="add-to-cart-form"]');
  if (!form) return;

  form.addEventListener('submit', function (e) {

    // ✅ Block the native form POST (prevents redirect to /cart page)
    e.preventDefault();

    // ✅ Kill Dawn's product-form.js submit handler before it fires
    // Without this, Dawn still intercepts and opens its own drawer
    e.stopImmediatePropagation();

    // Read variant ID from Dawn's hidden input
    // This value auto-updates when customer selects a different variant
    const variantInput = form.querySelector('input.product-variant-id');
    const variantId = variantInput ? variantInput.value : null;

    if (!variantId) {
      console.error('No variant ID found on this form');
      return;
    }

    // Grab the button to show loading state
    const button = form.querySelector('button[name="add"]');
    const buttonSpan = button ? button.querySelector('span') : null;

    if (button) {
      button.disabled = true;
      if (buttonSpan) buttonSpan.textContent = 'Adding...';
    }

    fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: variantId, quantity: 1 })
    })
    .then(function () {
      // Fetch fresh cart data and open YOUR drawer
      if (window.CustomCartDrawer) {
        window.CustomCartDrawer.open();
      } else {
        console.warn('CustomCartDrawer not found — check custom-cart-drawer.js is loaded');
      }
    })
    .catch(function (err) {
      console.error('Cart add error:', err);
    })
    .finally(function () {
      if (button) {
        button.disabled = false;
        if (buttonSpan) buttonSpan.textContent = 'Add to Cart';
      }
    });

  // ⚠️ useCapture: true — runs YOUR listener BEFORE Dawn's listener
  // This is the key to winning the race against product-form.js
  }, true);

})();
