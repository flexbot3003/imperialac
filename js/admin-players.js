let currentPlayers = [];
let activePlayerPositionFilter = "all";

function escapePlayerHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function slugifyPlayer(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function clampPlayerValue(value, minimum, maximum) {
  return Math.min(
    maximum,
    Math.max(minimum, Number(value) || 0)
  );
}

function playerInitials(name = "") {
  const initials = String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part.charAt(0))
    .join("")
    .toUpperCase();

  return initials || "AC";
}

function playerSectionLabel(section) {
  return section === "legacy"
    ? "Legacy player"
    : "Current squad";
}

function playerStatusLabel(status) {
  return {
    active: "Active",
    injured: "Injured",
    unavailable: "Unavailable",
    suspended: "Suspended",
    released: "Released",
    retired: "Retired"
  }[status] || "Active";
}

function playerPhotoMarkup(player) {
  if (!player.photo_url) {
    return `
      <div class="player-admin-card__fallback">
        ${escapePlayerHtml(playerInitials(player.full_name))}
      </div>
    `;
  }

  const scale = clampPlayerValue(
    player.photo_scale || 100,
    50,
    250
  );

  const offsetX = clampPlayerValue(
    player.photo_offset_x || 0,
    -40,
    40
  );

  const offsetY = clampPlayerValue(
    player.photo_offset_y || 0,
    -40,
    40
  );

  return `
    <img
      src="${escapePlayerHtml(player.photo_url)}"
      alt="${escapePlayerHtml(player.full_name)}"
      style="
        object-position:
          ${50 + offsetX}% ${50 + offsetY}%;
        transform: scale(${scale / 100});
      "
    />
  `;
}

function playerDirectoryPhotoMarkup(player) {
  if (!player.photo_url) {
    return `
      <span class="player-directory-item__initials">
        ${escapePlayerHtml(
          playerInitials(player.full_name)
        )}
      </span>
    `;
  }

  const scale = clampPlayerValue(
    player.photo_scale || 100,
    50,
    250
  );

  const offsetX = clampPlayerValue(
    player.photo_offset_x || 0,
    -40,
    40
  );

  const offsetY = clampPlayerValue(
    player.photo_offset_y || 0,
    -40,
    40
  );

  return `
    <img
      src="${escapePlayerHtml(player.photo_url)}"
      alt=""
      style="
        object-position:
          ${50 + offsetX}% ${50 + offsetY}%;
        transform: scale(${scale / 100});
      "
    />
  `;
}

function playerPositionOrder(position = "") {
  const order = {
    "Goalkeeper": 10,
    "Right Back": 20,
    "Centre Back": 21,
    "Left Back": 22,
    "Defensive Midfielder": 30,
    "Central Midfielder": 31,
    "Attacking Midfielder": 32,
    "Right Winger": 40,
    "Left Winger": 41,
    "Striker": 42,
    "Utility Player": 50
  };

  return order[position] || 100;
}

function refreshPlayerPositionFilter() {
  const select =
    document.getElementById("playerPositionFilter");

  if (!select) return;

  const positions = [
    ...new Set(
      currentPlayers
        .map(player => player.position)
        .filter(Boolean)
    )
  ].sort((first, second) => {
    const orderDifference =
      playerPositionOrder(first) -
      playerPositionOrder(second);

    return orderDifference ||
      first.localeCompare(second);
  });

  const selectedValue =
    activePlayerPositionFilter;

  select.innerHTML = `
    <option value="all">All positions</option>

    ${positions
      .map(position => `
        <option
          value="${escapePlayerHtml(position)}"
        >
          ${escapePlayerHtml(position)}
        </option>
      `)
      .join("")}
  `;

  if (
    selectedValue === "all" ||
    positions.includes(selectedValue)
  ) {
    select.value = selectedValue;
  } else {
    activePlayerPositionFilter = "all";
    select.value = "all";
  }
}

function playerDirectoryDisplayName(player) {
  const fullName = String(
    player?.full_name || ""
  ).trim();

  if (!fullName) return "Player";

  return fullName.split(/\s+/)[0];
}

