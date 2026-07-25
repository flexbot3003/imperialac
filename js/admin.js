let adminClient = null;
let currentStandings = [];
let currentFixtures = [];
let currentNews = [];
let currentNewsGroups = [];
let currentGallery = [];

let activeGalleryUploadForm = null;
let galleryProgressTimers = [];

function configReady() {
  const config = window.IMPERIAL_CMS || {};
  return Boolean(config.supabaseUrl && config.supabaseAnonKey && window.supabase?.createClient);
}

function client() {
  if (!configReady()) return null;
  adminClient ||= window.supabase.createClient(window.IMPERIAL_CMS.supabaseUrl, window.IMPERIAL_CMS.supabaseAnonKey);
  return adminClient;
}

function clearGalleryProgressTimers() {
  galleryProgressTimers.forEach(timer => clearTimeout(timer));
  galleryProgressTimers = [];
}

function getAdminTaskToast() {
  let toast = document.getElementById("adminTaskToast");

  if (toast) return toast;

  toast = document.createElement("div");
  toast.id = "adminTaskToast";
  toast.className = "admin-task-toast";
  toast.hidden = true;
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");

  toast.innerHTML = `
    <span class="admin-task-toast__icon" aria-hidden="true"></span>
    <div>
      <strong class="admin-task-toast__title"></strong>
      <span class="admin-task-toast__message"></span>
    </div>
  `;

  document.body.appendChild(toast);
  return toast;
}

function showAdminTaskToast(
  message,
  type = "loading",
  options = {}
) {
  const toast = getAdminTaskToast();
  const title = toast.querySelector(".admin-task-toast__title");
  const messageElement = toast.querySelector(
    ".admin-task-toast__message"
  );

  const titles = {
    loading: "Please wait",
    success: "Done",
    error: "Something went wrong"
  };

  toast.dataset.type = type;
  title.textContent = titles[type] || "Update";
  messageElement.textContent = message;
  toast.hidden = false;

  clearTimeout(showAdminTaskToast.hideTimer);

  if (!options.persistent) {
    showAdminTaskToast.hideTimer = setTimeout(() => {
      toast.hidden = true;
    }, options.duration || 4500);
  }
}

function startGalleryUploadFeedback(event) {
  const form = event.currentTarget;

  if (!form.checkValidity()) return;

  if (form.dataset.uploadBusy === "true") {
    event.preventDefault();
    event.stopImmediatePropagation();
    return;
  }

  form.dataset.uploadBusy = "true";
  activeGalleryUploadForm = form;

  const button = form.querySelector('button[type="submit"]');

  if (button) {
    button.dataset.originalText ||= button.textContent.trim();
    button.disabled = true;
    button.textContent = "Uploading…";
  }

  clearGalleryProgressTimers();

  showAdminTaskToast(
    "Reviewing the selected image…",
    "loading",
    { persistent: true }
  );

  galleryProgressTimers.push(
    setTimeout(() => {
      if (activeGalleryUploadForm === form) {
        showAdminTaskToast(
          "Uploading the image to the website…",
          "loading",
          { persistent: true }
        );
      }
    }, 500)
  );

  galleryProgressTimers.push(
    setTimeout(() => {
      if (activeGalleryUploadForm === form) {
        showAdminTaskToast(
          "Finalising the gallery update…",
          "loading",
          { persistent: true }
        );
      }
    }, 2500)
  );
}

function finishGalleryUploadFeedback(message, type) {
  if (!activeGalleryUploadForm) return;

  clearGalleryProgressTimers();

  const form = activeGalleryUploadForm;
  const button = form.querySelector('button[type="submit"]');

  delete form.dataset.uploadBusy;

  if (button) {
    button.disabled = false;
    button.textContent =
      button.dataset.originalText || "Save image";
  }

  activeGalleryUploadForm = null;

  showAdminTaskToast(
    message,
    type === "error" ? "error" : "success"
  );
}

function notice(message, type = "success") {
  const element = document.getElementById("adminNotice");
  element.textContent = message;
  element.className = `admin-notice show ${type}`;
  clearTimeout(notice.timer);
  notice.timer = setTimeout(
    () => element.classList.remove("show"),
    5000
  );

  if (activeGalleryUploadForm) {
    finishGalleryUploadFeedback(message, type);
  }
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
  document
    .getElementById("galleryForm")
    .addEventListener(
      "submit",
      startGalleryUploadFeedback,
      true
    );

  document
    .getElementById("galleryForm")
    .addEventListener("submit", saveGallery);
  document.getElementById("resetGalleryForm").addEventListener("click", resetGalleryForm);
  document.getElementById("settingsForm").addEventListener("submit", saveSettings);
}

function setAuthState(session) {
  const isLoggedIn = Boolean(session);

  document.getElementById("loginPanel").hidden = isLoggedIn;
  document.getElementById("dashboard").hidden = !isLoggedIn;
  document.getElementById("loggedInEmail").textContent =
    session?.user?.email || "";

  const topbar = document.getElementById("adminTopbar");
  const topbarActions = document.getElementById("adminTopbarActions");

  if (topbar) {
    topbar.classList.toggle(
      "admin-topbar--logged-out",
      !isLoggedIn
    );
  }

  if (topbarActions) {
    topbarActions.hidden = !isLoggedIn;
  }

  if (isLoggedIn) {
    loadDashboard();
  }
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
  const [teamsResponse, standingsResponse] =
    await Promise.all([
      client()
        .from("teams")
        .select("*")
        .order("is_home_club", { ascending: false })
        .order("team_name", { ascending: true }),

      client()
        .from("standings")
        .select("*")
        .order("position", { ascending: true })
    ]);

  if (teamsResponse.error) {
    return notice(
      `Teams could not be loaded: ${teamsResponse.error.message}`,
      "error"
    );
  }

  if (standingsResponse.error) {
    return notice(
      standingsResponse.error.message,
      "error"
    );
  }

  currentTeams = teamsResponse.data || [];
  currentStandings = standingsResponse.data || [];

  renderStandingEditor();
  updateOverview();
}

function refreshStandingTeamOptions() {
  const selects = [
    ...document.querySelectorAll(
      "#standingEditorBody select.team"
    )
  ];

  const selectedTeamIds = selects
    .map(select => select.value)
    .filter(Boolean);

  selects.forEach(select => {
    [...select.options].forEach(option => {
      if (!option.value) return;

      const selectedElsewhere =
        selectedTeamIds.includes(option.value) &&
        option.value !== select.value;

      option.disabled = selectedElsewhere;
      option.hidden = selectedElsewhere;
    });
  });
}

