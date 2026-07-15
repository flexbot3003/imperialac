let adminClient = null;
let currentStandings = [];
let currentFixtures = [];
let currentNews = [];
let currentGallery = [];

function configReady() {
  const config = window.IMPERIAL_CMS || {};
  return Boolean(
    config.supabaseUrl &&
    config.supabaseAnonKey &&
    window.supabase?.createClient
  );
}

function client() {
  if (!configReady()) return null;

  adminClient ||= window.supabase.createClient(
    window.IMPERIAL_CMS.supabaseUrl,
    window.IMPERIAL_CMS.supabaseAnonKey
  );

  return adminClient;
}

function notice(message, type = "success") {
  const element = document.getElementById("adminNotice");
  element.textContent = message;
  element.className = `admin-notice show ${type}`;

  window.clearTimeout(notice.timer);
  notice.timer = window.setTimeout(() => {
    element.classList.remove("show");
  }, 5000);
}

function esc(value = "") {
  return String(value).replace(
    /[&<>'"]/g,
    character =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;"
      })[character]
  );
}

function nullableNumber(value) {
  const cleaned = String(value ?? "").trim();
  return cleaned === "" ? null : Number(cleaned);
}

function shortDate(value) {
  if (!value) return "Date TBC";
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function shortTime(value) {
  if (!value) return "Time TBC";
  return String(value).slice(0, 5);
}

function statusLabel(status) {
  return {
    upcoming: "Upcoming",
    result: "Result",
    postponed: "Postponed",
    cancelled: "Cancelled"
  }[status] || "Upcoming";
}

async function initAdmin() {
  document.getElementById("configRequired").hidden = configReady();
  document.getElementById("authArea").hidden = !configReady();

  if (!configReady()) return;

  const { data } = await client().auth.getSession();
  setAuthState(data.session);

  client().auth.onAuthStateChange((_event, session) => {
    setAuthState(session);
  });

  document.getElementById("loginForm").addEventListener("submit", login);
  document.getElementById("logoutButton").addEventListener("click", () => client().auth.signOut());

  document.querySelectorAll("[data-admin-tab]").forEach(button => {
    button.addEventListener("click", () => showTab(button.dataset.adminTab));
  });

  document.getElementById("addStandingRow").addEventListener("click", addStandingRow);
  document.getElementById("saveStandings").addEventListener("click", saveStandings);

  document.getElementById("fixtureForm").addEventListener("submit", saveFixture);
  document.getElementById("resetFixtureForm").addEventListener("click", resetFixtureForm);

  document.getElementById("newsForm").addEventListener("submit", saveNews);
  document.getElementById("resetNewsForm").addEventListener("click", resetNewsForm);

  document.getElementById("galleryForm").addEventListener("submit", saveGallery);
  document.getElementById("resetGalleryForm").addEventListener("click", resetGalleryForm);

  document.getElementById("settingsForm").addEventListener("submit", saveSettings);
}

function setAuthState(session) {
  document.getElementById("loginPanel").hidden = Boolean(session);
  document.getElementById("dashboard").hidden = !session;
  document.getElementById("loggedInEmail").textContent = session?.user?.email || "";

  if (session) loadDashboard();
}

async function login(event) {
  event.preventDefault();

  const form = new FormData(event.currentTarget);
  const { error } = await client().auth.signInWithPassword({
    email: form.get("email"),
    password: form.get("password")
  });

  if (error) notice(error.message, "error");
}

function showTab(name) {
  document.querySelectorAll("[data-admin-tab]").forEach(button => {
    button.classList.toggle("active", button.dataset.adminTab === name);
  });

  document.querySelectorAll("[data-admin-panel]").forEach(panel => {
    panel.hidden = panel.dataset.adminPanel !== name;
  });
}

async function loadDashboard() {
  await Promise.all([
    loadStandings(),
    loadFixtures(),
    loadNews(),
    loadGallery(),
    loadSettings()
  ]);
}

/* =========================================================
   STANDINGS
========================================================= */

async function loadStandings() {
  const { data, error } = await client()
    .from("standings")
    .select("*")
    .order("position");

  if (error) return notice(error.message, "error");

  currentStandings = data || [];
  renderStandingEditor();
}

function renderStandingEditor() {
  const body = document.getElementById("standingEditorBody");

  body.innerHTML = currentStandings
    .map(
      (row, index) => `
        <tr data-id="${row.id || ""}">
          <td><input class="table-input pos" type="number" min="1" value="${row.position || index + 1}"></td>
          <td><input class="table-input team" value="${esc(row.team_name || "")}" required></td>
          <td><input class="table-input p" type="number" min="0" value="${row.played || 0}"></td>
          <td><input class="table-input w" type="number" min="0" value="${row.won || 0}"></td>
          <td><input class="table-input d" type="number" min="0" value="${row.drawn || 0}"></td>
          <td><input class="table-input l" type="number" min="0" value="${row.lost || 0}"></td>
          <td><input class="table-input gf" type="number" min="0" value="${row.goals_for || 0}"></td>
          <td><input class="table-input ga" type="number" min="0" value="${row.goals_against || 0}"></td>
          <td><output class="gd">${row.goal_difference || 0}</output></td>
          <td><output class="pts">${row.points || 0}</output></td>
          <td><button class="icon-button danger" type="button" data-delete-standing aria-label="Delete team">×</button></td>
        </tr>
      `
    )
    .join("");

  body.querySelectorAll("input").forEach(input => {
    input.addEventListener("input", recalculateStandingRows);
  });

  body.querySelectorAll("[data-delete-standing]").forEach(button => {
    button.addEventListener("click", () => deleteStanding(button));
  });

  recalculateStandingRows();
}

function addStandingRow() {
  currentStandings.push({
    position: currentStandings.length + 1,
    team_name: "New Team",
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goals_for: 0,
    goals_against: 0,
    goal_difference: 0,
    points: 0
  });

  renderStandingEditor();
}

function recalculateStandingRows() {
  document.querySelectorAll("#standingEditorBody tr").forEach(row => {
    const numberValue = className => Number(row.querySelector(`.${className}`).value || 0);
    row.querySelector(".gd").textContent = numberValue("gf") - numberValue("ga");
    row.querySelector(".pts").textContent = numberValue("w") * 3 + numberValue("d");
  });
}

async function saveStandings() {
  const existingRows = [];
  const newRows = [];

  [...document.querySelectorAll("#standingEditorBody tr")].forEach(row => {
    const value = className => row.querySelector(`.${className}`).value;

    const standingData = {
      position: Number(value("pos")),
      team_name: value("team").trim(),
      played: Number(value("p")),
      won: Number(value("w")),
      drawn: Number(value("d")),
      lost: Number(value("l")),
      goals_for: Number(value("gf")),
      goals_against: Number(value("ga")),
      goal_difference: Number(row.querySelector(".gd").textContent),
      points: Number(row.querySelector(".pts").textContent)
    };

    const rowId = (row.dataset.id || "").trim();

    if (rowId) existingRows.push({ ...standingData, id: rowId });
    else newRows.push(standingData);
  });

  const allRows = [...existingRows, ...newRows];

  if (allRows.some(row => !row.team_name)) {
    return notice("Every row needs a team name.", "error");
  }

  if (allRows.some(row => !Number.isInteger(row.position) || row.position < 1)) {
    return notice("Every team needs a valid position.", "error");
  }

  if (existingRows.length > 0) {
    const { error } = await client()
      .from("standings")
      .upsert(existingRows, { onConflict: "id" });

    if (error) return notice(error.message, "error");
  }

  if (newRows.length > 0) {
    const { error } = await client()
      .from("standings")
      .insert(newRows);

    if (error) return notice(error.message, "error");
  }

  notice("Standings updated live.");
  await loadStandings();
}

async function deleteStanding(button) {
  const row = button.closest("tr");
  const id = (row.dataset.id || "").trim();

  if (!id) {
    row.remove();
    return;
  }

  if (!window.confirm("Delete this team from the table?")) return;

  const { error } = await client()
    .from("standings")
    .delete()
    .eq("id", id);

  if (error) return notice(error.message, "error");

  notice("Team removed.");
  await loadStandings();
}

/* =========================================================
   FIXTURES
========================================================= */

async function loadFixtures() {
  const { data, error } = await client()
    .from("fixtures")
    .select("*")
    .order("match_date", { ascending: false });

  if (error) return notice(error.message, "error");

  currentFixtures = data || [];

  const list = document.getElementById("fixtureAdminList");

  list.innerHTML = currentFixtures.length
    ? currentFixtures
        .map(item => {
          const score = item.status === "result"
            ? `${item.home_score ?? "–"} - ${item.away_score ?? "–"}`
            : statusLabel(item.status);

          return `
            <article class="admin-list-item">
              <div class="admin-thumb-placeholder">${esc(shortDate(item.match_date).split(" ").slice(0, 2).join(" "))}</div>
              <div>
                <span class="badge">${esc(statusLabel(item.status))}${item.published ? "" : " • Hidden"}</span>
                <h3>${esc(item.home_team)} ${esc(score)} ${esc(item.away_team)}</h3>
                <p>${esc(item.competition || "MPL")} • ${esc(shortTime(item.kickoff_time))}${item.venue ? ` • ${esc(item.venue)}` : ""}</p>
              </div>
              <div class="admin-actions">
                <button class="button secondary small" type="button" data-edit-fixture="${item.id}">Edit</button>
                <button class="button small danger-button" type="button" data-delete-fixture="${item.id}">Delete</button>
              </div>
            </article>
          `;
        })
        .join("")
    : '<p class="muted">No fixtures or results yet.</p>';

  list.querySelectorAll("[data-edit-fixture]").forEach(button => {
    button.addEventListener("click", () => editFixture(button.dataset.editFixture));
  });

  list.querySelectorAll("[data-delete-fixture]").forEach(button => {
    button.addEventListener("click", () => deleteFixture(button.dataset.deleteFixture));
  });
}

function editFixture(id) {
  const item = currentFixtures.find(fixture => fixture.id === id);
  if (!item) return;

  const form = document.getElementById("fixtureForm");

  form.elements.id.value = item.id;
  form.elements.competition.value = item.competition || "MPL";
  form.elements.status.value = item.status || "upcoming";
  form.elements.match_date.value = item.match_date || "";
  form.elements.kickoff_time.value = item.kickoff_time ? String(item.kickoff_time).slice(0, 5) : "";
  form.elements.home_team.value = item.home_team || "";
  form.elements.away_team.value = item.away_team || "";
  form.elements.home_score.value = item.home_score ?? "";
  form.elements.away_score.value = item.away_score ?? "";
  form.elements.venue.value = item.venue || "";
  form.elements.notes.value = item.notes || "";
  form.elements.published.checked = Boolean(item.published);

  window.scrollTo({ top: form.offsetTop - 100, behavior: "smooth" });
}

function resetFixtureForm() {
  const form = document.getElementById("fixtureForm");
  form.reset();
  form.elements.id.value = "";
  form.elements.competition.value = "MPL";
  form.elements.status.value = "upcoming";
  form.elements.published.checked = true;
}

async function saveFixture(event) {
  event.preventDefault();

  const form = event.currentTarget;

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const data = new FormData(form);
  const status = data.get("status");
  const homeScore = nullableNumber(data.get("home_score"));
  const awayScore = nullableNumber(data.get("away_score"));

  if (status === "result" && (homeScore === null || awayScore === null)) {
    return notice("Enter both scores before saving a result.", "error");
  }

  const payload = {
    competition: data.get("competition").trim() || "MPL",
    match_date: data.get("match_date") || null,
    kickoff_time: data.get("kickoff_time") || null,
    home_team: data.get("home_team").trim(),
    away_team: data.get("away_team").trim(),
    home_score: status === "result" ? homeScore : null,
    away_score: status === "result" ? awayScore : null,
    venue: data.get("venue").trim() || null,
    status,
    notes: data.get("notes").trim() || null,
    published: data.get("published") === "on",
    updated_at: new Date().toISOString()
  };

  const id = data.get("id");

  const query = id
    ? client().from("fixtures").update(payload).eq("id", id)
    : client().from("fixtures").insert(payload);

  const { error } = await query;

  if (error) return notice(error.message, "error");

  notice(id ? "Fixture updated live." : "Fixture added live.");
  resetFixtureForm();
  await loadFixtures();
}

async function deleteFixture(id) {
  if (!window.confirm("Delete this fixture or result?")) return;

  const { error } = await client()
    .from("fixtures")
    .delete()
    .eq("id", id);

  if (error) return notice(error.message, "error");

  notice("Fixture deleted.");
  await loadFixtures();
}

/* =========================================================
   NEWS
========================================================= */

async function loadNews() {
  const { data, error } = await client()
    .from("news_posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return notice(error.message, "error");

  currentNews = data || [];

  document.getElementById("newsAdminList").innerHTML = currentNews.length
    ? currentNews
        .map(
          item => `
            <article class="admin-list-item">
              <div>${item.image_url ? `<img src="${esc(item.image_url)}" alt="">` : '<div class="admin-thumb-placeholder">IAC</div>'}</div>
              <div>
                <span class="badge">${item.published ? "Published" : "Draft"}</span>
                <h3>${esc(item.title)}</h3>
                <p>${esc(item.category || "Club News")}</p>
              </div>
              <div class="admin-actions">
                <button class="button secondary small" type="button" data-edit-news="${item.id}">Edit</button>
                <button class="button small danger-button" type="button" data-delete-news="${item.id}">Delete</button>
              </div>
            </article>
          `
        )
        .join("")
    : '<p class="muted">No news posts yet.</p>';

  document.querySelectorAll("[data-edit-news]").forEach(button => {
    button.addEventListener("click", () => editNews(button.dataset.editNews));
  });

  document.querySelectorAll("[data-delete-news]").forEach(button => {
    button.addEventListener("click", () => deleteNews(button.dataset.deleteNews));
  });
}

function editNews(id) {
  const item = currentNews.find(post => post.id === id);
  if (!item) return;

  const form = document.getElementById("newsForm");

  form.elements.id.value = item.id;
  form.elements.title.value = item.title || "";
  form.elements.category.value = item.category || "Club News";
  form.elements.excerpt.value = item.excerpt || "";
  form.elements.body.value = item.body || "";
  form.elements.image_url.value = item.image_url || "";
  form.elements.published.checked = Boolean(item.published);

  window.scrollTo({ top: form.offsetTop - 100, behavior: "smooth" });
}

function resetNewsForm() {
  document.getElementById("newsForm").reset();
  document.getElementById("newsId").value = "";
}

async function saveNews(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const data = new FormData(form);
  let imageUrl = data.get("image_url").trim();
  const file = data.get("image_file");

  try {
    if (file?.size) imageUrl = await uploadFile(file, "news");
  } catch (error) {
    return notice(error.message, "error");
  }

  const isPublished = data.get("published") === "on";

  const payload = {
    title: data.get("title").trim(),
    category: data.get("category").trim(),
    excerpt: data.get("excerpt").trim(),
    body: data.get("body").trim(),
    image_url: imageUrl || null,
    published: isPublished,
    published_at: isPublished ? new Date().toISOString() : null,
    updated_at: new Date().toISOString()
  };

  const id = data.get("id");

  const query = id
    ? client().from("news_posts").update(payload).eq("id", id)
    : client().from("news_posts").insert(payload);

  const { error } = await query;

  if (error) return notice(error.message, "error");

  notice(id ? "News post updated." : "News post created.");
  resetNewsForm();
  await loadNews();
}

async function deleteNews(id) {
  if (!window.confirm("Delete this news post?")) return;

  const { error } = await client()
    .from("news_posts")
    .delete()
    .eq("id", id);

  if (error) return notice(error.message, "error");

  notice("News post deleted.");
  await loadNews();
}

/* =========================================================
   GALLERY
========================================================= */

async function loadGallery() {
  const { data, error } = await client()
    .from("gallery_items")
    .select("*")
    .order("display_order");

  if (error) return notice(error.message, "error");

  currentGallery = data || [];

  document.getElementById("galleryAdminList").innerHTML = currentGallery.length
    ? currentGallery
        .map(
          item => `
            <article class="admin-list-item">
              <div><img src="${esc(item.image_url)}" alt=""></div>
              <div>
                <span class="badge">${item.published ? "Published" : "Hidden"}</span>
                <h3>${esc(item.title || "Imperial AC")}</h3>
                <p>${esc(item.category || "Club")}</p>
              </div>
              <div class="admin-actions">
                <button class="button secondary small" type="button" data-edit-gallery="${item.id}">Edit</button>
                <button class="button small danger-button" type="button" data-delete-gallery="${item.id}">Delete</button>
              </div>
            </article>
          `
        )
        .join("")
    : '<p class="muted">No gallery images yet.</p>';

  document.querySelectorAll("[data-edit-gallery]").forEach(button => {
    button.addEventListener("click", () => editGallery(button.dataset.editGallery));
  });

  document.querySelectorAll("[data-delete-gallery]").forEach(button => {
    button.addEventListener("click", () => deleteGallery(button.dataset.deleteGallery));
  });
}

function editGallery(id) {
  const item = currentGallery.find(entry => entry.id === id);
  if (!item) return;

  const form = document.getElementById("galleryForm");

  form.elements.id.value = item.id;
  form.elements.title.value = item.title || "";
  form.elements.category.value = item.category || "Club";
  form.elements.image_url.value = item.image_url || "";
  form.elements.display_order.value = item.display_order || 0;
  form.elements.published.checked = Boolean(item.published);

  window.scrollTo({ top: form.offsetTop - 100, behavior: "smooth" });
}

function resetGalleryForm() {
  document.getElementById("galleryForm").reset();
  document.getElementById("galleryId").value = "";
}

async function saveGallery(event) {
  event.preventDefault();

  const data = new FormData(event.currentTarget);
  const file = data.get("image_file");
  let imageUrl = data.get("image_url").trim();

  try {
    if (file?.size) imageUrl = await uploadFile(file, "gallery");
  } catch (error) {
    return notice(error.message, "error");
  }

  if (!imageUrl) return notice("Upload an image or paste an image URL.", "error");

  const payload = {
    title: data.get("title").trim(),
    category: data.get("category").trim(),
    image_url: imageUrl,
    display_order: Number(data.get("display_order") || 0),
    published: data.get("published") === "on"
  };

  const id = data.get("id");

  const query = id
    ? client().from("gallery_items").update(payload).eq("id", id)
    : client().from("gallery_items").insert(payload);

  const { error } = await query;

  if (error) return notice(error.message, "error");

  notice(id ? "Gallery item updated." : "Gallery image added.");
  resetGalleryForm();
  await loadGallery();
}

async function deleteGallery(id) {
  if (!window.confirm("Delete this gallery item?")) return;

  const { error } = await client()
    .from("gallery_items")
    .delete()
    .eq("id", id);

  if (error) return notice(error.message, "error");

  notice("Gallery item deleted.");
  await loadGallery();
}

async function uploadFile(file, folder) {
  const extension = file.name.split(".").pop().toLowerCase();
  const fileName = typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const path = `${folder}/${fileName}.${extension}`;
  const bucket = window.IMPERIAL_CMS.storageBucket || "club-media";

  const { error } = await client()
    .storage
    .from(bucket)
    .upload(path, file, { cacheControl: "3600", upsert: false });

  if (error) throw new Error(error.message);

  const { data } = client()
    .storage
    .from(bucket)
    .getPublicUrl(path);

  return data.publicUrl;
}

/* =========================================================
   SITE SETTINGS
========================================================= */

async function loadSettings() {
  const { data, error } = await client()
    .from("site_settings")
    .select("key,value");

  if (error) return notice(error.message, "error");

  const settings = Object.fromEntries(
    (data || []).map(row => [row.key, row.value === true || row.value === "true"])
  );

  document.getElementById("showStandings").checked = settings.show_standings ?? true;
  document.getElementById("showNews").checked = settings.show_news ?? false;
  document.getElementById("showGallery").checked = settings.show_gallery ?? false;
}

async function saveSettings(event) {
  event.preventDefault();

  const rows = [
    {
      key: "show_standings",
      value: document.getElementById("showStandings").checked,
      updated_at: new Date().toISOString()
    },
    {
      key: "show_news",
      value: document.getElementById("showNews").checked,
      updated_at: new Date().toISOString()
    },
    {
      key: "show_gallery",
      value: document.getElementById("showGallery").checked,
      updated_at: new Date().toISOString()
    }
  ];

  const { error } = await client()
    .from("site_settings")
    .upsert(rows, { onConflict: "key" });

  if (error) return notice(error.message, "error");

  notice("Public visibility updated. Refresh the public site to see it.");
}

document.addEventListener("DOMContentLoaded", initAdmin);
