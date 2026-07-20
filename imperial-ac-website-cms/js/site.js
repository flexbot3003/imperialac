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

const fallbackStandings = [{
  id: "imperial",
  position: 1,
  team_name: "Imperial AC",
  played: 0,
  won: 0,
  drawn: 0,
  lost: 0,
  goals_for: 0,
  goals_against: 0,
  goal_difference: 0,
  points: 0
}];

let cmsClient = null;
let siteSettings = { ...defaultSettings };
let publicNewsGroups = [];
let publicNewsGroupsLoaded = false;

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

  (data || []).forEach(row => {
    if (row.key in siteSettings) {
      siteSettings[row.key] = row.value === true || row.value === "true";
    }
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
    `<a href="${href}" class="${key === current ? "active" : ""}">${label}</a>`
  ).join("");

  mount.innerHTML = `
    <a class="skip-link" href="#main">Skip to content</a>
    <header class="site-header">
      <div class="container nav-shell">
        <a class="brand" href="index.html" aria-label="Imperial AC home">
          <img src="assets/logo-mark.svg" alt="Imperial AC crest">
          <span><strong>Imperial AC</strong><small>Dynasty Refined</small></span>
        </a>
        <nav class="desktop-nav" aria-label="Main navigation">${links}</nav>
        <a class="button button--blue header-cta" href="join.html">Contact the club</a>
        <button class="menu-button" type="button" aria-expanded="false" aria-controls="mobileMenu" aria-label="Open menu">
          <span></span><span></span>
        </button>
      </div>
      <nav class="mobile-menu" id="mobileMenu" aria-label="Mobile navigation">
        <div class="container">${links}<a href="join.html">Contact the club</a></div>
      </nav>
    </header>`;

  const button = mount.querySelector(".menu-button");
  const menu = mount.querySelector(".mobile-menu");
  button?.addEventListener("click", () => {
    const open = menu.classList.toggle("open");
    document.body.classList.toggle("menu-open", open);
    button.setAttribute("aria-expanded", String(open));
  });
}

function renderFooter() {
  const mount = document.querySelector("[data-site-footer]");
  if (!mount) return;
  const dynamic = [];
  if (siteSettings.show_standings) dynamic.push('<a href="standings.html">Standings</a>');
  if (siteSettings.show_news) dynamic.push('<a href="news.html">News</a>');
  if (siteSettings.show_gallery) dynamic.push('<a href="gallery.html">Gallery</a>');

  mount.innerHTML = `
    <footer class="site-footer">
      <div class="container footer-grid footer-grid--legal">
        <div class="footer-brand">
          <a class="brand brand--footer" href="index.html">
            <img src="assets/logo-mark.svg" alt="Imperial AC crest">
            <span><strong>Imperial AC</strong><small>Dynasty Refined</small></span>
          </a>
          <p>Imperial Athletic Club's senior MPL side, based in Pretoria.</p>
        </div>
        <div><h2>Club</h2><a href="club.html">Our story</a><a href="fixtures.html">Fixtures</a>${dynamic.join("")}</div>
        <div><h2>Social</h2><a href="${socialLinks.facebook}" target="_blank" rel="noopener">Facebook</a><a href="${socialLinks.instagram}" target="_blank" rel="noopener">Instagram</a><a href="${socialLinks.whatsapp}" target="_blank" rel="noopener">WhatsApp Channel</a></div>
        <div><h2>Contact</h2><a href="mailto:${socialLinks.email}">${socialLinks.email}</a><a href="join.html">Contact the club</a><a href="partners.html">Partnership enquiries</a><a href="data-rights.html">Data rights request</a></div>
        <div><h2>Legal</h2><a href="privacy.html">Privacy Policy</a><a href="terms.html">Terms of Use</a><a href="cookies.html">Cookie Policy</a><a href="disclaimer.html">Disclaimer</a><a href="media-notice.html">Media & Photography</a><a href="accessibility.html">Accessibility</a></div>
      </div>
      <div class="container footer-bottom">
        <span>© <span data-year></span> Imperial Athletic Club. All rights reserved.</span>
        <span class="footer-bottom-links"><a href="privacy.html">Privacy</a><a href="terms.html">Terms</a><a href="cookies.html">Cookies</a><a href="join.html">Contact</a></span>
      </div>
    </footer>`;
  document.querySelectorAll("[data-year]").forEach(el => el.textContent = new Date().getFullYear());
}