function renderStandingEditor() {
  const body = document.getElementById("standingEditorBody");
  body.innerHTML = currentStandings.map(row => standingRow(row)).join("");
  body
    .querySelectorAll("input")
    .forEach(input => {
      input.addEventListener(
        "input",
        recalculateStandingRows
      );
    });

  body
    .querySelectorAll("select.team")
    .forEach(select => {
      select.addEventListener(
        "change",
        refreshStandingTeamOptions
      );
    });

  body
    .querySelectorAll("[data-delete-standing]")
    .forEach(button => {
      button.addEventListener(
        "click",
        () => deleteStanding(button)
      );
    });

  recalculateStandingRows();
  refreshStandingTeamOptions();
}

function standingTeamOptions(row = {}) {
  const selectedTeamId =
    String(row.team_id || "");

  const oldTeamName =
    String(row.team_name || "").trim();

  const registeredMatch = currentTeams.find(team => {
    return (
      String(team.id) === selectedTeamId ||
      (
        !selectedTeamId &&
        oldTeamName &&
        String(team.team_name)
          .trim()
          .toLowerCase() ===
        oldTeamName.toLowerCase()
      )
    );
  });

  const effectiveSelectedId =
    registeredMatch?.id || selectedTeamId;

  const placeholderText = oldTeamName &&
    !registeredMatch
      ? `Select replacement for ${oldTeamName}`
      : "Select team";

  const options = currentTeams.map(team => {
    const selected =
      String(team.id) ===
      String(effectiveSelectedId)
        ? " selected"
        : "";

    const code = teamInitials(
      team.team_name,
      team.short_code
    );

    return `
      <option
        value="${esc(team.id)}"
        ${selected}
      >
        ${esc(team.team_name)} (${esc(code)})
      </option>
    `;
  });

  return `
    <option
      value=""
      ${effectiveSelectedId ? "" : "selected"}
    >
      ${esc(placeholderText)}
    </option>

    ${options.join("")}
  `;
}

function standingRow(row = {}) {
  return `
    <tr data-id="${esc(row.id || "")}">
      <td class="standing-auto-position">
        <span
          class="pos-display"
          aria-label="Automatic league position"
        >
          ${row.position ?? currentStandings.length + 1}
        </span>
      </td>

      <td>
        <select class="team" required>
          ${standingTeamOptions(row)}
        </select>
      </td>

      <td class="standing-auto-stat p">
        ${row.played ?? 0}
      </td>

      <td>
        <input
          class="w"
          type="number"
          min="0"
          value="${row.won ?? 0}"
        >
      </td>

      <td>
        <input
          class="d"
          type="number"
          min="0"
          value="${row.drawn ?? 0}"
        >
      </td>

      <td>
        <input
          class="l"
          type="number"
          min="0"
          value="${row.lost ?? 0}"
        >
      </td>

      <td>
        <input
          class="gf"
          type="number"
          min="0"
          value="${row.goals_for ?? 0}"
        >
      </td>

      <td>
        <input
          class="ga"
          type="number"
          min="0"
          value="${row.goals_against ?? 0}"
        >
      </td>

      <td class="standing-auto-stat gd">
        ${row.goal_difference ?? 0}
      </td>

      <td class="standing-auto-stat pts">
        ${row.points ?? 0}
      </td>

      <td>
        <button
          class="icon-button danger"
          type="button"
          data-delete-standing
          aria-label="Delete team"
        >
          ×
        </button>
      </td>
    </tr>
  `;
}

