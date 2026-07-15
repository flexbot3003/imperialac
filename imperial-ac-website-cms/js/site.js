const socialLinks = {
  facebook: "https://www.facebook.com/share/1ENjmW2yB5/?mibextid=wwXIfr",
  instagram: "https://www.instagram.com/imperial_athletic?igsh=MThrOGF5aWUyYWxtOA%3D%3D&utm_source=qr",
  whatsapp: "https://whatsapp.com/channel/0029Vb6Wrrc3GJOtaXBtM91L",
  email: "06imperialfc@gmail.com"
};

const defaultSettings = {
  show_news: false,
  show_gallery: false,
  show_standings: true
};

const fallbackStandings = [
  { id: "imperial", position: 1, team_name: "Imperial AC", played: 0, won: 0, drawn: 0, lost: 0, goals_for: 0, goals_against: 0, goal_difference: 0, points: 0 }
];

let cmsClient = null;
let siteSettings = { ...defaultSettings };

function cmsConfigured() {
  const config = window.IMPERIAL_CMS || {};
  return Boolean(config.supabaseUrl && config.supabaseAnonKey && window.supabase?.createClient);
}

function getCmsClient() {
  if (!cmsConfigured()) return null;
  if (!cmsClient) {
    cmsClient = window.supabase.createClient(
      window.IMPERIAL_CMS.supabaseUrl,
      window.IMPERIAL_CMS.supabaseAnonKey
    );
  }
  return cmsClient;
}

async function loadSiteSettings() {
  const client = getCmsClient();
  if (!client) return siteSettings;
  const { data, error } = await client.from("site_settings").select("key,value");
  if (error) {
    console.warn("Could not load site settings:", error.message);
    return siteSettings;
  }
  data.forEach(row => {
    if (row.key in siteSettings) siteSettings[row.key] = row.value === true || row.value === "true";
  });
  return siteSettings;
}

function navItems() {
  const items = [
    ["Home", "index.html", "home"],
    ["Club", "club.html", "club"],
    ["Fixtures", "fixtures.html", "fixtures"]
  ];
  if (siteSettings.show_standings) items.push(["Standings", "standings.html", "standings"]);
  if (siteSettings.show_news) items.push(["News", "news.html", "news"]);
  if (siteSettings.show_gallery) items.push(["Gallery", "gallery.html", "gallery"]);
  items.push(["Partners", "partners.html", "partners"]);
  return items;
}

function renderHeader() {
  const mount = document.querySelector("[data-site-header]");
  if (!mount) return;
  const current = document.body.dataset.page || "home";
  const links = navItems().map(([label, href, key]) =>
    `<a class="nav-link ${current === key ? "active" : ""}" href="${href}">${label}</a>`
  ).join("");

  mount.innerHTML = `
    <a class="skip-link" href="#main">Skip to content</a>
    <header class="site-header">
      <div class="container nav-wrap">
        <a class="brand" href="index.html" aria-label="Imperial AC home">
          <img src="assets/logo-mark.svg" alt="">
          <span class="brand-name">IMPERIAL AC<small>DYNASTY REFINED</small></span>
        </a>
        <nav class="desktop-nav" aria-label="Primary navigation">${links}</nav>
        <div class="header-actions">
          <a class="button small" href="join.html">Contact the club</a>
          <button class="menu-button" aria-label="Open navigation" aria-expanded="false">☰</button>
        </div>
      </div>
    </header>
    <div class="mobile-menu" aria-label="Mobile navigation">
      ${navItems().map(([label, href]) => `<a href="${href}">${label}</a>`).join("")}
      <a href="join.html">Contact the club</a>
    </div>`;

  const button = mount.querySelector(".menu-button");
  const menu = mount.querySelector(".mobile-menu");
  button?.addEventListener("click", () => {
    const open = menu.classList.toggle("open");
    document.body.classList.toggle("menu-open", open);
    button.setAttribute("aria-expanded", String(open));
    button.textContent = open ? "✕" : "☰";
  });
}

