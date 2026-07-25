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

function normaliseStandingTeamName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function standingTeamCode(teamName, team = null) {
  const savedCode = String(team?.short_code || "")
    .trim()
    .toUpperCase();

  return savedCode || initials(teamName);
}

function standingTeamBadge(teamName, team = null) {
  const code = escapeHtml(
    standingTeamCode(teamName, team)
  );

  if (!team?.logo_url) {
    return `
      <span class="table-crest">
        ${code}
      </span>
    `;
  }

  const scale = Math.min(
    250,
    Math.max(50, Number(team.logo_scale || 100))
  );

  const offsetX = Math.min(
    40,
    Math.max(-40, Number(team.logo_offset_x || 0))
  );

  const offsetY = Math.min(
    40,
    Math.max(-40, Number(team.logo_offset_y || 0))
  );

  return `
    <span class="table-crest table-crest--logo">
      <img
        src="${escapeHtml(team.logo_url)}"
        alt="${escapeHtml(team.team_name || teamName)} crest"
        loading="lazy"
        data-standing-team-logo
        style="
          transform:
            translate(${offsetX}%, ${offsetY}%)
            scale(${scale / 100});
        "
      >

      <span
        class="table-crest__fallback"
        hidden
      >
        ${code}
      </span>
    </span>
  `;
}

function activateStandingLogoFallbacks(root = document) {
  root
    .querySelectorAll("[data-standing-team-logo]")
    .forEach(image => {
      image.addEventListener(
        "error",
        () => {
          image.hidden = true;

          const fallback = image.nextElementSibling;

          if (fallback) {
            fallback.hidden = false;
          }
        },
        { once: true }
      );
    });
}

function standingMovementMarkup(row) {
  const current = Number(row.position);
  const previous =
    Number(row.previous_position);

  if (
    !Number.isFinite(previous) ||
    previous <= 0
  ) {
    return `
      <span
        class="standing-movement standing-movement--new"
        title="New team"
        aria-label="New team in the standings"
      >
        NEW
      </span>
    `;
  }

  const movement = previous - current;

  if (movement > 0) {
    return `
      <span
        class="standing-movement standing-movement--up"
        title="Moved up ${movement}"
        aria-label="Moved up ${movement} position${movement === 1 ? "" : "s"}"
      >
        ▲ ${movement}
      </span>
    `;
  }

  if (movement < 0) {
    const amount = Math.abs(movement);

    return `
      <span
        class="standing-movement standing-movement--down"
        title="Moved down ${amount}"
        aria-label="Moved down ${amount} position${amount === 1 ? "" : "s"}"
      >
        ▼ ${amount}
      </span>
    `;
  }

  return `
    <span
      class="standing-movement standing-movement--same"
      title="No position change"
      aria-label="No position change"
    >
      —
    </span>
  `;
}