function renderPlayerAdminList() {
  const list =
    document.getElementById("playerAdminList");

  const count =
    document.getElementById(
      "playerDirectoryCount"
    );

  if (!list) return;

  const filteredPlayers = currentPlayers
    .filter(player => {
      return (
        activePlayerPositionFilter === "all" ||
        player.position ===
          activePlayerPositionFilter
      );
    })
    .sort((first, second) => {
      return (
        playerPositionOrder(first.position) -
          playerPositionOrder(second.position) ||
        Number(first.display_order || 0) -
          Number(second.display_order || 0) ||
        String(first.full_name).localeCompare(
          String(second.full_name)
        )
      );
    });

  if (count) {
    count.textContent =
      `${filteredPlayers.length} ${
        filteredPlayers.length === 1
          ? "player"
          : "players"
      }`;
  }

  if (!filteredPlayers.length) {
    list.innerHTML = `
      <div class="player-mini-empty">
        No players match this position.
      </div>
    `;

    return;
  }

  const renderCard = player => `
    <article class="player-mini-card">
      <div class="player-mini-card__main">
        <div class="player-mini-card__photo">
          ${playerDirectoryPhotoMarkup(player)}
        </div>

        <div class="player-mini-card__identity">
          <span class="player-mini-card__type">
            ${escapePlayerHtml(
              playerSectionLabel(
                player.profile_section
              )
            )}
          </span>

          <button
            class="player-mini-card__name"
            type="button"
            data-edit-player="${escapePlayerHtml(
              player.id
            )}"
          >
            ${escapePlayerHtml(
              playerDirectoryDisplayName(player)
            )}
          </button>

          <span class="player-mini-card__position">
            ${escapePlayerHtml(player.position)}
          </span>
        </div>
      </div>

      <div class="player-mini-card__actions">
        <button
          class="player-mini-card__edit"
          type="button"
          data-edit-player="${escapePlayerHtml(
            player.id
          )}"
        >
          Edit
        </button>

        <button
          class="player-mini-card__delete"
          type="button"
          data-delete-player="${escapePlayerHtml(
            player.id
          )}"
        >
          Delete
        </button>
      </div>
    </article>
  `;

  const sections = [
    {
      key: "first_team",
      title: "Current Squad"
    },
    {
      key: "legacy",
      title: "Legacy Players"
    }
  ];

  list.innerHTML = sections
    .map(section => {
      const players = filteredPlayers.filter(
        player =>
          player.profile_section === section.key
      );

      if (!players.length) return "";

      return `
        <section class="player-mini-section">
          <div class="player-mini-section__heading">
            <h3>${section.title}</h3>

            <span>
              ${players.length}
              ${players.length === 1
                ? "player"
                : "players"}
            </span>
          </div>

          <div class="player-mini-grid">
            ${players.map(renderCard).join("")}
          </div>
        </section>
      `;
    })
    .join("");
}

async function loadPlayers() {
  const { data, error } = await client()
    .from("players")
    .select("*")
    .order("profile_section", {
      ascending: true
    })
    .order("display_order", {
      ascending: true
    })
    .order("full_name", {
      ascending: true
    });

  if (error) {
    notice(error.message, "error");
    return;
  }

  currentPlayers = data || [];

  const count =
    document.getElementById("countPlayers");

  if (count) {
    count.textContent = String(
      currentPlayers.filter(
        player => player.published
      ).length
    );
  }

  refreshPlayerPositionFilter();
  renderPlayerAdminList();
}

function updatePlayerPhotoPreview() {
  const form =
    document.getElementById("playerForm");

  const preview =
    document.getElementById("playerPhotoPreview");

  if (!form || !preview) return;

  const fileInput =
    form.elements.photo_file;

  const urlInput =
    form.elements.photo_url;

  const scaleInput =
    form.elements.photo_scale;

  const offsetXInput =
    form.elements.photo_offset_x;

  const offsetYInput =
    form.elements.photo_offset_y;

  const scale = clampPlayerValue(
    scaleInput.value,
    50,
    250
  );

  const offsetX = clampPlayerValue(
    offsetXInput.value,
    -40,
    40
  );

  const offsetY = clampPlayerValue(
    offsetYInput.value,
    -40,
    40
  );

  document.getElementById(
    "playerPhotoScaleOutput"
  ).textContent = `${scale}%`;

  document.getElementById(
    "playerPhotoOffsetXOutput"
  ).textContent = String(offsetX);

  document.getElementById(
    "playerPhotoOffsetYOutput"
  ).textContent = String(offsetY);

  let source = urlInput.value.trim();

  if (fileInput.files?.[0]) {
    source = URL.createObjectURL(
      fileInput.files[0]
    );
  }

  if (!source) {
    preview.innerHTML =
      "<span>Player photo</span>";

    return;
  }

  preview.innerHTML = "";

  const image = document.createElement("img");

  image.src = source;
  image.alt = "Player preview";

  image.style.objectPosition =
    `${50 + offsetX}% ${50 + offsetY}%`;

  image.style.transform =
    `scale(${scale / 100})`;

  image.addEventListener("error", () => {
    preview.innerHTML =
      "<span>Unable to preview photo</span>";
  });

  preview.appendChild(image);
}