function renderCookieNotice(force = false) {
  const storageKey = "imperial_cookie_notice";
  const existing = document.querySelector(".cookie-notice");
  if (existing) existing.remove();

  let dismissed = false;
  try { dismissed = localStorage.getItem(storageKey) === "dismissed"; } catch (_error) {}
  if (dismissed && !force) return;

  const notice = document.createElement("aside");
  notice.className = "cookie-notice";
  notice.setAttribute("role", "dialog");
  notice.setAttribute("aria-label", "Cookie and storage notice");
  notice.innerHTML = `
    <div>
      <strong>Website storage</strong>
      <p>This site uses essential browser storage for preferences and secure administrator access. Advertising cookies are not enabled in this build.</p>
    </div>
    <div class="cookie-notice-actions">
      <a class="button button--line" href="cookies.html">Cookie policy</a>
      <button class="button button--blue" type="button" data-dismiss-cookie-notice>Continue</button>
    </div>`;
  document.body.appendChild(notice);

  notice.querySelector("[data-dismiss-cookie-notice]")?.addEventListener("click", () => {
    try { localStorage.setItem(storageKey, "dismissed"); } catch (_error) {}
    notice.remove();
  });
}

function setupCookieControls() {
  document.querySelectorAll("[data-reset-cookie-notice]").forEach(button => {
    button.addEventListener("click", () => {
      try { localStorage.removeItem("imperial_cookie_notice"); } catch (_error) {}
      renderCookieNotice(true);
      document.querySelector(".cookie-notice")?.focus();
    });
  });
}