function addStandingRow() {
  if (!currentTeams.length) {
    return notice(
      "Add a team under Teams & Logos first.",
      "error"
    );
  }

  currentStandings.push({
    position: currentStandings.length + 1,
    team_id: "",
    team_name: "",
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
  document
    .querySelectorAll("#standingEditorBody tr")
    .forEach(row => {
      const numberValue = className => {
        const input = row.querySelector(`.${className}`);
        return Math.max(0, Number(input?.value || 0));
      };

      const won = numberValue("w");
      const drawn = numberValue("d");
      const lost = numberValue("l");
      const goalsFor = numberValue("gf");
      const goalsAgainst = numberValue("ga");

      const played = won + drawn + lost;
      const goalDifference = goalsFor - goalsAgainst;
      const points = won * 3 + drawn;

      row.querySelector(".p").textContent =
        String(played);

      row.querySelector(".gd").textContent =
        String(goalDifference);

      row.querySelector(".pts").textContent =
        String(points);
    });
}

async function saveStandings() {
  const button =
    document.getElementById("saveStandings");

  if (button?.dataset.saveBusy === "true") return;

  recalculateStandingRows();

  const editorRows = [
    ...document.querySelectorAll(
      "#standingEditorBody tr"
    )
  ];

  const previousPositions = new Map(
    currentStandings
      .filter(row => row.id)
      .map(row => [
        String(row.id),
        Number(row.position)
      ])
  );

  let rows = editorRows.map(row => {
    const inputValue = className =>
      row.querySelector(`.${className}`)?.value ?? "";

    const teamId =
      String(inputValue("team")).trim();

    const team = currentTeams.find(
      item => String(item.id) === teamId
    );

    const id = row.dataset.id || undefined;

    return {
      id,
      team_id: teamId || null,
      team_name: team?.team_name || "",

      played: Number(
        row.querySelector(".p").textContent
      ),

      won: Number(inputValue("w")),
      drawn: Number(inputValue("d")),
      lost: Number(inputValue("l")),
      goals_for: Number(inputValue("gf")),
      goals_against: Number(inputValue("ga")),

      goal_difference: Number(
        row.querySelector(".gd").textContent
      ),

      points: Number(
        row.querySelector(".pts").textContent
      ),

      previous_position: id
        ? previousPositions.get(String(id)) ?? null
        : null,

      updated_at: new Date().toISOString()
    };
  });

  if (rows.some(row => !row.team_id)) {
    return notice(
      "Select a registered team for every row.",
      "error"
    );
  }

  const teamIds = rows.map(row => row.team_id);

  if (new Set(teamIds).size !== teamIds.length) {
    return notice(
      "The same team cannot appear twice.",
      "error"
    );
  }

  rows.sort((a, b) => {
    return (
      b.points - a.points ||
      b.goal_difference - a.goal_difference ||
      b.goals_for - a.goals_for ||
      a.team_name.localeCompare(
        b.team_name,
        undefined,
        { sensitivity: "base" }
      )
    );
  });

  rows = rows.map((row, index) => ({
    ...row,
    position: index + 1
  }));

  const existing =
    rows.filter(row => row.id);

  const fresh = rows
    .filter(row => !row.id)
    .map(({ id, ...row }) => row);

  const controls = [
    ...document.querySelectorAll(
      "#standingEditorBody input, " +
      "#standingEditorBody select, " +
      "#standingEditorBody button"
    )
  ];

  if (button) {
    button.dataset.saveBusy = "true";
    button.dataset.originalText ||=
      button.textContent.trim();

    button.disabled = true;
    button.textContent = "Saving…";
  }

  controls.forEach(control => {
    control.disabled = true;
  });

  showAdminTaskToast(
    "Saving standings and calculating league positions…",
    "loading",
    { persistent: true }
  );

  try {
    if (existing.length) {
      const { error } = await client()
        .from("standings")
        .upsert(existing, {
          onConflict: "id"
        });

      if (error) throw new Error(error.message);
    }

    if (fresh.length) {
      const { error } = await client()
        .from("standings")
        .insert(fresh);

      if (error) throw new Error(error.message);
    }

    showAdminTaskToast(
      "Standings saved and positions updated.",
      "success"
    );

    notice("Standings updated live.");

    await loadStandings();
  } catch (error) {
    showAdminTaskToast(
      error.message ||
        "Standings could not be saved.",
      "error"
    );

    notice(
      error.message ||
        "Standings could not be saved.",
      "error"
    );
  } finally {
    controls.forEach(control => {
      control.disabled = false;
    });

    if (button) {
      button.dataset.saveBusy = "false";
      button.disabled = false;

      button.textContent =
        button.dataset.originalText ||
        "Save standings live";
    }
  }
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

function fixtureTeamById(id) {
  return currentTeams.find(
    team => String(team.id) === String(id || "")
  ) || null;
}

function fixtureTeamIdFromName(name) {
  const normalised = String(name || "")
    .trim()
    .toLowerCase();

  return currentTeams.find(
    team =>
      String(team.team_name || "")
        .trim()
        .toLowerCase() === normalised
  )?.id || "";
}

function fixtureTeamOptions(selectedId = "") {
  const options = currentTeams.map(team => {
    const selected =
      String(team.id) === String(selectedId)
        ? " selected"
        : "";

    const code = teamInitials(
      team.team_name,
      team.short_code
    );

    return `
      <option value="${esc(team.id)}"${selected}>
        ${esc(team.team_name)} (${esc(code)})
      </option>
    `;
  });

  return `
    <option value=""${selectedId ? "" : " selected"}>
      Select team
    </option>

    ${options.join("")}
  `;
}

function refreshFixtureTeamOptions() {
  const form = document.getElementById("fixtureForm");

  if (!form) return;

  const homeSelect = form.elements.home_team_id;
  const awaySelect = form.elements.away_team_id;

  if (!homeSelect || !awaySelect) return;

  [...homeSelect.options].forEach(option => {
    if (!option.value) return;

    const unavailable =
      option.value === awaySelect.value &&
      option.value !== homeSelect.value;

    option.disabled = unavailable;
    option.hidden = unavailable;
  });

  [...awaySelect.options].forEach(option => {
    if (!option.value) return;

    const unavailable =
      option.value === homeSelect.value &&
      option.value !== awaySelect.value;

    option.disabled = unavailable;
    option.hidden = unavailable;
  });
}

function populateFixtureTeamSelects(
  homeTeamId = "",
  awayTeamId = ""
) {
  const form = document.getElementById("fixtureForm");

  if (!form) return;

  const homeSelect = form.elements.home_team_id;
  const awaySelect = form.elements.away_team_id;

  if (!homeSelect || !awaySelect) return;

  homeSelect.innerHTML =
    fixtureTeamOptions(homeTeamId);

  awaySelect.innerHTML =
    fixtureTeamOptions(awayTeamId);

  homeSelect.value = homeTeamId || "";
  awaySelect.value = awayTeamId || "";

  refreshFixtureTeamOptions();

  for (const select of [homeSelect, awaySelect]) {
    if (select.dataset.fixtureTeamListener === "true") {
      continue;
    }

    select.dataset.fixtureTeamListener = "true";

    select.addEventListener(
      "change",
      refreshFixtureTeamOptions
    );
  }
}

async function loadFixtures() {
  const [teamsResponse, fixturesResponse] =
    await Promise.all([
      client()
        .from("teams")
        .select("*")
        .order("is_home_club", { ascending: false })
        .order("team_name", { ascending: true }),

      client()
        .from("fixtures")
        .select("*")
        .order("match_date", { ascending: false })
    ]);

  if (teamsResponse.error) {
    return notice(
      `Teams could not be loaded: ${teamsResponse.error.message}`,
      "error"
    );
  }

  if (fixturesResponse.error) {
    return notice(
      fixturesResponse.error.message,
      "error"
    );
  }

  currentTeams = teamsResponse.data || [];
  currentFixtures = fixturesResponse.data || [];

  const form = document.getElementById("fixtureForm");

  populateFixtureTeamSelects(
    form?.elements.home_team_id?.value || "",
    form?.elements.away_team_id?.value || ""
  );

  const list =
    document.getElementById("fixtureAdminList");

  list.innerHTML = currentFixtures.length
    ? currentFixtures.map(item => {
        const score = item.status === "result"
          ? `${item.home_score ?? "–"} - ${item.away_score ?? "–"}`
          : statusLabel(item.status);

        return `
          <article class="admin-list-card">
            <div class="admin-list-meta">
              <span>${esc(shortDate(item.match_date))}</span>

              <span>
                ${esc(statusLabel(item.status))}
                ${item.published ? "" : " • Hidden"}
              </span>
            </div>

            <h3>
              ${esc(item.home_team)}
              <strong>${esc(score)}</strong>
              ${esc(item.away_team)}
            </h3>

            <p>
              ${esc(item.competition || "MPL")}
              • ${esc(shortTime(item.kickoff_time))}
              ${item.venue ? ` • ${esc(item.venue)}` : ""}
            </p>

            <div class="admin-list-actions">
              <button
                type="button"
                data-edit-fixture="${esc(item.id)}"
              >
                Edit
              </button>

              <button
                class="danger-text"
                type="button"
                data-delete-fixture="${esc(item.id)}"
              >
                Delete
              </button>
            </div>
          </article>
        `;
      }).join("")
    : '<div class="admin-empty">No fixtures or results yet.</div>';

  list
    .querySelectorAll("[data-edit-fixture]")
    .forEach(button => {
      button.addEventListener("click", () => {
        editFixture(button.dataset.editFixture);
      });
    });

  list
    .querySelectorAll("[data-delete-fixture]")
    .forEach(button => {
      button.addEventListener("click", () => {
        deleteFixture(button.dataset.deleteFixture);
      });
    });

  updateOverview();
}

function editFixture(id) {
  const item = currentFixtures.find(
    fixture => fixture.id === id
  );

  if (!item) return;

  const form = document.getElementById("fixtureForm");

  for (const key of [
    "id",
    "competition",
    "status",
    "match_date",
    "venue",
    "notes"
  ]) {
    if (form.elements[key]) {
      form.elements[key].value = item[key] || "";
    }
  }

  const homeTeamId =
    item.home_team_id ||
    fixtureTeamIdFromName(item.home_team);

  const awayTeamId =
    item.away_team_id ||
    fixtureTeamIdFromName(item.away_team);

  populateFixtureTeamSelects(
    homeTeamId,
    awayTeamId
  );

  form.elements.kickoff_time.value =
    item.kickoff_time
      ? String(item.kickoff_time).slice(0, 5)
      : "";

  form.elements.home_score.value =
    item.home_score ?? "";

  form.elements.away_score.value =
    item.away_score ?? "";

  form.elements.published.checked =
    Boolean(item.published);

  form.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function resetFixtureForm() {
  const form = document.getElementById("fixtureForm");

  form.reset();
  form.elements.id.value = "";
  form.elements.competition.value = "MPL";
  form.elements.status.value = "upcoming";
  form.elements.published.checked = true;

  const homeClub = currentTeams.find(
    team => team.is_home_club
  );

  populateFixtureTeamSelects(
    homeClub?.id || "",
    ""
  );
}

async function saveFixture(event) {
  event.preventDefault();

  const form = event.currentTarget;

  if (!form.checkValidity()) {
    return form.reportValidity();
  }

  if (form.dataset.saveBusy === "true") return;

  const data = new FormData(form);
  const status = data.get("status");

  const homeTeamId =
    String(data.get("home_team_id") || "");

  const awayTeamId =
    String(data.get("away_team_id") || "");

  const homeTeam = fixtureTeamById(homeTeamId);
  const awayTeam = fixtureTeamById(awayTeamId);

  if (!homeTeam || !awayTeam) {
    return notice(
      "Select both teams from Teams & Logos.",
      "error"
    );
  }

  if (homeTeamId === awayTeamId) {
    return notice(
      "A team cannot play against itself.",
      "error"
    );
  }

  const homeScore =
    nullableNumber(data.get("home_score"));

  const awayScore =
    nullableNumber(data.get("away_score"));

  if (
    status === "result" &&
    (homeScore === null || awayScore === null)
  ) {
    return notice(
      "Enter both scores before saving a result.",
      "error"
    );
  }

  const payload = {
    competition:
      String(data.get("competition") || "").trim() ||
      "MPL",

    match_date:
      data.get("match_date") || null,

    kickoff_time:
      data.get("kickoff_time") || null,

    home_team_id: homeTeam.id,
    away_team_id: awayTeam.id,

    home_team: homeTeam.team_name,
    away_team: awayTeam.team_name,

    home_score:
      status === "result" ? homeScore : null,

    away_score:
      status === "result" ? awayScore : null,

    venue:
      String(data.get("venue") || "").trim() ||
      null,

    status,

    notes:
      String(data.get("notes") || "").trim() ||
      null,

    published:
      data.get("published") === "on",

    updated_at:
      new Date().toISOString()
  };

  const id = String(data.get("id") || "");
  const button = form.querySelector(
    'button[type="submit"]'
  );

  form.dataset.saveBusy = "true";

  if (button) {
    button.dataset.originalText ||=
      button.textContent.trim();

    button.disabled = true;
    button.textContent = "Saving…";
  }

  showAdminTaskToast(
    "Saving the confirmed fixture…",
    "loading",
    { persistent: true }
  );

  try {
    const { error } = id
      ? await client()
          .from("fixtures")
          .update(payload)
          .eq("id", id)
      : await client()
          .from("fixtures")
          .insert(payload);

    if (error) throw new Error(error.message);

    showAdminTaskToast(
      id
        ? "Fixture updated successfully."
        : "Fixture added successfully.",
      "success"
    );

    notice(
      id
        ? "Fixture updated live."
        : "Fixture added live."
    );

    resetFixtureForm();
    await loadFixtures();
  } catch (error) {
    showAdminTaskToast(
      error.message || "The fixture could not be saved.",
      "error"
    );

    notice(
      error.message || "The fixture could not be saved.",
      "error"
    );
  } finally {
    form.dataset.saveBusy = "false";

    if (button) {
      button.disabled = false;
      button.textContent =
        button.dataset.originalText ||
        "Save fixture";
    }
  }
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

async function loadGallery() {
  const { data, error } = await client()
    .from("gallery_items")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) {
    console.error("Gallery loading failed:", error);
    notice(`Gallery could not be loaded: ${error.message}`, "error");
    return;
  }

  currentGallery = data || [];

  const list = document.getElementById("galleryAdminList");

  if (!list) {
    console.error("galleryAdminList element was not found.");
    return;
  }

  list.innerHTML = currentGallery.length
    ? currentGallery.map(item => `
        <article class="admin-list-card">
          ${
            item.image_url
              ? `<img
                  src="${esc(item.image_url)}"
                  alt="${esc(item.title || "Gallery image")}"
                  loading="lazy"
                  style="width:100%;max-height:220px;object-fit:cover;border-radius:0.5rem;margin-bottom:0.85rem;"
                >`
              : ""
          }

          <div class="admin-list-meta">
            <span>${esc(item.category || "Club")}</span>
            <span>
              Order ${Number(item.display_order || 0)}
              ${item.published ? "" : " • Hidden"}
            </span>
          </div>

          <h3>${esc(item.title || "Untitled gallery image")}</h3>

          <div class="admin-list-actions">
            <button
              type="button"
              data-edit-gallery="${esc(item.id)}"
            >
              Edit
            </button>

            <button
              class="danger-text"
              type="button"
              data-delete-gallery="${esc(item.id)}"
            >
              Delete
            </button>
          </div>
        </article>
      `).join("")
    : '<div class="admin-empty">No gallery items yet.</div>';

  list
    .querySelectorAll("[data-edit-gallery]")
    .forEach(button => {
      button.addEventListener("click", () => {
        editGallery(button.dataset.editGallery);
      });
    });

  list
    .querySelectorAll("[data-delete-gallery]")
    .forEach(button => {
      button.addEventListener("click", () => {
        deleteGallery(button.dataset.deleteGallery);
      });
    });

  updateOverview();
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

let currentTeams = [];

function teamInitials(teamName, savedCode = "") {
  const supplied = String(savedCode || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 5);

  if (supplied) return supplied;

  const generated = String(teamName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word.charAt(0))
    .join("")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 5);

  return generated || "FC";
}

function clampTeamLogoValue(value, minimum, maximum, fallback) {
  const number = Number(value);

  if (!Number.isFinite(number)) return fallback;

  return Math.min(maximum, Math.max(minimum, number));
}

function readTeamLogoAdjustment(source = {}) {
  const isForm = Boolean(source?.elements);

  const scaleValue = isForm
    ? source.elements.logo_scale?.value
    : (source.logo_scale ?? source.scale);

  const offsetXValue = isForm
    ? source.elements.logo_offset_x?.value
    : (source.logo_offset_x ?? source.offsetX);

  const offsetYValue = isForm
    ? source.elements.logo_offset_y?.value
    : (source.logo_offset_y ?? source.offsetY);

  return {
    scale: clampTeamLogoValue(
      scaleValue,
      50,
      250,
      100
    ),

    offsetX: clampTeamLogoValue(
      offsetXValue,
      -40,
      40,
      0
    ),

    offsetY: clampTeamLogoValue(
      offsetYValue,
      -40,
      40,
      0
    )
  };
}

function teamLogoTransform(source = {}) {
  const adjustment = readTeamLogoAdjustment(source);

  return [
    `translate(${adjustment.offsetX}%,`,
    `${adjustment.offsetY}%)`,
    `scale(${adjustment.scale / 100})`
  ].join(" ");
}

function updateTeamLogoControlLabels(form) {
  const adjustment = readTeamLogoAdjustment(form);

  const scaleOutput =
    document.getElementById("teamLogoScaleValue");

  const offsetXOutput =
    document.getElementById("teamLogoOffsetXValue");

  const offsetYOutput =
    document.getElementById("teamLogoOffsetYValue");

  if (scaleOutput) {
    scaleOutput.textContent = `${adjustment.scale}%`;
  }

  if (offsetXOutput) {
    offsetXOutput.textContent =
      `${adjustment.offsetX > 0 ? "+" : ""}` +
      `${adjustment.offsetX}%`;
  }

  if (offsetYOutput) {
    offsetYOutput.textContent =
      `${adjustment.offsetY > 0 ? "+" : ""}` +
      `${adjustment.offsetY}%`;
  }
}

function refreshTeamLogoPreview(form) {
  const preview = document.getElementById("teamLogoPreview");

  if (!preview) return;

  const existingImage = preview.querySelector("img");

  const imageUrl =
    existingImage?.src ||
    form.elements.existing_logo_url?.value ||
    "";

  const code = teamInitials(
    form.elements.team_name?.value,
    form.elements.short_code?.value
  );

  updateTeamLogoControlLabels(form);

  updateTeamLogoPreview(
    imageUrl,
    code,
    readTeamLogoAdjustment(form)
  );
}

function teamBadgeMarkup(team) {
  const code = teamInitials(team.team_name, team.short_code);

  if (!team.logo_url) {
    return `
      <div class="team-admin-badge team-admin-badge--fallback">
        ${esc(code)}
      </div>
    `;
  }

  return `
    <div class="team-admin-badge">
      <img
        src="${esc(team.logo_url)}"
        alt="${esc(team.team_name)} badge"
        loading="lazy"
        data-team-logo
        style="transform: ${teamLogoTransform(team)};"
      >
      <span hidden>${esc(code)}</span>
    </div>
  `;
}

async function loadTeams() {
  const list = document.getElementById("teamAdminList");
  if (!list) return;

  list.innerHTML =
    '<div class="admin-empty">Loading teams…</div>';

  const { data, error } = await client()
    .from("teams")
    .select("*")
    .order("is_home_club", { ascending: false })
    .order("team_name", { ascending: true });

  if (error) {
    list.innerHTML =
      '<div class="admin-empty">Teams could not be loaded.</div>';
    return notice(error.message, "error");
  }

  currentTeams = data || [];

  list.innerHTML = currentTeams.length
    ? currentTeams.map(team => `
        <article class="admin-list-card team-admin-card">
          ${teamBadgeMarkup(team)}

          <div class="team-admin-card__content">
            <div class="admin-list-meta">
              <span>${esc(
                teamInitials(team.team_name, team.short_code)
              )}</span>

              <span>
                ${team.is_home_club ? "Home club" : "Rival club"}
                ${team.published ? "" : " • Hidden"}
              </span>
            </div>

            <h3>${esc(team.team_name)}</h3>

            <div class="admin-list-actions">
              <button
                data-edit-team="${esc(team.id)}"
                type="button"
              >
                Edit
              </button>

              <button
                class="danger-text"
                data-delete-team="${esc(team.id)}"
                type="button"
                ${team.is_home_club ? "disabled" : ""}
              >
                Delete
              </button>
            </div>
          </div>
        </article>
      `).join("")
    : '<div class="admin-empty">No teams have been added.</div>';

  list
    .querySelectorAll("[data-team-logo]")
    .forEach(image => {
      image.addEventListener("error", () => {
        image.hidden = true;
        image.nextElementSibling.hidden = false;
      });
    });

  list
    .querySelectorAll("[data-edit-team]")
    .forEach(button => {
      button.addEventListener("click", () => {
        editTeam(button.dataset.editTeam);
      });
    });

  list
    .querySelectorAll("[data-delete-team]")
    .forEach(button => {
      button.addEventListener("click", () => {
        deleteTeam(button.dataset.deleteTeam);
      });
    });
}

function updateTeamLogoPreview(
  url,
  code = "LOGO",
  settings = {}
) {
  const preview = document.getElementById("teamLogoPreview");
  if (!preview) return;

  if (!url) {
    preview.innerHTML = `<span>${esc(code || "LOGO")}</span>`;
    return;
  }

  preview.innerHTML = `
    <img
      src="${esc(url)}"
      alt="Team badge preview"
      style="transform: ${teamLogoTransform(settings)};"
    >
  `;
}

function editTeam(id) {
  const team = currentTeams.find(item => item.id === id);
  if (!team) return;

  const form = document.getElementById("teamForm");

  form.elements.id.value = team.id;
  form.elements.team_name.value = team.team_name || "";
  form.elements.short_code.value = team.short_code || "";
  form.elements.existing_logo_url.value = team.logo_url || "";
  form.elements.is_home_club.checked =
    Boolean(team.is_home_club);
  form.elements.published.checked =
    Boolean(team.published);

  form.elements.logo_scale.value =
    team.logo_scale ?? 100;

  form.elements.logo_offset_x.value =
    team.logo_offset_x ?? 0;

  form.elements.logo_offset_y.value =
    team.logo_offset_y ?? 0;

  updateTeamLogoControlLabels(form);

  updateTeamLogoPreview(
    team.logo_url,
    teamInitials(team.team_name, team.short_code),
    team
  );

  form.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function resetTeamForm() {
  const form = document.getElementById("teamForm");
  if (!form) return;

  form.reset();
  form.elements.id.value = "";
  form.elements.existing_logo_url.value = "";
  form.elements.published.checked = true;

  form.elements.logo_scale.value = 100;
  form.elements.logo_offset_x.value = 0;
  form.elements.logo_offset_y.value = 0;

  updateTeamLogoControlLabels(form);

  updateTeamLogoPreview(
    "",
    "LOGO",
    readTeamLogoAdjustment(form)
  );
}

async function saveTeam(event) {
  event.preventDefault();

  const form = event.currentTarget;
  if (!form.checkValidity()) return form.reportValidity();

  if (form.dataset.saveBusy === "true") return;

  const data = new FormData(form);
  const teamName = String(data.get("team_name") || "").trim();
  const shortCode = teamInitials(
    teamName,
    data.get("short_code")
  );

  const file = data.get("logo_file");

  const adjustment =
    readTeamLogoAdjustment(form);

  let logoUrl = String(
    data.get("existing_logo_url") || ""
  ).trim();

  if (!teamName) {
    return notice("Enter the team name.", "error");
  }

  if (!/^[A-Z0-9]{1,5}$/.test(shortCode)) {
    return notice(
      "The short code must contain 1 to 5 letters or numbers.",
      "error"
    );
  }

  if (file?.size) {
    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/webp"
    ];

    if (!allowedTypes.includes(file.type)) {
      return notice(
        "Use a PNG, JPG or WebP badge.",
        "error"
      );
    }

    if (file.size > 2 * 1024 * 1024) {
      return notice(
        "The team badge must be smaller than 2 MB.",
        "error"
      );
    }
  }

  const button = form.querySelector(
    'button[type="submit"]'
  );

  form.dataset.saveBusy = "true";

  if (button) {
    button.dataset.originalText ||= button.textContent.trim();
    button.disabled = true;
    button.textContent = "Saving…";
  }

  try {
    if (file?.size) {
      showAdminTaskToast(
        "Uploading the team badge…",
        "loading",
        { persistent: true }
      );

      logoUrl = await uploadFile(file, "team-logos");
    }

    showAdminTaskToast(
      "Saving the team details…",
      "loading",
      { persistent: true }
    );

    const payload = {
      team_name: teamName,
      short_code: shortCode,
      logo_url: logoUrl || null,
      logo_scale: adjustment.scale,
      logo_offset_x: adjustment.offsetX,
      logo_offset_y: adjustment.offsetY,
      is_home_club:
        data.get("is_home_club") === "on",
      published:
        data.get("published") === "on",
      updated_at: new Date().toISOString()
    };

    const id = String(data.get("id") || "");

    const { error } = id
      ? await client()
          .from("teams")
          .update(payload)
          .eq("id", id)
      : await client()
          .from("teams")
          .insert(payload);

    if (error) throw new Error(error.message);

    showAdminTaskToast(
      id
        ? "Team updated successfully."
        : "Team added successfully.",
      "success"
    );

    resetTeamForm();
    await loadTeams();
  } catch (error) {
    showAdminTaskToast(
      error.message || "The team could not be saved.",
      "error"
    );

    notice(
      error.message || "The team could not be saved.",
      "error"
    );
  } finally {
    form.dataset.saveBusy = "false";

    if (button) {
      button.disabled = false;
      button.textContent =
        button.dataset.originalText || "Save team";
    }
  }
}

async function deleteTeam(id) {
  const team = currentTeams.find(item => item.id === id);
  if (!team) return;

  if (team.is_home_club) {
    return notice(
      "Imperial Athletic Club cannot be deleted.",
      "error"
    );
  }

  if (!confirm(`Delete ${team.team_name}?`)) return;

  const { error } = await client()
    .from("teams")
    .delete()
    .eq("id", id);

  if (error) return notice(error.message, "error");

  notice("Team removed.");
  await loadTeams();
}

function setupTeamAdmin() {
  const form = document.getElementById("teamForm");
  const resetButton =
    document.getElementById("resetTeamForm");
  const tab = document.querySelector(
    '[data-admin-tab="teams"]'
  );

  form?.addEventListener("submit", saveTeam);
  resetButton?.addEventListener("click", resetTeamForm);

  tab?.addEventListener("click", () => {
    loadTeams();
  });

  document
    .querySelector('[data-admin-tab="standings"]')
    ?.addEventListener("click", () => {
      loadStandings();
    });

  form?.elements.short_code?.addEventListener(
    "input",
    event => {
      event.target.value = event.target.value
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 5);
    }
  );

  form?.elements.logo_file?.addEventListener(
    "change",
    event => {
      const file = event.target.files?.[0];

      if (!file) {
        const existing =
          form.elements.existing_logo_url.value;

        updateTeamLogoPreview(
          existing,
          teamInitials(
            form.elements.team_name.value,
            form.elements.short_code.value
          ),
          readTeamLogoAdjustment(form)
        );

        return;
      }

      const previewUrl = URL.createObjectURL(file);

      updateTeamLogoPreview(
        previewUrl,
        teamInitials(
          form.elements.team_name.value,
          form.elements.short_code.value
        ),
        readTeamLogoAdjustment(form)
      );
    }
  );

  form?.elements.team_name?.addEventListener(
    "input",
    () => {
      if (
        !form.elements.logo_file.files?.length &&
        !form.elements.existing_logo_url.value
      ) {
        updateTeamLogoPreview(
          "",
          teamInitials(
            form.elements.team_name.value,
            form.elements.short_code.value
          ),
          readTeamLogoAdjustment(form)
        );
      }
    }
  );

  const adjustmentInputs = [
    form?.elements.logo_scale,
    form?.elements.logo_offset_x,
    form?.elements.logo_offset_y
  ].filter(Boolean);

  adjustmentInputs.forEach(input => {
    input.addEventListener("input", () => {
      refreshTeamLogoPreview(form);
    });
  });

  document
    .getElementById("resetTeamLogoAdjustments")
    ?.addEventListener("click", () => {
      form.elements.logo_scale.value = 100;
      form.elements.logo_offset_x.value = 0;
      form.elements.logo_offset_y.value = 0;

      refreshTeamLogoPreview(form);
    });

  updateTeamLogoControlLabels(form);
}

let currentPartners = [];

function partnerInitials(name) {
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

function normalisePartnerUrl(value) {
  const raw = String(value || "").trim();

  if (!raw) return null;

  const prepared = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw)
    ? raw
    : `https://${raw}`;

  const url = new URL(prepared);

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error(
      "Partner links must use http:// or https://."
    );
  }

  return url.toString();
}

function clampPartnerLogoValue(value, minimum, maximum) {
  return Math.min(
    maximum,
    Math.max(minimum, Number(value) || 0)
  );
}

function partnerLogoSettings(partner = {}) {
  return {
    scale: clampPartnerLogoValue(
      partner.logo_scale ?? partner.scale ?? 100,
      50,
      250
    ),

    x: clampPartnerLogoValue(
      partner.logo_offset_x ?? partner.x ?? 0,
      -40,
      40
    ),

    y: clampPartnerLogoValue(
      partner.logo_offset_y ?? partner.y ?? 0,
      -40,
      40
    )
  };
}

function partnerLogoTransform(partner = {}) {
  const settings = partnerLogoSettings(partner);

  return [
    `translate(${settings.x}%, ${settings.y}%)`,
    `scale(${settings.scale / 100})`
  ].join(" ");
}

function readPartnerLogoAdjustment(form) {
  return {
    logo_scale: clampPartnerLogoValue(
      form.elements.logo_scale?.value ?? 100,
      50,
      250
    ),

    logo_offset_x: clampPartnerLogoValue(
      form.elements.logo_offset_x?.value ?? 0,
      -40,
      40
    ),

    logo_offset_y: clampPartnerLogoValue(
      form.elements.logo_offset_y?.value ?? 0,
      -40,
      40
    )
  };
}

function updatePartnerLogoControlLabels(form) {
  if (!form) return;

  const settings = readPartnerLogoAdjustment(form);

  const scaleLabel = form.querySelector(
    "[data-partner-scale-label]"
  );

  const xLabel = form.querySelector(
    "[data-partner-x-label]"
  );

  const yLabel = form.querySelector(
    "[data-partner-y-label]"
  );

  if (scaleLabel) {
    scaleLabel.textContent =
      `${settings.logo_scale}%`;
  }

  if (xLabel) {
    xLabel.textContent =
      String(settings.logo_offset_x);
  }

  if (yLabel) {
    yLabel.textContent =
      String(settings.logo_offset_y);
  }
}

function partnerLogoMarkup(partner) {
  const fallback = partnerInitials(partner.name);

  if (!partner.logo_url) {
    return `
      <div
        class="team-admin-badge team-admin-badge--fallback"
      >
        ${esc(fallback)}
      </div>
    `;
  }

  return `
    <div class="team-admin-badge">
      <img
        src="${esc(partner.logo_url)}"
        alt="${esc(partner.name)} logo"
        loading="lazy"
        data-partner-logo
        style="transform: ${partnerLogoTransform(partner)};"
      >
      <span hidden>${esc(fallback)}</span>
    </div>
  `;
}

async function loadPartners() {
  const list =
    document.getElementById("partnerAdminList");

  if (!list) return;

  list.innerHTML =
    '<div class="admin-empty">Loading partners…</div>';

  const { data, error } = await client()
    .from("partners")
    .select("*")
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    list.innerHTML =
      '<div class="admin-empty">Partners could not be loaded.</div>';

    return notice(error.message, "error");
  }

  currentPartners = data || [];

  const visiblePartners =
    currentPartners.filter(partner => partner.published);

  const homepageIds = new Set(
    visiblePartners
      .slice(0, 4)
      .map(partner => String(partner.id))
  );

  list.innerHTML = currentPartners.length
    ? currentPartners.map(partner => {
        const visibleIndex = visiblePartners.findIndex(
          item => item.id === partner.id
        );

        const homepagePosition =
          partner.published &&
          homepageIds.has(String(partner.id))
            ? visibleIndex + 1
            : null;

        return `
          <article class="admin-list-card team-admin-card">
            ${partnerLogoMarkup(partner)}

            <div class="team-admin-card__content">
              <div class="admin-list-meta partner-status-list">
                <span>
                  Order ${Number(partner.display_order || 0)}
                </span>

                <span>
                  ${
                    !partner.published
                      ? "Hidden"
                      : homepagePosition
                        ? `Homepage #${homepagePosition}`
                        : "Directory only"
                  }
                </span>

                <span>
                  ${partner.website_url ? "Linked" : "No link"}
                </span>
              </div>

              <h3>${esc(partner.name)}</h3>

              ${
                partner.website_url
                  ? `
                    <p>
                      <a
                        href="${esc(partner.website_url)}"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open partner website ↗
                      </a>
                    </p>
                  `
                  : "<p>No website link added.</p>"
              }

              <div class="admin-list-actions">
                <button
                  data-edit-partner="${esc(partner.id)}"
                  type="button"
                >
                  Edit
                </button>

                <button
                  class="danger-text"
                  data-delete-partner="${esc(partner.id)}"
                  type="button"
                >
                  Delete
                </button>
              </div>
            </div>
          </article>
        `;
      }).join("")
    : '<div class="admin-empty">No partners added yet.</div>';

  list
    .querySelectorAll("[data-partner-logo]")
    .forEach(image => {
      image.addEventListener(
        "error",
        () => {
          image.hidden = true;

          if (image.nextElementSibling) {
            image.nextElementSibling.hidden = false;
          }
        },
        { once: true }
      );
    });

  list
    .querySelectorAll("[data-edit-partner]")
    .forEach(button => {
      button.addEventListener("click", () => {
        editPartner(button.dataset.editPartner);
      });
    });

  list
    .querySelectorAll("[data-delete-partner]")
    .forEach(button => {
      button.addEventListener("click", () => {
        deletePartner(button.dataset.deletePartner);
      });
    });
}

function updatePartnerLogoPreview(
  url,
  name = "",
  settings = {}
) {
  const preview =
    document.getElementById("partnerLogoPreview");

  if (!preview) return;

  if (!url) {
    preview.innerHTML = `
      <span>${esc(partnerInitials(name) || "LOGO")}</span>
    `;

    return;
  }

  preview.innerHTML = `
    <img
      src="${esc(url)}"
      alt="Partner logo preview"
      style="transform: ${partnerLogoTransform(settings)};"
    >
  `;
}

function editPartner(id) {
  const partner = currentPartners.find(
    item => item.id === id
  );

  if (!partner) return;

  const form = document.getElementById("partnerForm");

  form.elements.id.value = partner.id;
  form.elements.name.value = partner.name || "";
  form.elements.website_url.value =
    partner.website_url || "";
  form.elements.display_order.value =
    partner.display_order ?? 0;
  form.elements.existing_logo_url.value =
    partner.logo_url || "";
  form.elements.published.checked =
    Boolean(partner.published);

  form.elements.logo_scale.value =
    partner.logo_scale ?? 100;

  form.elements.logo_offset_x.value =
    partner.logo_offset_x ?? 0;

  form.elements.logo_offset_y.value =
    partner.logo_offset_y ?? 0;

  updatePartnerLogoControlLabels(form);

  updatePartnerLogoPreview(
    partner.logo_url,
    partner.name,
    partner
  );

  form.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function resetPartnerForm() {
  const form = document.getElementById("partnerForm");

  if (!form) return;

  form.reset();
  form.elements.id.value = "";
  form.elements.existing_logo_url.value = "";
  form.elements.display_order.value = 0;
  form.elements.published.checked = true;

  form.elements.logo_scale.value = 100;
  form.elements.logo_offset_x.value = 0;
  form.elements.logo_offset_y.value = 0;

  updatePartnerLogoControlLabels(form);

  updatePartnerLogoPreview(
    "",
    "",
    readPartnerLogoAdjustment(form)
  );
}

async function savePartner(event) {
  event.preventDefault();

  const form = event.currentTarget;

  if (!form.checkValidity()) {
    return form.reportValidity();
  }

  if (form.dataset.saveBusy === "true") return;

  const data = new FormData(form);
  const name = String(data.get("name") || "").trim();
  const file = data.get("logo_file");

  let logoUrl = String(
    data.get("existing_logo_url") || ""
  ).trim();

  let websiteUrl = null;

  try {
    websiteUrl = normalisePartnerUrl(
      data.get("website_url")
    );
  } catch (error) {
    return notice(error.message, "error");
  }

  if (!name) {
    return notice("Enter the partner name.", "error");
  }

  if (file?.size) {
    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/webp"
    ];

    if (!allowedTypes.includes(file.type)) {
      return notice(
        "Use a PNG, JPG or WebP partner logo.",
        "error"
      );
    }

    if (file.size > 2 * 1024 * 1024) {
      return notice(
        "The partner logo must be smaller than 2 MB.",
        "error"
      );
    }
  }

  const button = form.querySelector(
    'button[type="submit"]'
  );

  form.dataset.saveBusy = "true";

  if (button) {
    button.dataset.originalText ||=
      button.textContent.trim();

    button.disabled = true;
    button.textContent = "Saving…";
  }

  try {
    if (file?.size) {
      showAdminTaskToast(
        "Uploading the partner logo…",
        "loading",
        { persistent: true }
      );

      logoUrl = await uploadFile(file, "partners");
    }

    showAdminTaskToast(
      "Saving the partner details…",
      "loading",
      { persistent: true }
    );

    const payload = {
      name,
      logo_url: logoUrl || null,
      website_url: websiteUrl,
      display_order: Math.max(
        0,
        Number(data.get("display_order") || 0)
      ),

      ...readPartnerLogoAdjustment(form),

      published:
        data.get("published") === "on",
      updated_at: new Date().toISOString()
    };

    const id = String(data.get("id") || "");

    const { error } = id
      ? await client()
          .from("partners")
          .update(payload)
          .eq("id", id)
      : await client()
          .from("partners")
          .insert(payload);

    if (error) throw new Error(error.message);

    showAdminTaskToast(
      id
        ? "Partner updated successfully."
        : "Partner added successfully.",
      "success"
    );

    resetPartnerForm();
    await loadPartners();
  } catch (error) {
    showAdminTaskToast(
      error.message || "The partner could not be saved.",
      "error"
    );

    notice(
      error.message || "The partner could not be saved.",
      "error"
    );
  } finally {
    form.dataset.saveBusy = "false";

    if (button) {
      button.disabled = false;
      button.textContent =
        button.dataset.originalText || "Save partner";
    }
  }
}

async function deletePartner(id) {
  const partner = currentPartners.find(
    item => item.id === id
  );

  if (!partner) return;

  if (!confirm(`Delete ${partner.name}?`)) return;

  const { error } = await client()
    .from("partners")
    .delete()
    .eq("id", id);

  if (error) {
    return notice(error.message, "error");
  }

  notice("Partner deleted.");
  await loadPartners();
}

function setupPartnerAdmin() {
  const form = document.getElementById("partnerForm");
  const resetButton =
    document.getElementById("resetPartnerForm");
  const tab = document.querySelector(
    '[data-admin-tab="partners"]'
  );

  form?.addEventListener("submit", savePartner);

  resetButton?.addEventListener(
    "click",
    resetPartnerForm
  );

  tab?.addEventListener("click", loadPartners);

  form?.elements.logo_file?.addEventListener(
    "change",
    event => {
      const file = event.target.files?.[0];

      if (!file) {
        updatePartnerLogoPreview(
          form.elements.existing_logo_url.value,
          form.elements.name.value
        );

        return;
      }

      updatePartnerLogoPreview(
        URL.createObjectURL(file),
        form.elements.name.value
      );
    }
  );

  form?.elements.name?.addEventListener(
    "input",
    () => {
      if (
        !form.elements.logo_file.files?.length &&
        !form.elements.existing_logo_url.value
      ) {
        updatePartnerLogoPreview(
          "",
          form.elements.name.value,
          readPartnerLogoAdjustment(form)
        );
      }
    }
  );

  [
    "logo_scale",
    "logo_offset_x",
    "logo_offset_y"
  ].forEach(fieldName => {
    form?.elements[fieldName]?.addEventListener(
      "input",
      () => {
        updatePartnerLogoControlLabels(form);

        const file =
          form.elements.logo_file.files?.[0];

        const previewUrl = file
          ? URL.createObjectURL(file)
          : form.elements.existing_logo_url.value;

        updatePartnerLogoPreview(
          previewUrl,
          form.elements.name.value,
          readPartnerLogoAdjustment(form)
        );
      }
    );
  });

  document
    .getElementById("resetPartnerLogoPosition")
    ?.addEventListener("click", () => {
      form.elements.logo_scale.value = 100;
      form.elements.logo_offset_x.value = 0;
      form.elements.logo_offset_y.value = 0;

      updatePartnerLogoControlLabels(form);

      const file =
        form.elements.logo_file.files?.[0];

      const previewUrl = file
        ? URL.createObjectURL(file)
        : form.elements.existing_logo_url.value;

      updatePartnerLogoPreview(
        previewUrl,
        form.elements.name.value,
        readPartnerLogoAdjustment(form)
      );
    });
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

document.addEventListener("DOMContentLoaded", setupTeamAdmin);
document.addEventListener("DOMContentLoaded", setupPartnerAdmin);
document.addEventListener("DOMContentLoaded", initAdmin);