function resetPlayerForm() {
  const form =
    document.getElementById("playerForm");

  if (!form) return;

  form.reset();

  document.getElementById(
    "playerId"
  ).value = "";

  form.elements.photo_scale.value = "100";
  form.elements.photo_offset_x.value = "0";
  form.elements.photo_offset_y.value = "0";
  form.elements.display_order.value = "0";
  form.elements.appearances.value = "0";
  form.elements.goals.value = "0";
  form.elements.assists.value = "0";
  form.elements.clean_sheets.value = "0";
  form.elements.profile_section.value =
    "first_team";
  form.elements.player_status.value =
    "active";
  form.elements.published.checked = true;

  updatePlayerPhotoPreview();
}

function editPlayer(id) {
  const player = currentPlayers.find(
    item => String(item.id) === String(id)
  );

  if (!player) {
    notice(
      "The selected player could not be found.",
      "error"
    );

    return;
  }

  const form =
    document.getElementById("playerForm");

  document.getElementById(
    "playerId"
  ).value = player.id;

  form.elements.full_name.value =
    player.full_name || "";

  form.elements.nickname.value =
    player.nickname || "";

  form.elements.slug.value =
    player.slug || "";

  form.elements.position.value =
    player.position || "";

  form.elements.shirt_number.value =
    player.shirt_number ?? "";

  form.elements.profile_section.value =
    player.profile_section || "first_team";

  form.elements.player_status.value =
    player.player_status || "active";

  form.elements.photo_url.value =
    player.photo_url || "";

  form.elements.biography.value =
    player.biography || "";

  form.elements.legacy_title.value =
    player.legacy_title || "";

  form.elements.joined_year.value =
    player.joined_year ?? "";

  form.elements.departed_year.value =
    player.departed_year ?? "";

  form.elements.appearances.value =
    player.appearances || 0;

  form.elements.goals.value =
    player.goals || 0;

  form.elements.assists.value =
    player.assists || 0;

  form.elements.clean_sheets.value =
    player.clean_sheets || 0;

  form.elements.photo_scale.value =
    player.photo_scale || 100;

  form.elements.photo_offset_x.value =
    player.photo_offset_x || 0;

  form.elements.photo_offset_y.value =
    player.photo_offset_y || 0;

  form.elements.display_order.value =
    player.display_order || 0;

  form.elements.is_captain.checked =
    Boolean(player.is_captain);

  form.elements.featured.checked =
    Boolean(player.featured);

  form.elements.published.checked =
    Boolean(player.published);

  updatePlayerPhotoPreview();

  form.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

async function savePlayer(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const formData = new FormData(form);

  const id = String(
    formData.get("id") || ""
  ).trim();

  const existingPlayer = currentPlayers.find(
    player => String(player.id) === id
  );

  const fullName = String(
    formData.get("full_name") || ""
  ).trim();

  let slug = String(
    formData.get("slug") || ""
  ).trim();

  slug = slugifyPlayer(slug || fullName);

  if (!fullName || !slug) {
    notice(
      "Enter the player name and profile slug.",
      "error"
    );

    return;
  }

  let photoUrl = String(
    formData.get("photo_url") || ""
  ).trim();

  if (!photoUrl) {
    photoUrl = existingPlayer?.photo_url || "";
  }

  const photoFile =
    formData.get("photo_file");

  showAdminTaskToast(
    id ? "Updating player…" : "Adding player…",
    "loading",
    { persistent: true }
  );

  try {
    if (photoFile?.size) {
      photoUrl = await uploadFile(
        photoFile,
        "players"
      );
    }

    const nullableNumber = value => {
      const cleaned = String(value || "").trim();

      return cleaned === ""
        ? null
        : Number(cleaned);
    };

    const payload = {
      full_name: fullName,
      nickname:
        String(
          formData.get("nickname") || ""
        ).trim() || null,
      slug,
      position: String(
        formData.get("position") || ""
      ).trim(),
      shirt_number: nullableNumber(
        formData.get("shirt_number")
      ),
      profile_section: String(
        formData.get("profile_section") ||
        "first_team"
      ),
      player_status: String(
        formData.get("player_status") ||
        "active"
      ),
      photo_url: photoUrl || null,
      biography:
        String(
          formData.get("biography") || ""
        ).trim() || null,
      legacy_title:
        String(
          formData.get("legacy_title") || ""
        ).trim() || null,
      joined_year: nullableNumber(
        formData.get("joined_year")
      ),
      departed_year: nullableNumber(
        formData.get("departed_year")
      ),
      appearances: Number(
        formData.get("appearances") || 0
      ),
      goals: Number(
        formData.get("goals") || 0
      ),
      assists: Number(
        formData.get("assists") || 0
      ),
      clean_sheets: Number(
        formData.get("clean_sheets") || 0
      ),
      photo_scale: Number(
        formData.get("photo_scale") || 100
      ),
      photo_offset_x: Number(
        formData.get("photo_offset_x") || 0
      ),
      photo_offset_y: Number(
        formData.get("photo_offset_y") || 0
      ),
      display_order: Number(
        formData.get("display_order") || 0
      ),
      is_captain:
        formData.get("is_captain") === "on",
      featured:
        formData.get("featured") === "on",
      published:
        formData.get("published") === "on"
    };

    let response;

    if (id) {
      response = await client()
        .from("players")
        .update(payload)
        .eq("id", id);
    } else {
      response = await client()
        .from("players")
        .insert(payload);
    }

    if (response.error) {
      throw response.error;
    }

    notice(
      id
        ? `${fullName} updated.`
        : `${fullName} added.`
    );

    resetPlayerForm();
    await loadPlayers();
  } catch (error) {
    hideAdminTaskToast();

    let message =
      error.message ||
      "The player could not be saved.";

    if (
      message.includes(
        "players_current_shirt_number_unique"
      )
    ) {
      message =
        "That shirt number is already assigned to another current squad player.";
    }

    if (
      message.includes("players_slug_key")
    ) {
      message =
        "That profile URL slug is already being used by another player.";
    }

    notice(message, "error");
  }
}

async function deletePlayer(id) {
  const player = currentPlayers.find(
    item => String(item.id) === String(id)
  );

  if (!player) {
    notice(
      "The selected player could not be found.",
      "error"
    );

    return;
  }

  const confirmed = await adminConfirm(
    `Delete ${player.full_name} permanently? This cannot be undone.`,
    {
      title: "Delete player",
      confirmLabel: "Delete player"
    }
  );

  if (!confirmed) return;

  showAdminTaskToast(
    `Deleting ${player.full_name}…`,
    "loading",
    { persistent: true }
  );

  const { error } = await client()
    .from("players")
    .delete()
    .eq("id", id);

  if (error) {
    hideAdminTaskToast();
    notice(error.message, "error");
    return;
  }

  notice(`${player.full_name} deleted.`);
  await loadPlayers();
}

function setupPlayerAdmin() {
  const form =
    document.getElementById("playerForm");

  if (!form) return;

  form.addEventListener("submit", savePlayer);

  document
    .getElementById("resetPlayerForm")
    ?.addEventListener(
      "click",
      resetPlayerForm
    );

  const fullNameInput =
    form.elements.full_name;

  const slugInput =
    form.elements.slug;

  fullNameInput.addEventListener(
    "input",
    () => {
      if (!slugInput.dataset.manuallyEdited) {
        slugInput.value =
          slugifyPlayer(fullNameInput.value);
      }
    }
  );

  slugInput.addEventListener(
    "input",
    () => {
      slugInput.dataset.manuallyEdited =
        slugInput.value ? "true" : "";
    }
  );

  [
    "photo_file",
    "photo_url",
    "photo_scale",
    "photo_offset_x",
    "photo_offset_y"
  ].forEach(name => {
    form.elements[name]?.addEventListener(
      "input",
      updatePlayerPhotoPreview
    );

    form.elements[name]?.addEventListener(
      "change",
      updatePlayerPhotoPreview
    );
  });

  document
    .getElementById("playerPositionFilter")
    ?.addEventListener("change", event => {
      activePlayerPositionFilter =
        event.currentTarget.value;

      renderPlayerAdminList();
    });

  document
    .getElementById("playerAdminList")
    ?.addEventListener("click", event => {
      const editButton =
        event.target.closest(
          "[data-edit-player]"
        );

      const deleteButton =
        event.target.closest(
          "[data-delete-player]"
        );

      if (editButton) {
        editPlayer(
          editButton.dataset.editPlayer
        );
      }

      if (deleteButton) {
        deletePlayer(
          deleteButton.dataset.deletePlayer
        );
      }
    });

  document
    .querySelector(
      '[data-admin-tab="players"]'
    )
    ?.addEventListener("click", loadPlayers);

  resetPlayerForm();
  loadPlayers();
}

document.addEventListener(
  "DOMContentLoaded",
  setupPlayerAdmin
);