function emptyState(title, copy) {
  return `<div class="empty-state"><span class="empty-mark">IAC</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(copy)}</p></div>`;
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
    <tr class="${String(row.team_name).toLowerCase().includes("imperial") ? "is-imperial" : ""}">
      <td>${row.position}</td><td class="club-cell"><span class="table-crest">${initials(row.team_name)}</span>${escapeHtml(row.team_name)}</td>
      <td>${row.played}</td><td>${row.won}</td><td>${row.drawn}</td><td>${row.lost}</td>
      <td>${row.goals_for}</td><td>${row.goals_against}</td><td>${row.goal_difference}</td><td><strong>${row.points}</strong></td>
    </tr>`).join("");
}

function slugifyNewsGroup(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function loadPublicNewsGroups(force = false) {
  if (publicNewsGroupsLoaded && !force) {
    return publicNewsGroups;
  }

  const client = getCmsClient();

  if (!client) {
    return [];
  }

  const { data, error } = await client
    .from("news_groups")
    .select("*")
    .eq("published", true)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("Could not load news groups:", error);
    publicNewsGroupsLoaded = false;
    return [];
  }

  publicNewsGroups = data || [];
  publicNewsGroupsLoaded = true;

  return publicNewsGroups;
}

function groupForNewsPost(item, groups = publicNewsGroups) {
  if (item.group_id) {
    const groupById = groups.find(
      group => group.id === item.group_id
    );

    if (groupById) {
      return groupById;
    }
  }

  const category = item.category || "Club News";

  const groupByName = groups.find(
    group =>
      String(group.name).toLowerCase() ===
      String(category).toLowerCase()
  );

  if (groupByName) {
    return groupByName;
  }

  return {
    id: item.group_id || null,
    name: category,
    slug: slugifyNewsGroup(category) || "club-news",
    description: "",
    display_order: 999,
    published: true
  };
}

function newsCardMarkup(item, index = 0, targetId = "allNews") {
  const group = groupForNewsPost(item);

  return `
    <article
      class="news-card ${
        index === 0 && targetId === "homeNews"
          ? "news-card--feature"
          : ""
      } reveal"
      data-news-group="${escapeAttribute(group.slug)}"
    >
      <a
        class="news-media ${item.image_url ? "has-image" : ""}"
        href="article.html?id=${encodeURIComponent(item.id)}"
        ${
          item.image_url
            ? `style="background-image:url('${escapeAttribute(
                item.image_url
              )}')"`
            : ""
        }
      >
        ${
          item.image_url
            ? ""
            : '<span class="media-placeholder-label">News image slot</span>'
        }
      </a>

      <div class="news-copy">
        <p class="eyebrow">
          <a
            class="news-group-label"
            href="news.html?group=${encodeURIComponent(group.slug)}"
          >
            ${escapeHtml(group.name)}
          </a>

          <span>${formatDate(item.published_at)}</span>
        </p>

        <h3>
          <a href="article.html?id=${encodeURIComponent(item.id)}">
            ${escapeHtml(item.title)}
          </a>
        </h3>

        <p>${escapeHtml(item.excerpt || "")}</p>

        <a
          class="text-link"
          href="article.html?id=${encodeURIComponent(item.id)}"
        >
          Read story <span>↗</span>
        </a>
      </div>
    </article>
  `;
}

function renderNewsGroupNavigation(posts, groups, selectedGroup) {
  const shell = document.getElementById("newsGroupShell");
  const nav = document.getElementById("newsGroupFilters");
  const intro = document.getElementById("newsGroupIntro");

  if (!shell || !nav || !intro) {
    return;
  }

  const groupMap = new Map();

  groups.forEach(group => {
    groupMap.set(group.slug, {
      ...group,
      count: 0
    });
  });

  posts.forEach(post => {
    const group = groupForNewsPost(post, groups);

    if (!group?.slug) {
      return;
    }

    if (!groupMap.has(group.slug)) {
      groupMap.set(group.slug, {
        ...group,
        count: 0
      });
    }

    groupMap.get(group.slug).count += 1;
  });

  const availableGroups = [...groupMap.values()].sort(
    (a, b) =>
      Number(a.display_order || 999) -
        Number(b.display_order || 999) ||
      a.name.localeCompare(b.name)
  );

  shell.hidden = false;

  nav.innerHTML = `
    <a
      class="news-group-chip ${selectedGroup ? "" : "active"}"
      href="news.html"
    >
      <span>All news</span>
      <strong>${posts.length}</strong>
    </a>

    ${availableGroups
      .map(
        group => `
          <a
            class="news-group-chip ${
              selectedGroup?.slug === group.slug ? "active" : ""
            }"
            href="news.html?group=${encodeURIComponent(group.slug)}"
          >
            <span>${escapeHtml(group.name)}</span>
            <strong>${group.count}</strong>
          </a>
        `
      )
      .join("")}
  `;

  if (selectedGroup) {
    intro.hidden = false;

    intro.innerHTML = `
      <p class="eyebrow">News group</p>
      <h2>${escapeHtml(selectedGroup.name)}</h2>
      <p>
        ${escapeHtml(
          selectedGroup.description ||
            `All ${selectedGroup.name.toLowerCase()} stories from Imperial AC.`
        )}
      </p>
    `;
  } else {
    intro.hidden = true;
    intro.innerHTML = "";
  }
}

async function renderNews(targetId, limit = null) {
  const mount = document.getElementById(targetId);

  if (!mount) {
    return;
  }

  const section = mount.closest("section");

  if (!siteSettings.show_news) {
    if (targetId !== "allNews") {
      section?.setAttribute("hidden", "");
      return;
    }

    mount.innerHTML = emptyState(
      "News is not public yet",
      "The club will open this section when its publishing process is ready."
    );

    return;
  }

  section?.removeAttribute("hidden");

  const client = getCmsClient();

  if (!client) {
    mount.innerHTML = emptyState(
      "News could not be loaded",
      "The website connection is not configured."
    );

    return;
  }

  const [groups, newsResponse] = await Promise.all([
    loadPublicNewsGroups(true),

    client
      .from("news_posts")
      .select("*")
      .eq("published", true)
      .order("published_at", {
        ascending: false
      })
  ]);

  if (newsResponse.error) {
    console.error(
      "Could not load published news:",
      newsResponse.error
    );

    mount.innerHTML = emptyState(
      "News could not be loaded",
      "Please refresh the page or try again shortly."
    );

    return;
  }

  const groupsLoadedSuccessfully = publicNewsGroupsLoaded;

  let posts = (newsResponse.data || []).filter(post => {
    if (!post.group_id) {
      return true;
    }

    if (!groupsLoadedSuccessfully) {
      return true;
    }

    return groups.some(group => group.id === post.group_id);
  });

  if (targetId === "allNews") {
    const requestedSlug =
      new URLSearchParams(window.location.search).get("group");

    const possibleGroups = [
      ...groups,
      ...posts.map(post => groupForNewsPost(post, groups))
    ];

    const selectedGroup = requestedSlug
      ? possibleGroups.find(
          group => group.slug === requestedSlug
        )
      : null;

    renderNewsGroupNavigation(
      posts,
      groups,
      selectedGroup
    );

    if (requestedSlug && !selectedGroup) {
      mount.innerHTML = emptyState(
        "News group not found",
        "This group may have been hidden, renamed or removed."
      );

      return;
    }

    if (selectedGroup) {
      posts = posts.filter(
        post =>
          groupForNewsPost(post, groups).slug ===
          selectedGroup.slug
      );

      document.title =
        `${selectedGroup.name} | Imperial AC News`;
    }
  }

  if (limit) {
    posts = posts.slice(0, limit);
  }

  if (!posts.length) {
    mount.innerHTML = emptyState(
      targetId === "allNews"
        ? "No published stories yet"
        : "Club news coming soon",
      targetId === "allNews"
        ? "Published Imperial AC stories will appear here."
        : "The latest club stories will appear here."
    );

    return;
  }

  mount.innerHTML = posts
    .map((item, index) =>
      newsCardMarkup(item, index, targetId)
    )
    .join("");

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
  mount.innerHTML = data.map((item, index) => `
    <figure class="gallery-item ${index % 5 === 0 ? "gallery-item--wide" : ""} reveal">
      <img src="${escapeAttribute(item.image_url)}" alt="${escapeAttribute(item.title || "Imperial AC")}" loading="lazy">
      <figcaption><strong>${escapeHtml(item.title || "Imperial AC")}</strong><span>${escapeHtml(item.category || "Club")}</span></figcaption>
    </figure>`).join("");
  observeReveal();
}

async function renderFixtures() {
  const loading = document.getElementById("fixtureLoading");
  const upcomingSection = document.querySelector("[data-fixture-upcoming-section]");
  const resultsSection = document.querySelector("[data-fixture-results-section]");
  const upcomingMount = document.getElementById("upcomingFixtureList");
  const resultsMount = document.getElementById("resultFixtureList");
  const homeMatch = document.getElementById("homeMatch");
  if (!upcomingMount && !resultsMount && !homeMatch) return;

  const client = getCmsClient();
  if (!client) {
    if (loading) loading.innerHTML = emptyState("Fixtures awaiting confirmation", "Official dates, opponents, grounds and kick-off times will appear here once confirmed.");
    if (homeMatch) renderHomeMatch(null);
    return;
  }

  const { data, error } = await client.from("fixtures").select("*").eq("published", true).order("match_date", { ascending: true });
  if (error || !data?.length) {
    if (loading) loading.innerHTML = emptyState("Fixtures awaiting confirmation", "Official dates, opponents, grounds and kick-off times will appear here once confirmed.");
    if (homeMatch) renderHomeMatch(null);
    return;
  }

  const upcoming = data.filter(item => item.status !== "result").sort(compareFixtureDatesAscending);
  const results = data.filter(item => item.status === "result").sort(compareFixtureDatesDescending);
  if (homeMatch) renderHomeMatch(upcoming[0] || results[0] || null);

  if (!upcomingMount || !resultsMount) return;
  if (loading) loading.hidden = true;

  if (upcoming.length) {
    upcomingSection?.removeAttribute("hidden");
    upcomingMount.innerHTML = upcoming.map(renderFixtureRow).join("");
  } else upcomingSection?.setAttribute("hidden", "");

  if (results.length) {
    resultsSection?.removeAttribute("hidden");
    resultsMount.innerHTML = results.map(renderFixtureRow).join("");
  } else resultsSection?.setAttribute("hidden", "");

  if (!upcoming.length && !results.length && loading) {
    loading.hidden = false;
    loading.innerHTML = emptyState("Fixtures awaiting confirmation", "Official dates, opponents, grounds and kick-off times will appear here once confirmed.");
  }
  observeReveal();
}

function renderHomeMatch(item) {
  const mount = document.getElementById("homeMatch");
  if (!mount) return;
  if (!item) {
    mount.innerHTML = `<div class="match-date"><p class="eyebrow">Next match</p><strong>Date TBC</strong><span>MPL</span></div><div class="match-teams"><div><span class="team-mark">IAC</span><strong>Imperial AC</strong></div><span class="score-mark">VS</span><div><span class="team-mark team-mark--outline">OPP</span><strong>Opponent TBC</strong></div></div><div class="match-detail"><span>Kick-off TBC</span><span>Venue TBC</span></div>`;
    return;
  }
  const score = item.status === "result" ? `${item.home_score ?? "–"} : ${item.away_score ?? "–"}` : "VS";
  mount.innerHTML = `<div class="match-date"><p class="eyebrow">${item.status === "result" ? "Latest result" : "Next match"}</p><strong>${escapeHtml(formatMatchDate(item.match_date))}</strong><span>${escapeHtml(item.competition || "MPL")}</span></div><div class="match-teams"><div><span class="team-mark">${initials(item.home_team)}</span><strong>${escapeHtml(item.home_team)}</strong></div><span class="score-mark">${score}</span><div><span class="team-mark team-mark--outline">${initials(item.away_team)}</span><strong>${escapeHtml(item.away_team)}</strong></div></div><div class="match-detail"><span>${escapeHtml(formatMatchTime(item.kickoff_time))}</span><span>${escapeHtml(item.venue || "Venue TBC")}</span></div>`;
}

function renderFixtureRow(item) {
  const status = item.status || "upcoming";
  const score = status === "result" ? `${item.home_score ?? "–"} - ${item.away_score ?? "–"}` : status === "postponed" ? "PPD" : status === "cancelled" ? "CAN" : "VS";
  const details = [item.competition || "MPL", formatMatchTime(item.kickoff_time)].filter(Boolean).map(escapeHtml).join(" • ");
  const location = [item.venue, item.notes].filter(Boolean).map(escapeHtml).join(" • ") || "Venue TBC";
  return `<article class="fixture-row reveal"><div class="fixture-date"><strong>${escapeHtml(formatMatchDate(item.match_date))}</strong><span>${details}</span></div><div class="fixture-teams"><span>${escapeHtml(item.home_team)}</span><strong>${score}</strong><span>${escapeHtml(item.away_team)}</span></div><div class="fixture-location">${location}</div></article>`;
}

async function renderArticle() {
  const mount = document.getElementById("newsArticle");

  if (!mount) {
    return;
  }

  if (!siteSettings.show_news) {
    mount.innerHTML = emptyState(
      "News is not public yet",
      "The club will open this section when its publishing process is ready."
    );

    return;
  }

  const id =
    new URLSearchParams(window.location.search).get("id");

  const client = getCmsClient();

  if (!id || !client) {
    mount.innerHTML = emptyState(
      "Story unavailable",
      "This story could not be loaded."
    );

    return;
  }

  const [groups, storyResponse] = await Promise.all([
    loadPublicNewsGroups(true),

    client
      .from("news_posts")
      .select("*")
      .eq("id", id)
      .eq("published", true)
      .maybeSingle()
  ]);

  if (storyResponse.error) {
    console.error(
      "Could not load news article:",
      storyResponse.error
    );

    mount.innerHTML = emptyState(
      "Story unavailable",
      "The story could not be loaded. Please try again."
    );

    return;
  }

  const data = storyResponse.data;

  if (!data) {
    mount.innerHTML = emptyState(
      "Story unavailable",
      "This story may have been removed or returned to draft."
    );

    return;
  }

  const assignedGroup = data.group_id
    ? groups.find(group => group.id === data.group_id)
    : null;

  if (
    data.group_id &&
    publicNewsGroupsLoaded &&
    !assignedGroup
  ) {
    mount.innerHTML = emptyState(
      "Story unavailable",
      "This story belongs to a group that is currently hidden."
    );

    return;
  }

  const group = groupForNewsPost(data, groups);

  let related = [];

  if (data.group_id) {
    const relatedResponse = await client
      .from("news_posts")
      .select("*")
      .eq("published", true)
      .eq("group_id", data.group_id)
      .neq("id", id)
      .order("published_at", {
        ascending: false
      })
      .limit(3);

    if (relatedResponse.error) {
      console.error(
        "Could not load related stories:",
        relatedResponse.error
      );
    } else {
      related = relatedResponse.data || [];
    }
  }

  const storyBody =
    data.body?.trim() ||
    data.excerpt?.trim() ||
    "The full story will be added soon.";

  const relatedMarkup = related.length
    ? `
      <section class="article-related">
        <div class="section-head">
          <div>
            <p class="eyebrow">More from this group</p>
            <h2 class="heading">
              ${escapeHtml(group.name)}
            </h2>
          </div>

          <a
            class="text-link"
            href="news.html?group=${encodeURIComponent(group.slug)}"
          >
            View group <span>↗</span>
          </a>
        </div>

        <div class="news-grid">
          ${related
            .map((item, index) =>
              newsCardMarkup(item, index, "relatedNews")
            )
            .join("")}
        </div>
      </section>
    `
    : "";

  mount.innerHTML = `
    <header class="article-header">
      <p class="eyebrow">
        <a
          class="article-group-link"
          href="news.html?group=${encodeURIComponent(group.slug)}"
        >
          ${escapeHtml(group.name)}
        </a>
      </p>

      <h1>${escapeHtml(data.title)}</h1>

      ${
        data.excerpt
          ? `<p class="article-lead">${escapeHtml(data.excerpt)}</p>`
          : ""
      }

      <div class="article-meta">
        <span>Imperial AC</span>
        <span>${formatDate(data.published_at)}</span>
      </div>
    </header>

    ${
      data.image_url
        ? `
          <img
            class="article-image"
            src="${escapeAttribute(data.image_url)}"
            alt="${escapeAttribute(data.title)}"
          >
        `
        : `
          <div class="article-image media-placeholder">
            <span>Article image slot</span>
          </div>
        `
    }

    <div class="article-body">
      ${paragraphs(storyBody)}
    </div>

    ${relatedMarkup}
  `;

  document.title = `${data.title} | Imperial AC`;

  observeReveal();
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

function fixtureDateValue(item) {
  if (!item.match_date) return Number.MAX_SAFE_INTEGER;
  return new Date(`${item.match_date}T${String(item.kickoff_time || "12:00:00").slice(0, 8)}`).getTime();
}
function compareFixtureDatesAscending(a, b) { return fixtureDateValue(a) - fixtureDateValue(b); }
function compareFixtureDatesDescending(a, b) { return fixtureDateValue(b) - fixtureDateValue(a); }
function formatMatchDate(value) { if (!value) return "Date TBC"; return new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${value}T12:00:00`)); }
function formatMatchTime(value) { return value ? String(value).slice(0, 5) : "Time TBC"; }
function formatDate(value) { if (!value) return ""; return new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value)); }
function initials(value = "") { return String(value).split(/\s+/).filter(Boolean).slice(0, 3).map(part => part[0]).join("").toUpperCase() || "FC"; }
function paragraphs(value = "") { return String(value).split(/\n{2,}/).filter(Boolean).map(p => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`).join(""); }
function escapeHtml(value = "") { return String(value).replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char])); }
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
  await loadSiteSettings();

  renderHeader();
  renderFooter();
  observeReveal();

  await Promise.all([
    renderStandings(),
    renderFixtures(),
    renderNews("homeNews", 3),
    renderNews("allNews"),
    renderGallery(),
    renderArticle()
  ]);

  setupForms();
  setupCookieControls();
  renderCookieNotice();
  observeReveal();
}

document.addEventListener("DOMContentLoaded", initialiseSite);
