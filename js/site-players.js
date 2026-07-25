let publicPlayers = [];
let publicPositionFilter = "all";
let publicLegacyYearFilter = "all";

function publicEscapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function publicEscapeAttribute(value = "") {
  return publicEscapeHtml(value);
}

function publicPlayerClamp(
  value,
  minimum,
  maximum
) {
  return Math.min(
    maximum,
    Math.max(minimum, Number(value) || 0)
  );
}

function publicPlayerInitials(name = "") {
  const initials = String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part.charAt(0))
    .join("")
    .toUpperCase();

  return initials || "AC";
}

function publicPlayerDisplayName(player) {
  const nickname = String(
    player?.nickname || ""
  ).trim();

  if (nickname) return nickname;

  const fullName = String(
    player?.full_name || ""
  ).trim();

  return fullName.split(/\s+/)[0] || "Player";
}

function publicPlayerSectionLabel(section) {
  return section === "legacy"
    ? "Legacy Player"
    : "Current Squad";
}

function publicPlayerStatusLabel(status) {
  return {
    active: "Active",
    injured: "Injured",
    unavailable: "Unavailable",
    suspended: "Suspended",
    released: "Released",
    retired: "Retired"
  }[status] || "Active";
}

function publicPlayerPositionOrder(position = "") {
  return {
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
  }[position] || 100;
}

function publicPlayerImageMarkup(
  player,
  className
) {
  if (!player.photo_url) {
    return `
      <span class="${className}__initials">
        ${publicEscapeHtml(
          publicPlayerInitials(player.full_name)
        )}
      </span>
    `;
  }

  const scale = publicPlayerClamp(
    player.photo_scale || 100,
    50,
    250
  );

  const offsetX = publicPlayerClamp(
    player.photo_offset_x || 0,
    -40,
    40
  );

  const offsetY = publicPlayerClamp(
    player.photo_offset_y || 0,
    -40,
    40
  );

  return `
    <img
      src="${publicEscapeAttribute(
        player.photo_url
      )}"
      alt="${publicEscapeAttribute(
        player.full_name
      )}"
      loading="lazy"
      style="
        object-position:
          ${50 + offsetX}% ${50 + offsetY}%;
        transform: scale(${scale / 100});
      "
    />
  `;
}

function publicPlayerIsLocalPreview() {
  const hostname =
    window.location.hostname.toLowerCase();

  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".app.github.dev") ||
    hostname.endsWith(".githubpreview.dev")
  );
}

function getPublicPlayerClient() {
  try {
    if (typeof getCmsClient === "function") {
      const cms = getCmsClient();

      if (cms?.from) {
        return cms;
      }
    }

    if (
      typeof window.getCmsClient === "function"
    ) {
      const cms = window.getCmsClient();

      if (cms?.from) {
        return cms;
      }
    }

    console.error(
      "Imperial CMS client is unavailable."
    );

    return null;
  } catch (error) {
    console.error(
      "Imperial CMS client could not be created:",
      error
    );

    return null;
  }
}

async function publicSquadIsVisible() {
  if (publicPlayerIsLocalPreview()) {
    return true;
  }

  const cms = getPublicPlayerClient();

  if (!cms) return false;

  const { data, error } = await cms
    .from("site_settings")
    .select("value")
    .eq("key", "show_players")
    .maybeSingle();

  if (error) {
    console.error(
      "Squad visibility could not be loaded:",
      error
    );

    return false;
  }

  return (
    data?.value === true ||
    data?.value === "true"
  );
}

function renderPublicSquadUnavailable(mount) {
  mount.innerHTML = `
    <div class="public-player-empty">
      <p class="eyebrow">Squad</p>

      <h2>This page is not live yet.</h2>

      <p>
        The Imperial AC player directory is currently
        being prepared.
      </p>

      <a class="button button--blue" href="index.html">
        Return home
      </a>
    </div>
  `;
}

function refreshPublicPositionFilter() {
  const select =
    document.getElementById(
      "publicPlayerPositionFilter"
    );

  if (!select) return;

  const positions = [
    ...new Set(
      publicPlayers
        .map(player => player.position)
        .filter(Boolean)
    )
  ].sort((first, second) => {
    return (
      publicPlayerPositionOrder(first) -
        publicPlayerPositionOrder(second) ||
      first.localeCompare(second)
    );
  });

  select.innerHTML = `
    <option value="all">
      All positions
    </option>

    ${positions
      .map(position => `
        <option
          value="${publicEscapeAttribute(
            position
          )}"
        >
          ${publicEscapeHtml(position)}
        </option>
      `)
      .join("")}
  `;

  select.value = publicPositionFilter;
}

