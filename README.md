# Shopify AJAX Cart Drawer

A custom Shopify cart drawer built with Liquid, CSS and vanilla JavaScript. It adds products without a page reload, renders the latest cart state and supports quantity updates and item removal through Shopify's Ajax Cart API.

## Highlights

- AJAX add-to-cart flow
- Quantity updates and item removal
- Theme-aware Shopify money formatting
- Locale-aware Shopify cart routes
- Responsive drawer and overlay
- Loading, empty and error states
- Keyboard close support and focus restoration
- Safe DOM rendering for product data
- Dawn-style cart-count synchronization
- Support for product forms, quick-add forms, line-item properties and selling plans

## Files

- `custom-cart-drawer.liquid` — drawer markup and Shopify formatting data
- `custom-cart-drawer.css` — responsive component styles
- `custom-cart-drawer.js` — drawer state, rendering and cart mutations
- `custom-cart.js` — AJAX interception for Shopify add-to-cart forms

## Installation

1. Add `custom-cart-drawer.liquid` to the theme's `snippets` directory.
2. Add both JavaScript files and the CSS file to `assets`.
3. Render the snippet once in `theme.liquid`, before the closing `</body>` tag:

```liquid
{% render 'custom-cart-drawer' %}
```

4. Load the assets in the theme:

```liquid
{{ 'custom-cart-drawer.css' | asset_url | stylesheet_tag }}
<script src="{{ 'custom-cart-drawer.js' | asset_url }}" defer></script>
<script src="{{ 'custom-cart.js' | asset_url }}" defer></script>
```

5. Test product pages, quick-add cards, variants, selling plans and line-item properties in a development theme before publishing.

## Compatibility

The sample targets Shopify Online Store 2.0 themes and follows Dawn's common product-form and cart-bubble conventions. Themes with custom product forms, bundled products, subscription apps or their own cart drawer may require selector or event-integration changes.

This repository is a focused component sample, not a drop-in replacement for every theme's existing cart system.

## Preview

<img width="1899" height="871" alt="Custom Shopify cart drawer with a product" src="https://github.com/user-attachments/assets/3553022f-f0a9-4c8d-8f1b-28a13a7850dc" />

<img width="1902" height="889" alt="Custom Shopify cart drawer quantity controls" src="https://github.com/user-attachments/assets/0473a019-4f15-45aa-911c-d41feb881455" />