async function renderStandings() {
  const mount = document.getElementById("standingsBody");

  if (!mount) return;

  let rows = fallbackStandings;
  let teams = [];

  const client = getCmsClient();

  if (client) {
    const [standingsResponse, teamsResponse] =
      await Promise.all([
        client
          .from("standings")
          .select("*")
          .order("position", { ascending: true }),

        client
          .from("teams")
          .select(
            "id,team_name,short_code,logo_url," +
            "logo_scale,logo_offset_x,logo_offset_y," +
            "is_home_club,published"
          )
          .eq("published", true)
      ]);

    if (
      !standingsResponse.error &&
      standingsResponse.data?.length
    ) {
      rows = standingsResponse.data;
    }

    if (!teamsResponse.error) {
      teams = teamsResponse.data || [];
    } else {
      console.warn(
        "Team crests could not be loaded:",
        teamsResponse.error
      );
    }
  }

  const teamsById = new Map(
    teams.map(team => [
      String(team.id),
      team
    ])
  );

  const teamsByName = new Map(
    teams.map(team => [
      normaliseStandingTeamName(team.team_name),
      team
    ])
  );

  mount.innerHTML = rows.map(row => {
    const team =
      teamsById.get(String(row.team_id || "")) ||
      teamsByName.get(
        normaliseStandingTeamName(row.team_name)
      ) ||
      null;

    const isImperial =
      Boolean(team?.is_home_club) ||
      String(row.team_name)
        .toLowerCase()
        .includes("imperial");

    return `
      <tr class="${isImperial ? "is-imperial" : ""}">
        <td class="standing-position-cell">
          <strong>${row.position}</strong>
          ${standingMovementMarkup(row)}
        </td>

        <td class="club-cell">
          ${standingTeamBadge(row.team_name, team)}
          ${escapeHtml(row.team_name)}
        </td>

        <td>${row.played}</td>
        <td>${row.won}</td>
        <td>${row.drawn}</td>
        <td>${row.lost}</td>
        <td>${row.goals_for}</td>
        <td>${row.goals_against}</td>
        <td>${row.goal_difference}</td>

        <td>
          <strong>${row.points}</strong>
        </td>
      </tr>
    `;
  }).join("");

  activateStandingLogoFallbacks(mount);
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

function homeMatchTeamBadge(
  teamName,
  team = null,
  outline = false
) {
  const code = escapeHtml(
    standingTeamCode(teamName, team)
  );

  const outlineClass =
    outline ? " team-mark--outline" : "";

  if (!team?.logo_url) {
    return `
      <span
        class="team-mark home-match-team-mark${outlineClass}"
      >
        ${code}
      </span>
    `;
  }

  const scale = Math.min(
    250,
    Math.max(50, Number(team.logo_scale || 100))
  );

  const offsetX = Math.min(
    40,
    Math.max(-40, Number(team.logo_offset_x || 0))
  );

  const offsetY = Math.min(
    40,
    Math.max(-40, Number(team.logo_offset_y || 0))
  );

  return `
    <span
      class="
        team-mark
        home-match-team-mark
        home-match-team-mark--logo
        ${outlineClass}
      "
    >
      <img
        src="${escapeHtml(team.logo_url)}"
        alt="${escapeHtml(team.team_name || teamName)} badge"
        loading="lazy"
        data-home-match-team-logo
        style="
          transform:
            translate(${offsetX}%, ${offsetY}%)
            scale(${scale / 100});
        "
      >

      <span
        class="home-match-team-mark__fallback"
        hidden
      >
        ${code}
      </span>
    </span>
  `;
}

function activateHomeMatchLogoFallbacks(
  root = document
) {
  root
    .querySelectorAll("[data-home-match-team-logo]")
    .forEach(image => {
      image.addEventListener(
        "error",
        () => {
          image.hidden = true;

          const fallback =
            image.nextElementSibling;

          if (fallback) {
            fallback.hidden = false;
          }
        },
        { once: true }
      );
    });
}

function resolveFixtureTeam(
  teamId,
  teamName,
  teamsById,
  teamsByName
) {
  return (
    teamsById.get(String(teamId || "")) ||
    teamsByName.get(
      normaliseStandingTeamName(teamName)
    ) ||
    null
  );
}

function fixtureCardDateTimeValue(item) {
  const date = String(item?.match_date || "").trim();

  if (!date) {
    return Number.POSITIVE_INFINITY;
  }

  const rawTime =
    String(item?.kickoff_time || "").trim();

  const time = rawTime
    ? rawTime.slice(0, 8)
    : "23:59:59";

  const value = new Date(
    `${date}T${time}`
  ).getTime();

  return Number.isFinite(value)
    ? value
    : Number.POSITIVE_INFINITY;
}

function fixtureCardShortDate(value) {
  const date = String(value || "").trim();

  if (!date) return "Date TBC";

  const parsed = new Date(`${date}T12:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return "Date TBC";
  }

  return parsed.toLocaleDateString(
    "en-ZA",
    {
      day: "numeric",
      month: "short"
    }
  );
}

function compareUpcomingFixtureCards(a, b) {
  const now = Date.now();

  const aTime = fixtureCardDateTimeValue(a);
  const bTime = fixtureCardDateTimeValue(b);

  const aIsPast =
    Number.isFinite(aTime) && aTime < now;

  const bIsPast =
    Number.isFinite(bTime) && bTime < now;

  // Confirmed future matches appear first.
  if (aIsPast !== bIsPast) {
    return aIsPast ? 1 : -1;
  }

  // Future matches: nearest first.
  if (!aIsPast) {
    return aTime - bTime;
  }

  // Past fixtures awaiting an update: newest first.
  return bTime - aTime;
}

function fixtureCardResolveTeam(
  teamId,
  teamName,
  teamsById,
  teamsByName
) {
  return (
    teamsById.get(String(teamId || "")) ||
    teamsByName.get(
      normaliseStandingTeamName(teamName)
    ) ||
    null
  );
}

function fixtureCardTeamBadge(
  teamName,
  team = null
) {
  const code = escapeHtml(
    standingTeamCode(teamName, team)
  );

  if (!team?.logo_url) {
    return `
      <span class="fixture-card-badge">
        ${code}
      </span>
    `;
  }

  const scale = Math.min(
    250,
    Math.max(
      50,
      Number(team.logo_scale || 100)
    )
  );

  const offsetX = Math.min(
    40,
    Math.max(
      -40,
      Number(team.logo_offset_x || 0)
    )
  );

  const offsetY = Math.min(
    40,
    Math.max(
      -40,
      Number(team.logo_offset_y || 0)
    )
  );

  return `
    <span
      class="
        fixture-card-badge
        fixture-card-badge--logo
      "
    >
      <img
        src="${escapeHtml(team.logo_url)}"
        alt="${escapeHtml(
          team.team_name || teamName
        )} badge"
        loading="lazy"
        data-fixture-card-logo
        style="
          transform:
            translate(${offsetX}%, ${offsetY}%)
            scale(${scale / 100});
        "
      >

      <span
        class="fixture-card-badge__fallback"
        hidden
      >
        ${code}
      </span>
    </span>
  `;
}

function activateFixtureCardLogoFallbacks(
  root = document
) {
  root
    .querySelectorAll("[data-fixture-card-logo]")
    .forEach(image => {
      image.addEventListener(
        "error",
        () => {
          image.hidden = true;

          const fallback =
            image.nextElementSibling;

          if (fallback) {
            fallback.hidden = false;
          }
        },
        { once: true }
      );
    });
}

function fixtureCardTimeLabel(item) {
  const status =
    String(item?.status || "upcoming");

  if (status === "result") {
    return "FT";
  }

  if (status === "postponed") {
    return "PPD";
  }

  if (status === "cancelled") {
    return "CAN";
  }

  const timestamp =
    fixtureCardDateTimeValue(item);

  if (
    Number.isFinite(timestamp) &&
    timestamp < Date.now()
  ) {
    return "Awaiting update";
  }

  return formatMatchTime(item?.kickoff_time);
}

async function renderFixtures() {
  const loading =
    document.getElementById("fixtureLoading");

  const upcomingSection = document.querySelector(
    "[data-fixture-upcoming-section]"
  );

  const resultsSection = document.querySelector(
    "[data-fixture-results-section]"
  );

  const upcomingMount =
    document.getElementById("upcomingFixtureList");

  const resultsMount =
    document.getElementById("resultFixtureList");

  const homeMatch =
    document.getElementById("homeMatch");

  if (
    !upcomingMount &&
    !resultsMount &&
    !homeMatch
  ) {
    return;
  }

  const client = getCmsClient();

  if (!client) {
    if (loading) {
      loading.innerHTML = emptyState(
        "Fixtures awaiting confirmation",
        "Official dates, opponents, grounds and kick-off times will appear here once confirmed."
      );
    }

    if (homeMatch) {
      renderHomeMatch(null);
    }

    return;
  }

  const [fixturesResponse, teamsResponse] =
    await Promise.all([
      client
        .from("fixtures")
        .select("*")
        .eq("published", true)
        .order("match_date", {
          ascending: true
        }),

      client
        .from("teams")
        .select(
          "id,team_name,short_code,logo_url," +
          "logo_scale,logo_offset_x,logo_offset_y," +
          "is_home_club,published"
        )
        .eq("published", true)
    ]);

  const fixtures =
    fixturesResponse.data || [];

  const teams = teamsResponse.error
    ? []
    : teamsResponse.data || [];

  if (teamsResponse.error) {
    console.warn(
      "Fixture team badges could not be loaded:",
      teamsResponse.error
    );
  }

  const teamsById = new Map(
    teams.map(team => [
      String(team.id),
      team
    ])
  );

  const teamsByName = new Map(
    teams.map(team => [
      normaliseStandingTeamName(
        team.team_name
      ),
      team
    ])
  );

  if (
    fixturesResponse.error ||
    !fixtures.length
  ) {
    if (loading) {
      loading.innerHTML = emptyState(
        "Fixtures awaiting confirmation",
        "Official dates, opponents, grounds and kick-off times will appear here once confirmed."
      );
    }

    if (homeMatch) {
      renderHomeMatch(
        null,
        teamsById,
        teamsByName
      );
    }

    return;
  }

  const upcoming = fixtures
    .filter(item => item.status !== "result")
    .sort(compareUpcomingFixtureCards);

  const results = fixtures
    .filter(item => item.status === "result")
    .sort(compareFixtureDatesDescending);

  const now = Date.now();

  const nextConfirmedFixture =
    upcoming.find(item => {
      return (
        item.status === "upcoming" &&
        fixtureCardDateTimeValue(item) >= now
      );
    });

  if (homeMatch) {
    renderHomeMatch(
      nextConfirmedFixture ||
        results[0] ||
        null,
      teamsById,
      teamsByName
    );
  }

  // Homepage only needs the Match Centre.
  if (!upcomingMount || !resultsMount) {
    return;
  }

  upcomingMount.classList.add(
    "fixture-card-grid"
  );

  resultsMount.classList.add(
    "fixture-card-grid"
  );

  if (loading) {
    loading.hidden = true;
  }

  if (upcoming.length) {
    upcomingSection?.removeAttribute("hidden");

    upcomingMount.innerHTML = upcoming
      .map(item => {
        return renderFixtureRow(
          item,
          teamsById,
          teamsByName
        );
      })
      .join("");

    activateFixtureCardLogoFallbacks(
      upcomingMount
    );
  } else {
    upcomingSection?.setAttribute(
      "hidden",
      ""
    );
  }

  if (results.length) {
    resultsSection?.removeAttribute("hidden");

    resultsMount.innerHTML = results
      .map(item => {
        return renderFixtureRow(
          item,
          teamsById,
          teamsByName
        );
      })
      .join("");

    activateFixtureCardLogoFallbacks(
      resultsMount
    );
  } else {
    resultsSection?.setAttribute(
      "hidden",
      ""
    );
  }

  if (
    !upcoming.length &&
    !results.length &&
    loading
  ) {
    loading.hidden = false;

    loading.innerHTML = emptyState(
      "Fixtures awaiting confirmation",
      "Official dates, opponents, grounds and kick-off times will appear here once confirmed."
    );
  }

  observeReveal();
}

function renderHomeMatch(
  item,
  teamsById = new Map(),
  teamsByName = new Map()
) {
  const mount =
    document.getElementById("homeMatch");

  if (!mount) return;

  if (!item) {
    mount.innerHTML = `
      <div class="match-date">
        <p class="eyebrow">Next match</p>
        <strong>Date TBC</strong>
        <span>MPL</span>
      </div>

      <div class="match-teams">
        <div class="match-team-card">
          <span
            class="team-mark home-match-team-mark"
          >
            IAC
          </span>

          <strong class="home-match-team-name">
            Imperial AC
          </strong>
        </div>

        <span class="score-mark">VS</span>

        <div class="match-team-card">
          <span
            class="
              team-mark
              team-mark--outline
              home-match-team-mark
            "
          >
            OPP
          </span>

          <strong class="home-match-team-name">
            Opponent TBC
          </strong>
        </div>
      </div>

      <div class="match-detail">
        <span>Kick-off TBC</span>
        <span>Venue TBC</span>
      </div>
    `;

    return;
  }

  const homeTeam = resolveFixtureTeam(
    item.home_team_id,
    item.home_team,
    teamsById,
    teamsByName
  );

  const awayTeam = resolveFixtureTeam(
    item.away_team_id,
    item.away_team,
    teamsById,
    teamsByName
  );

  const score =
    item.status === "result"
      ? `${item.home_score ?? "–"} : ${item.away_score ?? "–"}`
      : "VS";

  mount.innerHTML = `
    <div class="match-date">
      <p class="eyebrow">
        ${
          item.status === "result"
            ? "Latest result"
            : "Next match"
        }
      </p>

      <strong>
        ${escapeHtml(formatMatchDate(item.match_date))}
      </strong>

      <span>
        ${escapeHtml(item.competition || "MPL")}
      </span>
    </div>

    <div class="match-teams">
      <div class="match-team-card">
        ${homeMatchTeamBadge(
          item.home_team,
          homeTeam,
          false
        )}

        <strong class="home-match-team-name">
          ${escapeHtml(item.home_team)}
        </strong>
      </div>

      <span class="score-mark">
        ${escapeHtml(String(score))}
      </span>

      <div class="match-team-card">
        ${homeMatchTeamBadge(
          item.away_team,
          awayTeam,
          true
        )}

        <strong class="home-match-team-name">
          ${escapeHtml(item.away_team)}
        </strong>
      </div>
    </div>

    <div class="match-detail">
      <span>
        ${escapeHtml(
          formatMatchTime(item.kickoff_time)
        )}
      </span>

      <span>
        ${escapeHtml(item.venue || "Venue TBC")}
      </span>
    </div>
  `;

  activateHomeMatchLogoFallbacks(mount);
}

function renderFixtureRow(
  item,
  teamsById = new Map(),
  teamsByName = new Map()
) {
  const status =
    String(item.status || "upcoming");

  const isResult =
    status === "result";

  const homeTeam = fixtureCardResolveTeam(
    item.home_team_id,
    item.home_team,
    teamsById,
    teamsByName
  );

  const awayTeam = fixtureCardResolveTeam(
    item.away_team_id,
    item.away_team,
    teamsById,
    teamsByName
  );

  const homeScore =
    item.home_score ?? "–";

  const awayScore =
    item.away_score ?? "–";

  const homeWon =
    isResult &&
    Number(item.home_score) >
      Number(item.away_score);

  const awayWon =
    isResult &&
    Number(item.away_score) >
      Number(item.home_score);

  const dateLabel =
    fixtureCardShortDate(item.match_date);

  const timeLabel =
    fixtureCardTimeLabel(item);

  const competition =
    item.competition || "MPL";

  const venue =
    item.venue || "Venue TBC";

  return `
    <article
      class="
        fixture-google-card
        fixture-google-card--${escapeHtml(status)}
        reveal
      "
    >
      <div class="fixture-google-card__main">
        <div class="fixture-google-card__teams">
          <div
            class="
              fixture-google-team
              ${homeWon ? "is-winner" : ""}
            "
          >
            ${fixtureCardTeamBadge(
              item.home_team,
              homeTeam
            )}

            <span class="fixture-google-team__name">
              ${escapeHtml(item.home_team)}
            </span>

            ${
              isResult
                ? `
                  <strong
                    class="fixture-google-team__score"
                  >
                    ${escapeHtml(String(homeScore))}
                  </strong>
                `
                : ""
            }
          </div>

          <div
            class="
              fixture-google-team
              ${awayWon ? "is-winner" : ""}
            "
          >
            ${fixtureCardTeamBadge(
              item.away_team,
              awayTeam
            )}

            <span class="fixture-google-team__name">
              ${escapeHtml(item.away_team)}
            </span>

            ${
              isResult
                ? `
                  <strong
                    class="fixture-google-team__score"
                  >
                    ${escapeHtml(String(awayScore))}
                  </strong>
                `
                : ""
            }
          </div>
        </div>

        <div class="fixture-google-card__when">
          <strong>
            ${escapeHtml(dateLabel)}
          </strong>

          <span>
            ${escapeHtml(timeLabel)}
          </span>
        </div>
      </div>

      <div class="fixture-google-card__footer">
        <span>${escapeHtml(competition)}</span>
        <span aria-hidden="true">•</span>
        <span>${escapeHtml(venue)}</span>
      </div>
    </article>
  `;
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

function publicPartnerInitials(name) {
  return String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word.charAt(0))
    .join("")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4) || "P";
}

function publicPartnerTransform(partner = {}) {
  const scale = Math.min(
    250,
    Math.max(50, Number(partner.logo_scale) || 100)
  );

  const x = Math.min(
    40,
    Math.max(-40, Number(partner.logo_offset_x) || 0)
  );

  const y = Math.min(
    40,
    Math.max(-40, Number(partner.logo_offset_y) || 0)
  );

  return `translate(${x}%, ${y}%) scale(${scale / 100})`;
}

function publicPartnerLogo(partner) {
  const fallback = escapeHtml(
    publicPartnerInitials(partner.name)
  );

  if (!partner.logo_url) {
    return `
      <span class="public-partner-logo public-partner-logo--fallback">
        ${fallback}
      </span>
    `;
  }

  return `
    <span class="public-partner-logo">
      <img
        src="${escapeHtml(partner.logo_url)}"
        alt="${escapeHtml(partner.name)} logo"
        loading="lazy"
        data-public-partner-logo
        style="transform: ${publicPartnerTransform(partner)};"
      >

      <span
        class="public-partner-logo__fallback"
        hidden
      >
        ${fallback}
      </span>
    </span>
  `;
}

function activatePublicPartnerFallbacks(root = document) {
  root
    .querySelectorAll("[data-public-partner-logo]")
    .forEach(image => {
      image.addEventListener(
        "error",
        () => {
          image.hidden = true;

          const fallback = image.nextElementSibling;

          if (fallback) {
            fallback.hidden = false;
          }
        },
        { once: true }
      );
    });
}

function findOrCreatePartnerMount() {
  const isPartnersPage =
    document.body?.dataset.page === "partners";

  if (!isPartnersPage) {
    return document.querySelector(".partner-logos");
  }

  let mount =
    document.getElementById("partnerList") ||
    document.querySelector(
      "[data-partner-list], .partners-grid"
    );

  if (mount) {
    mount.id = "partnerList";
    mount.classList.add("public-partner-grid");
    return mount;
  }

  const main = document.querySelector("main");

  if (!main) return null;

  const section = document.createElement("section");
  section.className = "section";

  section.innerHTML = `
    <div class="container">
      <div
        class="public-partner-grid"
        id="partnerList"
      ></div>
    </div>
  `;

  main.appendChild(section);

  return section.querySelector("#partnerList");
}

async function renderPublicPartners() {
  const isPartnersPage =
    document.body?.dataset.page === "partners";

  const mount = findOrCreatePartnerMount();

  if (!mount) return;

  const client = getCmsClient();

  if (!client) return;

  const { data, error } = await client
    .from("partners")
    .select(
      "id,name,logo_url,website_url," +
      "display_order,published," +
      "logo_scale,logo_offset_x,logo_offset_y"
    )
    .eq("published", true)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("Partners could not be loaded:", error);
    return;
  }

  const partners = data || [];

  if (!isPartnersPage) {
    const homepagePartners = partners.slice(0, 4);

    const slots = Array.from(
      { length: 4 },
      (_, index) => {
        const partner = homepagePartners[index];

        if (!partner) {
          return `
            <div class="partner-logo-slot">
              Partner ${String(index + 1).padStart(2, "0")}
            </div>
          `;
        }

        const contents = `
          ${publicPartnerLogo(partner)}

          <span class="partner-logo-slot__name">
            ${escapeHtml(partner.name)}
          </span>
        `;

        if (partner.website_url) {
          return `
            <a
              class="partner-logo-slot partner-logo-slot--live"
              href="${escapeHtml(partner.website_url)}"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visit ${escapeHtml(partner.name)}"
            >
              ${contents}
            </a>
          `;
        }

        return `
          <div
            class="partner-logo-slot partner-logo-slot--live"
          >
            ${contents}
          </div>
        `;
      }
    );

    mount.innerHTML = slots.join("");
    activatePublicPartnerFallbacks(mount);
    return;
  }

  if (!partners.length) {
    mount.innerHTML = `
      <div class="partner-public-empty">
        Partner announcements will appear here.
      </div>
    `;
    return;
  }

  mount.innerHTML = partners.map(partner => {
    const content = `
      ${publicPartnerLogo(partner)}

      <span class="public-partner-name">
        ${escapeHtml(partner.name)}
      </span>

      ${
        partner.website_url
          ? '<span class="public-partner-link">Visit website ↗</span>'
          : ""
      }
    `;

    if (partner.website_url) {
      return `
        <a
          class="public-partner-card"
          href="${escapeHtml(partner.website_url)}"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Visit ${escapeHtml(partner.name)}"
        >
          ${content}
        </a>
      `;
    }

    return `
      <article class="public-partner-card">
        ${content}
      </article>
    `;
  }).join("");

  activatePublicPartnerFallbacks(mount);
}

document.addEventListener(
  "DOMContentLoaded",
  renderPublicPartners
);