function renderPublicPlayerCard(player) {
  return `
    <a
      class="public-player-card"
      href="player.html?player=${encodeURIComponent(
        player.slug
      )}"
    >
      <span class="public-player-card__photo">
        ${publicPlayerImageMarkup(
          player,
          "public-player-card"
        )}
      </span>

      <span class="public-player-card__identity">
        <span class="public-player-card__type">
          ${publicEscapeHtml(
            publicPlayerSectionLabel(
              player.profile_section
            )
          )}
        </span>

        <strong class="public-player-card__name">
          ${publicEscapeHtml(
            publicPlayerDisplayName(player)
          )}
        </strong>

        <span class="public-player-card__position">
          ${publicEscapeHtml(player.position)}
        </span>
      </span>

      <span
        class="public-player-card__arrow"
        aria-hidden="true"
      >
        ↗
      </span>
    </a>
  `;
}

function publicLegacyYears(players) {
  const years = new Set();

  players.forEach(player => {
    const joined = Number(player.joined_year);
    const departed = Number(player.departed_year);

    if (joined && departed && departed >= joined) {
      for (
        let year = joined;
        year <= departed;
        year += 1
      ) {
        years.add(year);
      }

      return;
    }

    if (joined) years.add(joined);
    if (departed) years.add(departed);
  });

  return [...years].sort(
    (first, second) => first - second
  );
}

function publicLegacyPlayerMatchesYear(
  player,
  selectedYear
) {
  if (selectedYear === "all") {
    return true;
  }

  const year = Number(selectedYear);
  const joined = Number(player.joined_year);
  const departed = Number(player.departed_year);

  if (joined && departed) {
    return year >= joined && year <= departed;
  }

  if (joined) {
    return year === joined;
  }

  if (departed) {
    return year === departed;
  }

  return false;
}

function renderPublicLegacyYearFilter(years) {
  if (!years.length) return "";

  return `
    <div
      class="public-player-year-filter"
      aria-label="Filter legacy players by year"
    >
      <button
        class="${
          publicLegacyYearFilter === "all"
            ? "active"
            : ""
        }"
        type="button"
        data-legacy-year="all"
      >
        All years
      </button>

      ${years
        .map(year => `
          <button
            class="${
              String(publicLegacyYearFilter) ===
              String(year)
                ? "active"
                : ""
            }"
            type="button"
            data-legacy-year="${year}"
          >
            ${year}
          </button>
        `)
        .join("")}
    </div>
  `;
}