function renderFooter() {
  const mount = document.querySelector("[data-site-footer]");
  if (!mount) return;
  const dynamicLinks = [];
  if (siteSettings.show_standings) dynamicLinks.push('<a href="standings.html">Standings</a>');
  if (siteSettings.show_news) dynamicLinks.push('<a href="news.html">News</a>');
  if (siteSettings.show_gallery) dynamicLinks.push('<a href="gallery.html">Gallery</a>');
  mount.innerHTML = `
    <footer class="site-footer">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-brand">
            <a class="brand" href="index.html">
              <img src="assets/logo-mark.svg" alt="">
              <span class="brand-name">IMPERIAL AC<small>DYNASTY REFINED</small></span>
            </a>
            <p>Imperial Athletic Club's senior MPL side, based in Pretoria.</p>
          </div>
          <div class="footer-col">
            <h4>Club</h4>
            <a href="club.html">Our story</a>
            <a href="fixtures.html">Fixtures</a>
            ${dynamicLinks.join("")}
          </div>
          <div class="footer-col">
            <h4>Social</h4>
            <a href="${socialLinks.facebook}" target="_blank" rel="noopener">Facebook</a>
            <a href="${socialLinks.instagram}" target="_blank" rel="noopener">Instagram</a>
            <a href="${socialLinks.whatsapp}" target="_blank" rel="noopener">WhatsApp Channel</a>
          </div>
          <div class="footer-col">
            <h4>Contact</h4>
            <a href="mailto:${socialLinks.email}">${socialLinks.email}</a>
            <a href="join.html">Contact the club</a>
            <a href="partners.html">Partnership enquiries</a>
          </div>
        </div>
        <div class="footer-bottom">
          <div>© <span data-year></span> Imperial Athletic Club. All rights reserved.</div>
          <span>Pretoria, South Africa</span>
        </div>
      </div>
    </footer>`;
  document.querySelectorAll("[data-year]").forEach(el => el.textContent = new Date().getFullYear());
}

function emptyState(title, copy) {
  return `<div class="empty-state reveal"><div class="icon-box">IAC</div><h3>${title}</h3><p>${copy}</p></div>`;
}

async function renderStandings() {
  const mount = document.getElementById("standingsBody");
  if (!mount) return;
  let rows = fallbackStandings;
  const client = getCmsClient();
  if (client) {
    const { data, error } = await client.from("standings").select("*").order("position", { ascending: true });
    if (!error && data?.length) rows = data;
  }
  mount.innerHTML = rows.map(row => `
    <tr class="${row.team_name.toLowerCase().includes("imperial") ? "highlight" : ""}">
      <td>${row.position}</td><td>${escapeHtml(row.team_name)}</td><td>${row.played}</td><td>${row.won}</td>
      <td>${row.drawn}</td><td>${row.lost}</td><td>${row.goals_for}</td><td>${row.goals_against}</td>
      <td>${row.goal_difference}</td><td>${row.points}</td>
    </tr>`).join("");
}

async function renderNews(targetId, limit = null) {
  const mount = document.getElementById(targetId);
  if (!mount) return;
  const section = mount.closest("section");
  if (!siteSettings.show_news) {
    if (targetId !== "allNews") {
      section?.setAttribute("hidden", "");
      return;
    }
    mount.innerHTML = emptyState("News is not public yet", "The club will open this section when its publishing process is ready.");
    return;
  }
  section?.removeAttribute("hidden");
  const client = getCmsClient();
  if (!client) {
    mount.innerHTML = emptyState("Club news coming soon", "Official stories will appear here once the club is ready to publish them.");
    return;
  }
  let query = client.from("news_posts").select("*").eq("published", true).order("published_at", { ascending: false });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error || !data?.length) {
    mount.innerHTML = emptyState("Club news coming soon", "Official stories will appear here once the club is ready to publish them.");
    return;
  }
  mount.innerHTML = data.map(item => `
    <article class="card news-card reveal">
      ${item.image_url ? `<img src="${escapeAttribute(item.image_url)}" alt="">` : '<div class="news-placeholder">IMPERIAL AC</div>'}
      <div class="card-body">
        <div class="news-meta"><span>${escapeHtml(item.category || "Club News")}</span><span>${formatDate(item.published_at)}</span></div>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.excerpt || "")}</p>
        <a class="text-link" href="article.html?id=${encodeURIComponent(item.id)}">Read story →</a>
      </div>
    </article>`).join("");
  observeReveal();
}

