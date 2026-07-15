let adminClient = null;
let currentStandings = [];
let currentNews = [];
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
  const el = document.getElementById("adminNotice");
  el.textContent = message;
  el.className = `admin-notice show ${type}`;
  window.clearTimeout(notice.timer);
  notice.timer = window.setTimeout(() => el.classList.remove("show"), 5000);
}

function esc(value = "") {
  return String(value).replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
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
  document.querySelectorAll("[data-admin-tab]").forEach(btn => btn.addEventListener("click", () => showTab(btn.dataset.adminTab)));
  document.getElementById("addStandingRow").addEventListener("click", addStandingRow);
  document.getElementById("saveStandings").addEventListener("click", saveStandings);
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
  const { error } = await client().auth.signInWithPassword({ email: form.get("email"), password: form.get("password") });
  if (error) notice(error.message, "error");
}

function showTab(name) {
  document.querySelectorAll("[data-admin-tab]").forEach(btn => btn.classList.toggle("active", btn.dataset.adminTab === name));
  document.querySelectorAll("[data-admin-panel]").forEach(panel => panel.hidden = panel.dataset.adminPanel !== name);
}

async function loadDashboard() {
  await Promise.all([loadStandings(), loadNews(), loadGallery(), loadSettings()]);
}

async function loadStandings() {
  const { data, error } = await client().from("standings").select("*").order("position");
  if (error) return notice(error.message, "error");
  currentStandings = data || [];
  renderStandingEditor();
}

function renderStandingEditor() {
  const body = document.getElementById("standingEditorBody");
  body.innerHTML = currentStandings.map((row, index) => `
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
      <td><button class="icon-button danger" type="button" data-delete-standing="${row.id || "new"}">×</button></td>
    </tr>`).join("");
  body.querySelectorAll("input").forEach(input => input.addEventListener("input", recalculateStandingRows));
  body.querySelectorAll("[data-delete-standing]").forEach(btn => btn.addEventListener("click", () => deleteStanding(btn)));
  recalculateStandingRows();
}

function addStandingRow() {
  currentStandings.push({ position: currentStandings.length + 1, team_name: "New Team", played: 0, won: 0, drawn: 0, lost: 0, goals_for: 0, goals_against: 0, goal_difference: 0, points: 0 });
  renderStandingEditor();
}

function recalculateStandingRows() {
  document.querySelectorAll("#standingEditorBody tr").forEach(row => {
    const num = cls => Number(row.querySelector(`.${cls}`).value || 0);
    row.querySelector(".gd").textContent = num("gf") - num("ga");
    row.querySelector(".pts").textContent = num("w") * 3 + num("d");
  });
}

async function saveStandings() {
  const rows = [...document.querySelectorAll("#standingEditorBody tr")].map(row => {
    const val = cls => row.querySelector(`.${cls}`).value;
    const item = {
      position: Number(val("pos")), team_name: val("team").trim(), played: Number(val("p")), won: Number(val("w")),
      drawn: Number(val("d")), lost: Number(val("l")), goals_for: Number(val("gf")), goals_against: Number(val("ga")),
      goal_difference: Number(row.querySelector(".gd").textContent), points: Number(row.querySelector(".pts").textContent)
    };
    if (row.dataset.id) item.id = row.dataset.id;
    return item;
  });
  if (rows.some(row => !row.team_name)) return notice("Every row needs a team name.", "error");
  const { error } = await client().from("standings").upsert(rows);
  if (error) return notice(error.message, "error");
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
  loadStandings();
}

