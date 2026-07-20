let adminClient = null;
let currentStandings = [];
let currentFixtures = [];
let currentNews = [];
let currentNewsGroups = [];
let currentGallery = [];

function configReady() {
  const config = window.IMPERIAL_CMS || {};
  return Boolean(config.supabaseUrl && config.supabaseAnonKey && window.supabase?.createClient);
}

function client() {
  if (!configReady()) return null;
  adminClient ||= window.supabase.createClient(window.IMPERIAL_CMS.supabaseUrl, window.IMPERIAL_CMS.supabaseAnonKey);
  return adminClient;
}

function notice(message, type = "success") {
  const element = document.getElementById("adminNotice");
  element.textContent = message;
  element.className = `admin-notice show ${type}`;
  clearTimeout(notice.timer);
  notice.timer = setTimeout(() => element.classList.remove("show"), 5000);
}

function esc(value = "") {
  return String(value).replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}
function nullableNumber(value) { const cleaned = String(value ?? "").trim(); return cleaned === "" ? null : Number(cleaned); }
function shortDate(value) { if (!value) return "Date TBC"; return new Intl.DateTimeFormat("en-ZA", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00`)); }
function shortTime(value) { return value ? String(value).slice(0, 5) : "Time TBC"; }
function statusLabel(status) { return ({ upcoming: "Upcoming", result: "Result", postponed: "Postponed", cancelled: "Cancelled" })[status] || "Upcoming"; }
function slugify(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
function newsGroupName(item) {
  return item?.news_groups?.name || item?.category || "Club News";
}

async function initAdmin() {
  document.getElementById("configRequired").hidden = configReady();
  document.getElementById("authArea").hidden = !configReady();
  if (!configReady()) return;

  const { data } = await client().auth.getSession();
  setAuthState(data.session);
  client().auth.onAuthStateChange((_event, session) => setAuthState(session));

  document.getElementById("loginForm").addEventListener("submit", login);
  document.getElementById("logoutButton").addEventListener("click", () => client().auth.signOut());
  document.querySelectorAll("[data-admin-tab]").forEach(button => button.addEventListener("click", () => showTab(button.dataset.adminTab)));
  document.getElementById("addStandingRow").addEventListener("click", addStandingRow);
  document.getElementById("saveStandings").addEventListener("click", saveStandings);
  document.getElementById("fixtureForm").addEventListener("submit", saveFixture);
  document.getElementById("resetFixtureForm").addEventListener("click", resetFixtureForm);
  document.getElementById("newsGroupForm").addEventListener("submit", saveNewsGroup);
  document.getElementById("resetNewsGroupForm").addEventListener("click", resetNewsGroupForm);
  document.getElementById("newsForm").addEventListener("submit", saveNews);
  document.getElementById("resetNewsForm").addEventListener("click", resetNewsForm);
  document.getElementById("adminNewsGroupFilter").addEventListener("change", renderNewsAdminList);

  const groupNameInput = document.getElementById("newsGroupName");
  const groupSlugInput = document.getElementById("newsGroupSlug");
  groupNameInput.addEventListener("input", () => {
    if (groupSlugInput.dataset.manuallyEdited !== "true") groupSlugInput.value = slugify(groupNameInput.value);
  });
  groupSlugInput.addEventListener("input", () => { groupSlugInput.dataset.manuallyEdited = "true"; });
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
  const { error } = await client().auth.signInWithPassword({ email: form.get("email"), password: form.get("password") });
  if (error) notice(error.message, "error");
}

function showTab(name) {
  document.querySelectorAll("[data-admin-tab]").forEach(button => button.classList.toggle("active", button.dataset.adminTab === name));
  document.querySelectorAll("[data-admin-panel]").forEach(panel => panel.hidden = panel.dataset.adminPanel !== name);
}

async function loadDashboard() {
  await loadNewsGroups();
  await Promise.all([loadStandings(), loadFixtures(), loadNews(), loadGallery(), loadSettings()]);
  updateOverview();
}

function updateOverview() {
  document.getElementById("countStandings").textContent = currentStandings.length;
  document.getElementById("countFixtures").textContent = currentFixtures.length;
  document.getElementById("countNews").textContent = currentNews.length;
  document.getElementById("countNewsGroups").textContent = currentNewsGroups.length;
  document.getElementById("countGallery").textContent = currentGallery.length;
}

async function loadStandings() {
  const { data, error } = await client().from("standings").select("*").order("position");
  if (error) return notice(error.message, "error");
  currentStandings = data || [];
  renderStandingEditor();
  updateOverview();
}

function renderStandingEditor() {
  const body = document.getElementById("standingEditorBody");
  body.innerHTML = currentStandings.map(row => standingRow(row)).join("");
  body.querySelectorAll("input").forEach(input => input.addEventListener("input", recalculateStandingRows));
  body.querySelectorAll("[data-delete-standing]").forEach(button => button.addEventListener("click", () => deleteStanding(button)));
  recalculateStandingRows();
}

function standingRow(row = {}) {
  return `<tr data-id="${esc(row.id || "")}"><td><input class="pos" type="number" min="1" value="${row.position ?? currentStandings.length + 1}"></td><td><input class="team" type="text" value="${esc(row.team_name || "New Team")}" required></td><td><input class="p" type="number" min="0" value="${row.played ?? 0}"></td><td><input class="w" type="number" min="0" value="${row.won ?? 0}"></td><td><input class="d" type="number" min="0" value="${row.drawn ?? 0}"></td><td><input class="l" type="number" min="0" value="${row.lost ?? 0}"></td><td><input class="gf" type="number" min="0" value="${row.goals_for ?? 0}"></td><td><input class="ga" type="number" min="0" value="${row.goals_against ?? 0}"></td><td class="gd">${row.goal_difference ?? 0}</td><td class="pts">${row.points ?? 0}</td><td><button class="icon-button danger" type="button" data-delete-standing aria-label="Delete team">×</button></td></tr>`;
}

function addStandingRow() {
  currentStandings.push({ position: currentStandings.length + 1, team_name: "New Team", played: 0, won: 0, drawn: 0, lost: 0, goals_for: 0, goals_against: 0, goal_difference: 0, points: 0 });
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
  const rows = [...document.querySelectorAll("#standingEditorBody tr")].map(row => {
    const value = className => row.querySelector(`.${className}`).value;
    return { id: row.dataset.id || undefined, position: Number(value("pos")), team_name: value("team").trim(), played: Number(value("p")), won: Number(value("w")), drawn: Number(value("d")), lost: Number(value("l")), goals_for: Number(value("gf")), goals_against: Number(value("ga")), goal_difference: Number(row.querySelector(".gd").textContent), points: Number(row.querySelector(".pts").textContent), updated_at: new Date().toISOString() };
  });
  if (rows.some(row => !row.team_name)) return notice("Every row needs a team name.", "error");
  const existing = rows.filter(row => row.id);
  const fresh = rows.filter(row => !row.id).map(({ id, ...row }) => row);
  if (existing.length) { const { error } = await client().from("standings").upsert(existing, { onConflict: "id" }); if (error) return notice(error.message, "error"); }
  if (fresh.length) { const { error } = await client().from("standings").insert(fresh); if (error) return notice(error.message, "error"); }
  notice("Standings updated live.");
  await loadStandings();
}

async function deleteStanding(button) {
  const row = button.closest("tr");
  const id = row.dataset.id;
  if (!id) { row.remove(); return; }
  if (!confirm("Delete this team from the table?")) return;
  const { error } = await client().from("standings").delete().eq("id", id);
  if (error) return notice(error.message, "error");
  notice("Team removed.");
  await loadStandings();
}

async function loadFixtures() {
  const { data, error } = await client().from("fixtures").select("*").order("match_date", { ascending: false });
  if (error) return notice(error.message, "error");
  currentFixtures = data || [];
  const list = document.getElementById("fixtureAdminList");
  list.innerHTML = currentFixtures.length ? currentFixtures.map(item => {
    const score = item.status === "result" ? `${item.home_score ?? "–"} - ${item.away_score ?? "–"}` : statusLabel(item.status);
    return `<article class="admin-list-card"><div class="admin-list-meta"><span>${esc(shortDate(item.match_date))}</span><span>${esc(statusLabel(item.status))}${item.published ? "" : " • Hidden"}</span></div><h3>${esc(item.home_team)} <strong>${esc(score)}</strong> ${esc(item.away_team)}</h3><p>${esc(item.competition || "MPL")} • ${esc(shortTime(item.kickoff_time))}${item.venue ? ` • ${esc(item.venue)}` : ""}</p><div class="admin-list-actions"><button type="button" data-edit-fixture="${esc(item.id)}">Edit</button><button class="danger-text" type="button" data-delete-fixture="${esc(item.id)}">Delete</button></div></article>`;
  }).join("") : '<div class="admin-empty">No fixtures or results yet.</div>';
  list.querySelectorAll("[data-edit-fixture]").forEach(button => button.addEventListener("click", () => editFixture(button.dataset.editFixture)));
  list.querySelectorAll("[data-delete-fixture]").forEach(button => button.addEventListener("click", () => deleteFixture(button.dataset.deleteFixture)));
  updateOverview();
}

function editFixture(id) {
  const item = currentFixtures.find(fixture => fixture.id === id);
  if (!item) return;
  const form = document.getElementById("fixtureForm");
  for (const key of ["id", "competition", "status", "match_date", "home_team", "away_team", "venue", "notes"]) if (form.elements[key]) form.elements[key].value = item[key] || "";
  form.elements.kickoff_time.value = item.kickoff_time ? String(item.kickoff_time).slice(0, 5) : "";
  form.elements.home_score.value = item.home_score ?? "";
  form.elements.away_score.value = item.away_score ?? "";
  form.elements.published.checked = Boolean(item.published);
  form.scrollIntoView({ behavior: "smooth", block: "start" });
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
  if (!form.checkValidity()) return form.reportValidity();
  const data = new FormData(form);
  const status = data.get("status");
  const homeScore = nullableNumber(data.get("home_score"));
  const awayScore = nullableNumber(data.get("away_score"));
  if (status === "result" && (homeScore === null || awayScore === null)) return notice("Enter both scores before saving a result.", "error");
  const payload = { competition: data.get("competition").trim() || "MPL", match_date: data.get("match_date") || null, kickoff_time: data.get("kickoff_time") || null, home_team: data.get("home_team").trim(), away_team: data.get("away_team").trim(), home_score: status === "result" ? homeScore : null, away_score: status === "result" ? awayScore : null, venue: data.get("venue").trim() || null, status, notes: data.get("notes").trim() || null, published: data.get("published") === "on", updated_at: new Date().toISOString() };
  const id = data.get("id");
  const { error } = id ? await client().from("fixtures").update(payload).eq("id", id) : await client().from("fixtures").insert(payload);
  if (error) return notice(error.message, "error");
  notice(id ? "Fixture updated live." : "Fixture added live.");
  resetFixtureForm();
  await loadFixtures();
}

async function deleteFixture(id) {
  if (!confirm("Delete this fixture or result?")) return;
  const { error } = await client().from("fixtures").delete().eq("id", id);
  if (error) return notice(error.message, "error");
  notice("Fixture deleted.");
  await loadFixtures();
}

async function loadNewsGroups() {
  const { data, error } = await client()
    .from("news_groups")
    .select("*")
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    currentNewsGroups = [];
    renderNewsGroupOptions();
    renderNewsGroupAdminList();
    updateOverview();
    return notice("News groups are not installed yet. Run news-groups-migration.sql in Supabase.", "error");
  }

  currentNewsGroups = data || [];
  renderNewsGroupOptions();
  renderNewsGroupAdminList();
  updateOverview();
}

function renderNewsGroupOptions() {
  const postSelect = document.getElementById("newsGroupSelect");
  const filterSelect = document.getElementById("adminNewsGroupFilter");
  const selectedPostGroup = postSelect?.value || "";
  const selectedFilter = filterSelect?.value || "";

  const options = currentNewsGroups.map(group =>
    `<option value="${esc(group.id)}">${esc(group.name)}${group.published ? "" : " (hidden)"}</option>`
  ).join("");

  if (postSelect) {
    postSelect.innerHTML = `<option value="">Uncategorised / Club News</option>${options}`;
    if ([...postSelect.options].some(option => option.value === selectedPostGroup)) postSelect.value = selectedPostGroup;
  }

  if (filterSelect) {
    filterSelect.innerHTML = `<option value="">All groups</option><option value="__uncategorised">Uncategorised</option>${options}`;
    if ([...filterSelect.options].some(option => option.value === selectedFilter)) filterSelect.value = selectedFilter;
  }
}

function renderNewsGroupAdminList() {
  const list = document.getElementById("newsGroupAdminList");
  if (!list) return;

  list.innerHTML = currentNewsGroups.length ? currentNewsGroups.map(group => {
    const postCount = currentNews.filter(post => post.group_id === group.id).length;
    return `<article class="admin-list-card news-group-admin-card">
      <div class="admin-list-meta">
        <span>${group.published ? "Public" : "Hidden"}</span>
        <span>Order ${Number(group.display_order || 0)} • ${postCount} ${postCount === 1 ? "story" : "stories"}</span>
      </div>
      <h3>${esc(group.name)}</h3>
      <p>${esc(group.description || "No description added.")}</p>
      <code>news.html?group=${esc(group.slug)}</code>
      <div class="admin-list-actions">
        <button type="button" data-edit-news-group="${esc(group.id)}">Edit</button>
        <button class="danger-text" type="button" data-delete-news-group="${esc(group.id)}">Delete</button>
      </div>
    </article>`;
  }).join("") : '<div class="admin-empty">No news groups yet. Create Signings, Birthdays, Match Reports or any group the club needs.</div>';

  list.querySelectorAll("[data-edit-news-group]").forEach(button =>
    button.addEventListener("click", () => editNewsGroup(button.dataset.editNewsGroup))
  );
  list.querySelectorAll("[data-delete-news-group]").forEach(button =>
    button.addEventListener("click", () => deleteNewsGroup(button.dataset.deleteNewsGroup))
  );
}

function editNewsGroup(id) {
  const group = currentNewsGroups.find(item => item.id === id);
  if (!group) return;
  const form = document.getElementById("newsGroupForm");
  form.elements.id.value = group.id;
  form.elements.name.value = group.name || "";
  form.elements.slug.value = group.slug || "";
  form.elements.description.value = group.description || "";
  form.elements.display_order.value = group.display_order ?? 0;
  form.elements.published.checked = Boolean(group.published);
  form.elements.slug.dataset.manuallyEdited = "true";
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetNewsGroupForm() {
  const form = document.getElementById("newsGroupForm");
  form.reset();
  form.elements.id.value = "";
  form.elements.display_order.value = 0;
  form.elements.published.checked = true;
  delete form.elements.slug.dataset.manuallyEdited;
}

async function saveNewsGroup(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.checkValidity()) return form.reportValidity();

  const data = new FormData(form);
  const id = data.get("id");
  const payload = {
    name: data.get("name").trim(),
    slug: slugify(data.get("slug") || data.get("name")),
    description: data.get("description").trim() || null,
    display_order: Number(data.get("display_order") || 0),
    published: data.get("published") === "on",
    updated_at: new Date().toISOString()
  };

  if (!payload.slug) return notice("Enter a valid group name or URL slug.", "error");

  const response = id
    ? await client().from("news_groups").update(payload).eq("id", id)
    : await client().from("news_groups").insert(payload);

  if (response.error) return notice(response.error.message, "error");

  if (id) {
    const { error: syncError } = await client()
      .from("news_posts")
      .update({ category: payload.name, updated_at: new Date().toISOString() })
      .eq("group_id", id);
    if (syncError) return notice(syncError.message, "error");
  }

  notice(id ? "News group updated." : "News group created.");
  resetNewsGroupForm();
  await loadNewsGroups();
  await loadNews();
}

async function deleteNewsGroup(id) {
  const group = currentNewsGroups.find(item => item.id === id);
  if (!group) return;
  const postCount = currentNews.filter(post => post.group_id === id).length;
  const message = postCount
    ? `Delete "${group.name}"? ${postCount} assigned ${postCount === 1 ? "story" : "stories"} will move to Uncategorised.`
    : `Delete "${group.name}"?`;
  if (!confirm(message)) return;

  const { error: postError } = await client()
    .from("news_posts")
    .update({ group_id: null, category: "Club News", updated_at: new Date().toISOString() })
    .eq("group_id", id);
  if (postError) return notice(postError.message, "error");

  const { error } = await client().from("news_groups").delete().eq("id", id);
  if (error) return notice(error.message, "error");

  notice("News group deleted. Assigned stories were moved to Uncategorised.");
  await loadNewsGroups();
  await loadNews();
}

async function loadNews() {
  let response = await client()
    .from("news_posts")
    .select("*, news_groups(id,name,slug,published,display_order)")
    .order("created_at", { ascending: false });

  if (response.error) {
    response = await client().from("news_posts").select("*").order("created_at", { ascending: false });
  }
  if (response.error) return notice(response.error.message, "error");

  currentNews = response.data || [];
  renderNewsAdminList();
  renderNewsGroupAdminList();
  updateOverview();
}

function renderNewsAdminList() {
  const list = document.getElementById("newsAdminList");
  if (!list) return;

  const selectedGroup = document.getElementById("adminNewsGroupFilter")?.value || "";
  const visibleNews = currentNews.filter(item => {
    if (!selectedGroup) return true;
    if (selectedGroup === "__uncategorised") return !item.group_id;
    return item.group_id === selectedGroup;
  });

  list.innerHTML = visibleNews.length ? visibleNews.map(item =>
    `<article class="admin-list-card admin-list-card--media">
      ${item.image_url ? `<img src="${esc(item.image_url)}" alt="">` : '<div class="admin-thumb">IAC</div>'}
      <div>
        <div class="admin-list-meta">
          <span>${item.published ? "Published" : "Draft"}</span>
          <span>${esc(newsGroupName(item))}</span>
        </div>
        <h3>${esc(item.title)}</h3>
        <p>${esc(item.excerpt || "No summary added.")}</p>
        <div class="admin-list-actions">
          <button type="button" data-edit-news="${esc(item.id)}">Edit</button>
          <button class="danger-text" type="button" data-delete-news="${esc(item.id)}">Delete</button>
        </div>
      </div>
    </article>`
  ).join("") : '<div class="admin-empty">No news posts match this group.</div>';

  list.querySelectorAll("[data-edit-news]").forEach(button =>
    button.addEventListener("click", () => editNews(button.dataset.editNews))
  );
  list.querySelectorAll("[data-delete-news]").forEach(button =>
    button.addEventListener("click", () => deleteNews(button.dataset.deleteNews))
  );
}

function editNews(id) {
  const item = currentNews.find(post => post.id === id);
  if (!item) return;
  const form = document.getElementById("newsForm");
  for (const key of ["id", "title", "excerpt", "body", "image_url"]) form.elements[key].value = item[key] || "";
  form.elements.group_id.value = item.group_id || "";
  form.elements.published.checked = Boolean(item.published);
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetNewsForm() {
  const form = document.getElementById("newsForm");
  form.reset();
  document.getElementById("newsId").value = "";
  form.elements.group_id.value = "";
}

async function saveNews(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.checkValidity()) return form.reportValidity();

  const data = new FormData(form);
  let imageUrl = data.get("image_url").trim();
  const file = data.get("image_file");
  try {
    if (file?.size) imageUrl = await uploadFile(file, "news");
  } catch (error) {
    return notice(error.message, "error");
  }

  const id = data.get("id");
  const existing = currentNews.find(item => item.id === id);
  const groupId = data.get("group_id") || null;
  const group = currentNewsGroups.find(item => item.id === groupId);
  const published = data.get("published") === "on";

  const payload = {
    title: data.get("title").trim(),
    group_id: groupId,
    category: group?.name || "Club News",
    excerpt: data.get("excerpt").trim(),
    body: data.get("body").trim(),
    image_url: imageUrl || null,
    published,
    published_at: published ? (existing?.published_at || new Date().toISOString()) : null,
    updated_at: new Date().toISOString()
  };

  const { error } = id
    ? await client().from("news_posts").update(payload).eq("id", id)
    : await client().from("news_posts").insert(payload);

  if (error) return notice(error.message, "error");
  notice(id ? "News post updated." : "News post created.");
  resetNewsForm();
  await loadNews();
}

async function deleteNews(id) {
  if (!confirm("Delete this news post?")) return;
  const { error } = await client().from("news_posts").delete().eq("id", id);
  if (error) return notice(error.message, "error");
  notice("News post deleted.");
  await loadNews();
}

function editGallery(id) {
  const item = currentGallery.find(entry => entry.id === id);
  if (!item) return;
  const form = document.getElementById("galleryForm");
  for (const key of ["id", "title", "category", "image_url", "display_order"]) form.elements[key].value = item[key] ?? "";
  form.elements.published.checked = Boolean(item.published);
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}
function resetGalleryForm() { document.getElementById("galleryForm").reset(); document.getElementById("galleryId").value = ""; }

async function saveGallery(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const file = data.get("image_file");
  let imageUrl = data.get("image_url").trim();
  try { if (file?.size) imageUrl = await uploadFile(file, "gallery"); } catch (error) { return notice(error.message, "error"); }
  if (!imageUrl) return notice("Upload an image or paste an image URL.", "error");
  const payload = { title: data.get("title").trim(), category: data.get("category").trim() || "Club", image_url: imageUrl, display_order: Number(data.get("display_order") || 0), published: data.get("published") === "on" };
  const id = data.get("id");
  const { error } = id ? await client().from("gallery_items").update(payload).eq("id", id) : await client().from("gallery_items").insert(payload);
  if (error) return notice(error.message, "error");
  notice(id ? "Gallery item updated." : "Gallery image added.");
  resetGalleryForm();
  await loadGallery();
}
async function deleteGallery(id) { if (!confirm("Delete this gallery item?")) return; const { error } = await client().from("gallery_items").delete().eq("id", id); if (error) return notice(error.message, "error"); notice("Gallery item deleted."); await loadGallery(); }

async function uploadFile(file, folder) {
  const extension = file.name.split(".").pop().toLowerCase();
  const fileName = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const path = `${folder}/${fileName}.${extension}`;
  const bucket = window.IMPERIAL_CMS.storageBucket || "club-media";
  const { error } = await client().storage.from(bucket).upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) throw new Error(error.message);
  const { data } = client().storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

async function loadSettings() {
  const { data, error } = await client().from("site_settings").select("key,value");
  if (error) return notice(error.message, "error");
  const settings = Object.fromEntries((data || []).map(row => [row.key, row.value === true || row.value === "true"]));
  document.getElementById("showStandings").checked = settings.show_standings ?? true;
  document.getElementById("showNews").checked = settings.show_news ?? false;
  document.getElementById("showGallery").checked = settings.show_gallery ?? false;
}

async function saveSettings(event) {
  event.preventDefault();
  const rows = [
    { key: "show_standings", value: document.getElementById("showStandings").checked, updated_at: new Date().toISOString() },
    { key: "show_news", value: document.getElementById("showNews").checked, updated_at: new Date().toISOString() },
    { key: "show_gallery", value: document.getElementById("showGallery").checked, updated_at: new Date().toISOString() }
  ];
  const { error } = await client().from("site_settings").upsert(rows, { onConflict: "key" });
  if (error) return notice(error.message, "error");
  notice("Public visibility updated.");
}

document.addEventListener("DOMContentLoaded", initAdmin);