async function renderGallery() {
  const mount = document.getElementById("galleryGrid");
  if (!mount) return;
  if (!siteSettings.show_gallery) {
    mount.innerHTML = emptyState("Gallery is not public yet", "The club will open this section when approved images are ready.");
    return;
  }
  const client = getCmsClient();
  if (!client) {
    mount.innerHTML = emptyState("Gallery coming soon", "Official club photographs will be published here.");
    return;
  }
  const { data, error } = await client.from("gallery_items").select("*").eq("published", true).order("display_order", { ascending: true });
  if (error || !data?.length) {
    mount.innerHTML = emptyState("Gallery coming soon", "Official club photographs will be published here.");
    return;
  }
  mount.innerHTML = data.map(item => `
    <article class="gallery-photo reveal">
      <img src="${escapeAttribute(item.image_url)}" alt="${escapeAttribute(item.title || "Imperial AC gallery image")}">
      <div class="gallery-caption"><strong>${escapeHtml(item.title || "Imperial AC")}</strong><span>${escapeHtml(item.category || "Club")}</span></div>
    </article>`).join("");
  observeReveal();
}


async function renderArticle() {
  const mount = document.getElementById("newsArticle");
  if (!mount) return;
  if (!siteSettings.show_news) {
    mount.innerHTML = emptyState("News is not public yet", "The club will open this section when its publishing process is ready.");
    return;
  }
  const id = new URLSearchParams(window.location.search).get("id");
  const client = getCmsClient();
  if (!id || !client) {
    mount.innerHTML = emptyState("Story unavailable", "This story could not be loaded.");
    return;
  }
  const { data, error } = await client.from("news_posts").select("*").eq("id", id).eq("published", true).maybeSingle();
  if (error || !data) {
    mount.innerHTML = emptyState("Story unavailable", "This story may have been removed or returned to draft status.");
    return;
  }
  mount.innerHTML = `<article class="article-layout reveal">
    <div class="article-header"><p class="eyebrow">${escapeHtml(data.category || "Club News")}</p><h1 class="heading">${escapeHtml(data.title)}</h1><p class="subheading">${escapeHtml(data.excerpt || "")}</p><div class="news-meta" style="margin-top:22px"><span>Imperial AC</span><span>${formatDate(data.published_at)}</span></div></div>
    ${data.image_url ? `<img class="article-image" src="${escapeAttribute(data.image_url)}" alt="">` : ""}
    <div class="article-body">${paragraphs(data.body || data.excerpt || "")}</div>
  </article>`;
  observeReveal();
}

function paragraphs(value = "") {
  return String(value).split(/\n{2,}/).filter(Boolean).map(paragraph => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`).join("");
}

function setupForms() {
  document.querySelectorAll("form[data-demo-form]").forEach(form => {
    form.addEventListener("submit", event => {
      event.preventDefault();
      if (!form.checkValidity()) return form.reportValidity();
      const subject = encodeURIComponent("Imperial AC website enquiry");
      const name = form.querySelector('[name="name"]')?.value || "Website visitor";
      const type = form.querySelector('[name="enquiryType"]')?.value || "General enquiry";
      const message = form.querySelector('[name="message"]')?.value || "";
      const body = encodeURIComponent(`Name: ${name}\nEnquiry: ${type}\n\n${message}`);
      window.location.href = `mailto:${socialLinks.email}?subject=${subject}&body=${body}`;
    });
  });
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value));
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}
function escapeAttribute(value = "") { return escapeHtml(value); }

let revealObserver;
function observeReveal() {
  const elements = document.querySelectorAll(".reveal:not(.visible)");
  if (!("IntersectionObserver" in window)) return elements.forEach(el => el.classList.add("visible"));
  revealObserver ||= new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: .12 });
  elements.forEach(el => revealObserver.observe(el));
}

async function initialiseSite() {
  renderHeader();
  renderFooter();
  observeReveal();
  await loadSiteSettings();
  renderHeader();
  renderFooter();
  await Promise.all([
    renderStandings(),
    renderNews("homeNews", 3),
    renderNews("allNews"),
    renderGallery(),
    renderArticle()
  ]);
  setupForms();
  observeReveal();
}

document.addEventListener("DOMContentLoaded", initialiseSite);
