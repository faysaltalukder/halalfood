# Mobile performance pass (2026-10-16)

## What changed
- **Tracking (GTM, Meta Pixel)** no longer downloads during first paint. It loads on the visitor's first touch/scroll/key press, or 5 s after page load. Events fired before that are queued and sent afterwards. Order/cart/thank-you/track-order pages load tracking immediately. Setting: `HALAL_TRACKING_DELAY_MS` near the bottom of `js/main.js`.
- **Chat widget (Botpress)** loads on first interaction or 8 s after load (`CHAT_DELAY_MS` in `index.html`).
- **First-order popup** now opens 7 s after load (`POPUP_DELAY_MS` in `index.html`), downloads its image only then, and appears only once the image has loaded.
- Local scripts use `defer`; the hero (LCP) image is preloaded.
- Home page: the 50 extra products behind "Load More" now live in a `<template>` (DOM 1,704 -> ~1,000 elements). Behaviour is unchanged.
- Forced reflow removed from the hero carousel start-up; product-row carousels build when the browser is idle.
- Below-the-fold sections use `content-visibility:auto`.

## Accessibility
- Button/link colours that failed contrast now use `--orange-strong` (#975719). The brand orange `#c97b3d` is unchanged elsewhere and in dark mode.
- Slider dots have 24-44 px touch areas (look unchanged).
- `<main>` landmark added; product-card titles are `<h3>` (was `<h4>`); duplicate alt text on category tiles emptied; "Order Now" links carry the product name; closed drawers no longer use `aria-hidden` (they use `visibility:hidden`).

## Not changed
- Readable JS/CSS kept (no minify, saves only ~2 KiB).
- GitHub Pages sets a 10-minute cache; a CDN such as Cloudflare would fix that.