async function loadNews() {
  const { data, error } = await client().from("news_posts").select("*").order("created_at", { ascending: false });
  if (error) return notice(error.message, "error");
  currentNews = data || [];
  document.getElementById("newsAdminList").innerHTML = currentNews.length ? currentNews.map(item => `
    <article class="admin-list-item">
      <div>${item.image_url ? `<img src="${esc(item.image_url)}" alt="">` : '<div class="admin-thumb-placeholder">IAC</div>'}</div>
      <div><span class="badge">${item.published ? "Published" : "Draft"}</span><h3>${esc(item.title)}</h3><p>${esc(item.category || "Club News")}</p></div>
      <div class="admin-actions"><button class="button secondary small" data-edit-news="${item.id}">Edit</button><button class="button small danger-button" data-delete-news="${item.id}">Delete</button></div>
    </article>`).join("") : '<p class="muted">No news posts yet.</p>';
  document.querySelectorAll("[data-edit-news]").forEach(btn => btn.addEventListener("click", () => editNews(btn.dataset.editNews)));
  document.querySelectorAll("[data-delete-news]").forEach(btn => btn.addEventListener("click", () => deleteNews(btn.dataset.deleteNews)));
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

function resetNewsForm() { document.getElementById("newsForm").reset(); document.getElementById("newsId").value = ""; }

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
  const payload = {
    title: data.get("title").trim(), category: data.get("category").trim(), excerpt: data.get("excerpt").trim(),
    body: data.get("body").trim(), image_url: imageUrl || null, published: data.get("published") === "on",
    published_at: data.get("published") === "on" ? new Date().toISOString() : null
  };
  const id = data.get("id");
  const query = id ? client().from("news_posts").update(payload).eq("id", id) : client().from("news_posts").insert(payload);
  const { error } = await query;
  if (error) return notice(error.message, "error");
  notice(id ? "News post updated." : "News post created.");
  resetNewsForm();
  loadNews();
}

async function deleteNews(id) {
  if (!confirm("Delete this news post?")) return;
  const { error } = await client().from("news_posts").delete().eq("id", id);
  if (error) return notice(error.message, "error");
  notice("News post deleted.");
  loadNews();
}

async function loadGallery() {
  const { data, error } = await client().from("gallery_items").select("*").order("display_order");
  if (error) return notice(error.message, "error");
  currentGallery = data || [];
  document.getElementById("galleryAdminList").innerHTML = currentGallery.length ? currentGallery.map(item => `
    <article class="admin-list-item">
      <div><img src="${esc(item.image_url)}" alt=""></div>
      <div><span class="badge">${item.published ? "Published" : "Hidden"}</span><h3>${esc(item.title || "Imperial AC")}</h3><p>${esc(item.category || "Club")}</p></div>
      <div class="admin-actions"><button class="button secondary small" data-edit-gallery="${item.id}">Edit</button><button class="button small danger-button" data-delete-gallery="${item.id}">Delete</button></div>
    </article>`).join("") : '<p class="muted">No gallery images yet.</p>';
  document.querySelectorAll("[data-edit-gallery]").forEach(btn => btn.addEventListener("click", () => editGallery(btn.dataset.editGallery)));
  document.querySelectorAll("[data-delete-gallery]").forEach(btn => btn.addEventListener("click", () => deleteGallery(btn.dataset.deleteGallery)));
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
    title: data.get("title").trim(), category: data.get("category").trim(), image_url: imageUrl,
    display_order: Number(data.get("display_order") || 0), published: data.get("published") === "on"
  };
  const id = data.get("id");
  const query = id ? client().from("gallery_items").update(payload).eq("id", id) : client().from("gallery_items").insert(payload);
  const { error } = await query;
  if (error) return notice(error.message, "error");
  notice(id ? "Gallery item updated." : "Gallery image added.");
  resetGalleryForm();
  loadGallery();
}

async function deleteGallery(id) {
  if (!confirm("Delete this gallery item?")) return;
  const { error } = await client().from("gallery_items").delete().eq("id", id);
  if (error) return notice(error.message, "error");
  notice("Gallery item deleted.");
  loadGallery();
}

async function uploadFile(file, folder) {
  const extension = file.name.split(".").pop().toLowerCase();
  const path = `${folder}/${crypto.randomUUID()}.${extension}`;
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
    { key: "show_standings", value: document.getElementById("showStandings").checked },
    { key: "show_news", value: document.getElementById("showNews").checked },
    { key: "show_gallery", value: document.getElementById("showGallery").checked }
  ];
  const { error } = await client().from("site_settings").upsert(rows, { onConflict: "key" });
  if (error) return notice(error.message, "error");
  notice("Public visibility updated. Refresh the public site to see it.");
}

document.addEventListener("DOMContentLoaded", initAdmin);
