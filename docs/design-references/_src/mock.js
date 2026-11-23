/* Shared chrome for Savora design reference mockups.
   These pages are documentation only and are never bundled into the app. */

const A = '/public/assets';

const ICONS = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  bag: '<path d="M6 7h12l1 13H5L6 7Z"/><path d="M9 7a3 3 0 0 1 6 0"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2-5.5-3-5.5 3 1-6.2L3 9.6l6.2-.9Z"/>',
  arrowRight: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
  arrowLeft: '<path d="M19 12H5"/><path d="m11 18-6-6 6-6"/>',
  check: '<path d="m20 6-11 11-5-5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  leaf: '<path d="M4 20c0-8 6-14 16-14 0 10-6 15-16 14Z"/><path d="M9 15c2-3 4-5 7-6"/>',
  sparkle: '<path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9Z"/>',
  trash: '<path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6Z"/>',
  card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  phone: '<path d="M6 3h3l2 5-2.5 1.5a12 12 0 0 0 6 6L16 13l5 2v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4 5.2A2 2 0 0 1 6 3Z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>',
  youtube: '<rect x="3" y="6" width="18" height="12" rx="4"/><path d="m11 10 4 2-4 2Z"/>',
  twitter: '<path d="M4 4l16 16M20 4 4 20"/>',
  bell: '<path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  dashboard: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z"/><path d="M9 8h6M9 12h6"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 0-2 2Z"/><path d="M8 7h8"/>',
  tag: '<path d="m3 12 9-9h8v8l-9 9Z"/><circle cx="16" cy="7" r="1.4"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M4.2 7.5l2.6 1.5M17.2 15l2.6 1.5M4.2 16.5l2.6-1.5M17.2 9l2.6-1.5"/>',
  logout: '<path d="M9 5H5v14h4"/><path d="M14 8l4 4-4 4"/><path d="M18 12H9"/>',
  grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
  filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  sort: '<path d="M7 4v16M7 20l-3-3M7 20l3-3"/><path d="M17 20V4M17 4l3 3M17 4l-3 3"/>',
  heart: '<path d="M12 20s-7-4.5-7-9.5A4 4 0 0 1 12 7a4 4 0 0 1 7 3.5C19 15.5 12 20 12 20Z"/>',
  map: '<path d="m9 4 6 2 6-2v14l-6 2-6-2-6 2V6Z"/><path d="M9 4v14M15 6v14"/>',
  truck: '<path d="M3 7h11v9H3Z"/><path d="M14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  edit: '<path d="M4 20h4l10-10-4-4L4 16Z"/><path d="m14 6 4 4"/>',
};

function icon(name, cls = '') {
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}

function logoMark() {
  return `<span class="logo-mark"><svg viewBox="0 0 48 48" aria-hidden="true">
    <circle cx="24" cy="24" r="23" fill="#354638" />
    <path d="M13 30.5c0-7 4.8-13 11-15.8 6.2 2.8 11 8.8 11 15.8" stroke="#D6AA70" stroke-width="1.8" stroke-linecap="round" fill="none" />
    <circle cx="24" cy="28.5" r="3.6" fill="#C65D3B" />
    <path d="M11 33.5h26" stroke="#FBF8F1" stroke-width="1.6" stroke-linecap="round" />
  </svg></span>`;
}

const PRIMARY = [
  ['Restaurants', 'restaurants.html'],
  ['How it works', 'index.html#how'],
  ['Offers', 'index.html#offers'],
  ['For restaurants', 'dashboard-overview.html'],
];

function header(active = '', { cartCount = 3 } = {}) {
  return `
  <div class="announce">
    <div class="shell announce-inner">
      <span class="dot" aria-hidden="true"></span>
      <span>Free delivery on your first order over $30 —</span>
      <a href="restaurants.html">Find a kitchen near you</a>
    </div>
  </div>
  <header class="site-nav">
    <div class="shell nav-inner">
      <a class="logo" href="index.html" aria-label="Savora home">
        ${logoMark()}
        <span>savora<span class="dot">.</span></span>
      </a>
      <nav class="nav-links" aria-label="Primary">
        ${PRIMARY.map(([label, href]) =>
          `<a href="${href}" class="${active === label ? 'active' : ''}">${label}</a>`,
        ).join('')}
      </nav>
      <div class="nav-actions">
        <a class="icon-btn" href="restaurants.html" aria-label="Search">${icon('search')}</a>
        <span class="pill-btn">${icon('pin')} Brooklyn, NY</span>
        <a class="pill-btn" href="order-history.html">
          <img class="avatar" src="${A}/people/avatar-maya-320.webp" alt="" />
          Maya
        </a>
        <a class="icon-btn cart-btn" href="cart.html" aria-label="Cart">
          ${icon('bag')}
          ${cartCount ? `<span class="cart-count">${cartCount}</span>` : ''}
        </a>
      </div>
    </div>
  </header>`;
}