function renderPublicPlayerDirectory() {
  const mount =
    document.getElementById(
      "publicPlayerDirectory"
    );

  const count =
    document.getElementById(
      "publicPlayerCount"
    );

  if (!mount) return;

  const positionFiltered = publicPlayers
    .filter(player => {
      return (
        publicPositionFilter === "all" ||
        player.position === publicPositionFilter
      );
    })
    .sort((first, second) => {
      return (
        publicPlayerPositionOrder(first.position) -
          publicPlayerPositionOrder(
            second.position
          ) ||
        Number(first.display_order || 0) -
          Number(second.display_order || 0) ||
        String(first.full_name).localeCompare(
          String(second.full_name)
        )
      );
    });

  if (count) {
    count.textContent =
      `${positionFiltered.length} ${
        positionFiltered.length === 1
          ? "player"
          : "players"
      }`;
  }

  if (!positionFiltered.length) {
    mount.innerHTML = `
      <div class="public-player-empty">
        <h2>No players found.</h2>

        <p>
          No published players match this position.
        </p>
      </div>
    `;

    return;
  }

  const currentSquad = positionFiltered.filter(
    player =>
      player.profile_section === "first_team"
  );

  const allLegacyPlayers = positionFiltered.filter(
    player =>
      player.profile_section === "legacy"
  );

  const legacyYears =
    publicLegacyYears(allLegacyPlayers);

  if (
    publicLegacyYearFilter !== "all" &&
    !legacyYears.includes(
      Number(publicLegacyYearFilter)
    )
  ) {
    publicLegacyYearFilter = "all";
  }

  const visibleLegacyPlayers =
    allLegacyPlayers.filter(player =>
      publicLegacyPlayerMatchesYear(
        player,
        publicLegacyYearFilter
      )
    );

  const currentSection = currentSquad.length
    ? `
      <section class="public-player-section">
        <div class="public-player-section__head">
          <div>
            <p class="eyebrow">
              Representing Imperial now
            </p>

            <h2>Current Squad</h2>
          </div>

          <span>
            ${currentSquad.length}
            ${currentSquad.length === 1
              ? "player"
              : "players"}
          </span>
        </div>

        <div class="public-player-grid">
          ${currentSquad
            .map(renderPublicPlayerCard)
            .join("")}
        </div>
      </section>
    `
    : "";

  const legacySection = allLegacyPlayers.length
    ? `
      <section class="public-player-section">
        <div class="public-player-section__head">
          <div>
            <p class="eyebrow">
              Part of the journey
            </p>

            <h2>Legacy Players</h2>
          </div>

          <span>
            ${visibleLegacyPlayers.length}
            ${visibleLegacyPlayers.length === 1
              ? "player"
              : "players"}
          </span>
        </div>

        ${renderPublicLegacyYearFilter(
          legacyYears
        )}

        ${
          visibleLegacyPlayers.length
            ? `
              <div class="public-player-grid">
                ${visibleLegacyPlayers
                  .map(renderPublicPlayerCard)
                  .join("")}
              </div>
            `
            : `
              <div class="public-player-empty">
                <p>
                  No legacy players are listed for
                  ${publicEscapeHtml(
                    publicLegacyYearFilter
                  )}.
                </p>
              </div>
            `
        }
      </section>
    `
    : "";

  mount.innerHTML =
    currentSection + legacySection;
}

async function loadPublicSquadPage() {
  const mount =
    document.getElementById(
      "publicPlayerDirectory"
    );

  if (!mount) return;

  const visible = await publicSquadIsVisible();

  if (!visible) {
    renderPublicSquadUnavailable(mount);
    return;
  }

  const cms = getPublicPlayerClient();

  if (!cms) {
    mount.innerHTML = `
      <div class="public-player-empty">
        Player information is currently unavailable.
      </div>
    `;

    return;
  }

  const { data, error } = await cms
    .from("players")
    .select("*")
    .eq("published", true)
    .order("display_order", {
      ascending: true
    })
    .order("full_name", {
      ascending: true
    });

  if (error) {
    console.error(
      "Players could not be loaded:",
      error
    );

    mount.innerHTML = `
      <div class="public-player-empty">
        Player information could not be loaded.
      </div>
    `;

    return;
  }

  publicPlayers = data || [];

  refreshPublicPositionFilter();
  renderPublicPlayerDirectory();

  document
    .getElementById(
      "publicPlayerPositionFilter"
    )
    ?.addEventListener("change", event => {
      publicPositionFilter =
        event.currentTarget.value;

      publicLegacyYearFilter = "all";
      renderPublicPlayerDirectory();
    });

  mount.addEventListener("click", event => {
    const yearButton = event.target.closest(
      "[data-legacy-year]"
    );

    if (!yearButton) return;

    publicLegacyYearFilter =
      yearButton.dataset.legacyYear || "all";

    renderPublicPlayerDirectory();
  });
}

function publicPlayerYearsMarkup(player) {
  if (
    !player.joined_year &&
    !player.departed_year
  ) {
    return "";
  }

  const joined =
    player.joined_year || "Unknown";

  const departed =
    player.departed_year || "Present";

  return `
    <div class="public-player-profile__years">
      <span>Imperial AC journey</span>

      <strong>
        ${publicEscapeHtml(joined)}
        —
        ${publicEscapeHtml(departed)}
      </strong>
    </div>
  `;
}

