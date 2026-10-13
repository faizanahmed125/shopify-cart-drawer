(() => {
  const productFormSelector = [
    'form[data-type="add-to-cart-form"]',
    'form[action*="/cart/add"]'
  ].join(',');

  const routesRoot = window.Shopify?.routes?.root || '/';

  document.addEventListener('submit', async (event) => {
    const form = event.target.closest(productFormSelector);
    if (!form) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const submitButton = event.submitter || form.querySelector('[type="submit"]');
    const buttonLabel = submitButton?.querySelector('span');
    const originalLabel = buttonLabel?.textContent;

    if (submitButton) submitButton.disabled = true;
    if (buttonLabel) buttonLabel.textContent = 'Adding…';

    try {
      const formData = new FormData(form);
      const response = await fetch(routesRoot + 'cart/add.js', {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: formData
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.description || result.message || 'Unable to add this item.');
      }

      if (!window.CustomCartDrawer) {
        throw new Error('The cart drawer script is not loaded.');
      }

      await window.CustomCartDrawer.open();
    } catch (error) {
      console.error('Add-to-cart error:', error);

      if (window.CustomCartDrawer) {
        window.CustomCartDrawer.showError(error.message);
      } else {
        form.dispatchEvent(new CustomEvent('custom-cart:error', {
          bubbles: true,
          detail: { message: error.message }
        }));
      }
    } finally {
      if (submitButton) submitButton.disabled = false;
      if (buttonLabel && originalLabel) buttonLabel.textContent = originalLabel;
    }
  }, true);
})();