function footer() {
  return `
  <footer class="site-footer">
    <div class="footer-letter">
      <div class="shell inner">
        <div>
          <span class="eyebrow" style="color:var(--gold-200)">The Savora letter</span>
          <h2 class="mt-10">New kitchens, seasonal menus, <span class="serif-italic" style="color:var(--gold-200)">good ideas.</span></h2>
          <p>A short note every other Thursday. No noise, no offers you did not ask for.</p>
        </div>
        <div class="subscribe">
          <input type="email" placeholder="you@example.com" aria-label="Email address" />
          <button class="btn btn-primary" type="button">Subscribe ${icon('arrowRight')}</button>
        </div>
      </div>
    </div>

    <div class="shell footer-main">
      <div class="footer-brand">
        <a class="logo" href="index.html" style="color:var(--cream)">
          ${logoMark()}
          <span>savora<span class="dot" style="color:var(--gold-300)">.</span></span>
        </a>
        <p>Discover. Order. Enjoy. A marketplace for the independent kitchens that make a neighbourhood worth eating in.</p>
        <div class="footer-contact">
          <span>${icon('mail')} hello@savora.example</span>
          <span>${icon('phone')} +1 (718) 555-0100</span>
        </div>
      </div>
      <div class="footer-col">
        <h3>Order</h3>
        <a href="restaurants.html">Restaurants</a>
        <a href="order-history.html">Order history</a>
        <a href="cart.html">Your cart</a>
        <a href="checkout.html">Checkout</a>
      </div>
      <div class="footer-col">
        <h3>Partners</h3>
        <a href="dashboard-overview.html">Restaurant dashboard</a>
        <a href="dashboard-menu.html">Menu manager</a>
        <a href="dashboard-orders.html">Order board</a>
        <a href="dashboard-settings.html">Partner settings</a>
      </div>
      <div class="footer-col">
        <h3>Company</h3>
        <a href="#">Our story</a>
        <a href="#">Careers</a>
        <a href="#">Press</a>
        <a href="#">Contact</a>
      </div>
      <div class="footer-col">
        <h3>Support</h3>
        <a href="#">Help centre</a>
        <a href="#">Delivery areas</a>
        <a href="#">Allergens</a>
        <a href="#">Privacy</a>
      </div>
    </div>

    <div class="shell footer-bottom">
      <span>© 2026 Savora. A demo marketplace built as a frontend portfolio project.</span>
      <div class="links">
        <a href="#">Terms</a>
        <a href="#">Privacy</a>
        <a href="#">Cookies</a>
      </div>
      <div class="social">
        <span class="social-dot">${icon('instagram')}</span>
        <span class="social-dot">${icon('youtube')}</span>
        <span class="social-dot">${icon('twitter')}</span>
      </div>
    </div>
  </footer>`;
}

const DASH_NAV = [
  ['Overview', 'dashboard-overview.html', 'dashboard'],
  ['Orders', 'dashboard-orders.html', 'receipt', '6'],
  ['Menu', 'dashboard-menu.html', 'book'],
  ['Categories', 'dashboard-categories.html', 'tag'],
  ['Settings', 'dashboard-settings.html', 'settings'],
];

function dashboardSidebar(active = 'Overview') {
  return `
  <aside class="dash-sidebar">
    <div class="dash-brand">
      ${logoMark()}
      <div>
        <div class="name">savora</div>
        <div class="sub">Partner studio</div>
      </div>
    </div>

    <div class="dash-kitchen">
      <img src="${A}/restaurants/restaurant-saffron-oak-480.webp" alt="" />
      <div>
        <div class="name">Saffron &amp; Oak</div>
        <div class="meta">Open · 11:00 – 22:30</div>
      </div>
    </div>

    <nav class="dash-nav" aria-label="Dashboard">
      <span class="label">Workspace</span>
      ${DASH_NAV.map(
        ([label, href, ic, count]) => `
        <a href="${href}" class="${active === label ? 'active' : ''}">
          ${icon(ic)} <span>${label}</span>
          ${count ? `<span class="count">${count}</span>` : ''}
        </a>`,
      ).join('')}
    </nav>

    <div class="dash-side-bottom">
      <a href="index.html">${icon('arrowLeft')} Back to marketplace</a>
      <a href="#">${icon('logout')} Sign out</a>
      <div class="dash-user">
        <img src="${A}/people/avatar-maya-320.webp" alt="" />
        <div>
          <div class="name">Maya Bennett</div>
          <div class="role">Owner · Saffron &amp; Oak</div>
        </div>
      </div>
    </div>
  </aside>`;
}

function dashboardTop(crumb) {
  return `
  <div class="dash-top">
    <div class="dash-breadcrumb">Partner studio / <strong>${crumb}</strong></div>
    <div class="grow"></div>
    <div class="dash-search">${icon('search')} Search orders, dishes…</div>
    <span class="icon-btn">${icon('bell')}</span>
    <span class="pill-btn"><img class="avatar" src="${A}/people/avatar-maya-320.webp" alt="" /> Maya</span>
  </div>`;
}

function starRow(count = 5) {
  return `<span class="stars">${Array.from({ length: count }).map(() => icon('star')).join('')}</span>`;
}

function money(value) {
  return `$${value.toFixed(2)}`;
}

/* Expose helpers to each mockup page. */
window.SavoraMock = {
  A,
  icon,
  header,
  footer,
  dashboardSidebar,
  dashboardTop,
  starRow,
  money,
};

/* Auto-mount the shared chrome when a page marks the mount points. */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-icon]').forEach((el) => {
    el.innerHTML = icon(el.dataset.icon, el.dataset.iconClass || '');
  });

  const headerHost = document.querySelector('[data-header]');
  if (headerHost) {
    headerHost.innerHTML = header(headerHost.dataset.header, {
      cartCount: Number(headerHost.dataset.cart ?? 3),
    });
  }

  const footerHost = document.querySelector('[data-footer]');
  if (footerHost) footerHost.innerHTML = footer();

  const sidebarHost = document.querySelector('[data-sidebar]');
  if (sidebarHost) sidebarHost.innerHTML = dashboardSidebar(sidebarHost.dataset.sidebar);

  const topHost = document.querySelector('[data-dash-top]');
  if (topHost) topHost.innerHTML = dashboardTop(topHost.dataset.dashTop);
});