function renderPublicPlayerProfile(player) {
  const mount =
    document.getElementById("playerProfile");

  if (!mount) return;

  document.title =
    `${player.full_name} | Imperial AC`;

  const nickname = player.nickname
    ? `
      <p class="public-player-profile__nickname">
        “${publicEscapeHtml(player.nickname)}”
      </p>
    `
    : "";

  const legacyTitle = player.legacy_title
    ? `
      <div class="public-player-profile__legacy">
        ${publicEscapeHtml(
          player.legacy_title
        )}
      </div>
    `
    : "";

  const shirtNumber = player.shirt_number
    ? `
      <span>
        Number ${publicEscapeHtml(
          player.shirt_number
        )}
      </span>
    `
    : "";

  const captain = player.is_captain
    ? "<span>Captain</span>"
    : "";

  const biography = player.biography
    ? publicEscapeHtml(player.biography)
        .replaceAll("\n", "<br>")
    : (
        "This player profile will be updated with "
        + "more of their Imperial AC story."
      );

  mount.innerHTML = `
    <section class="page-hero">
      <div class="container">
        <div class="breadcrumbs">
          <a href="index.html">Home</a>
          /
          <a href="squad.html">Squad</a>
          /
          ${publicEscapeHtml(
            publicPlayerDisplayName(player)
          )}
        </div>

        <div class="page-hero-grid">
          <div>
            <p class="eyebrow">
              ${publicEscapeHtml(
                publicPlayerSectionLabel(
                  player.profile_section
                )
              )}
            </p>

            <h1 class="heading">
              ${publicEscapeHtml(
                player.full_name
              )}
            </h1>

            ${nickname}
          </div>

          <div class="page-hero-side">
            <span class="page-hero-number">
              ${player.shirt_number || "AC"}
            </span>

            <p>
              ${publicEscapeHtml(player.position)}
            </p>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container public-player-profile">
        <div class="public-player-profile__photo">
          ${publicPlayerImageMarkup(
            player,
            "public-player-profile"
          )}
        </div>

        <div class="public-player-profile__content">
          <div class="public-player-profile__tags">
            <span>
              ${publicEscapeHtml(player.position)}
            </span>

            <span>
              ${publicEscapeHtml(
                publicPlayerStatusLabel(
                  player.player_status
                )
              )}
            </span>

            ${shirtNumber}
            ${captain}
          </div>

          ${legacyTitle}

          ${publicPlayerYearsMarkup(player)}

          <div class="public-player-profile__stats">
            <div>
              <strong>
                ${Number(player.appearances || 0)}
              </strong>

              <span>Appearances</span>
            </div>

            <div>
              <strong>
                ${Number(player.goals || 0)}
              </strong>

              <span>Goals</span>
            </div>

            <div>
              <strong>
                ${Number(player.assists || 0)}
              </strong>

              <span>Assists</span>
            </div>

            <div>
              <strong>
                ${Number(player.clean_sheets || 0)}
              </strong>

              <span>Clean sheets</span>
            </div>
          </div>

          <div class="public-player-profile__story">
            <p class="eyebrow">
              Player story
            </p>

            <h2>
              Behind the name.
            </h2>

            <p>${biography}</p>
          </div>

          <a
            class="text-link"
            href="squad.html"
          >
            Back to the squad
            <span>↗</span>
          </a>
        </div>
      </div>
    </section>
  `;
}

async function loadPublicPlayerProfile() {
  const mount =
    document.getElementById("playerProfile");

  if (!mount) return;

  const visible = await publicSquadIsVisible();

  if (!visible) {
    renderPublicSquadUnavailable(mount);
    return;
  }

  const slug = new URLSearchParams(
    window.location.search
  ).get("player");

  if (!slug) {
    mount.innerHTML = `
      <section class="section">
        <div class="container">
          <div class="public-player-empty">
            <h1>Player not found.</h1>

            <a
              class="button button--blue"
              href="squad.html"
            >
              View the squad
            </a>
          </div>
        </div>
      </section>
    `;

    return;
  }

  const cms = getPublicPlayerClient();

  if (!cms) return;

  const { data, error } = await cms
    .from("players")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (error || !data) {
    mount.innerHTML = `
      <section class="section">
        <div class="container">
          <div class="public-player-empty">
            <p class="eyebrow">
              Player profile
            </p>

            <h1>Player not found.</h1>

            <p>
              This profile may have been removed or
              unpublished.
            </p>

            <a
              class="button button--blue"
              href="squad.html"
            >
              View the squad
            </a>
          </div>
        </div>
      </section>
    `;

    return;
  }

  renderPublicPlayerProfile(data);
}

function initialisePublicPlayers() {
  loadPublicSquadPage();
  loadPublicPlayerProfile();
}

document.addEventListener(
  "DOMContentLoaded",
  initialisePublicPlayers
);
