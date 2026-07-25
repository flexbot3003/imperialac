(() => {
  function lockSavedStandingTeams() {
    const body =
      document.getElementById("standingEditorBody");

    if (!body) return;

    body.querySelectorAll("tr").forEach(row => {
      const rowId =
        String(row.dataset.id || "").trim();

      const select =
        row.querySelector("select.team");

      /*
        Rows already saved in Supabase have an ID.
        Newly added blank rows remain selectable.
      */
      if (!rowId || !select) return;

      select.classList.add("team--locked");
      select.setAttribute("aria-disabled", "true");
      select.setAttribute(
        "title",
        "Club name locked. Edit club information under Teams & Logos."
      );

      select.tabIndex = -1;

      if (
        select.closest(
          ".standing-team-lock-wrap"
        )
      ) {
        return;
      }

      const wrapper =
        document.createElement("div");

      wrapper.className =
        "standing-team-lock-wrap";

      select.parentNode.insertBefore(
        wrapper,
        select
      );

      wrapper.appendChild(select);

      const badge =
        document.createElement("span");

      badge.className =
        "standing-team-lock-badge";

      badge.textContent = "Locked";
      badge.title =
        "This saved club name cannot be changed here.";

      wrapper.appendChild(badge);
    });
  }

  async function clearStandingStats() {
    const rows = [
      ...document.querySelectorAll(
        "#standingEditorBody tr"
      )
    ];

    if (!rows.length) {
      notice(
        "There are no standings rows to clear.",
        "error"
      );

      return;
    }

    const confirmed = await adminConfirm(
      "Reset Played, Wins, Draws, Losses, Goals For, Goals Against, Goal Difference and Points to zero for every club? Club names will remain unchanged.",
      {
        title: "Clear all standings stats",
        confirmLabel: "Clear all stats",
        tone: "danger"
      }
    );

    if (!confirmed) return;

    rows.forEach(row => {
      [
        "w",
        "d",
        "l",
        "gf",
        "ga"
      ].forEach(className => {
        const input =
          row.querySelector(`.${className}`);

        if (input) {
          input.value = "0";
        }
      });
    });

    if (
      typeof recalculateStandingRows ===
      "function"
    ) {
      recalculateStandingRows();
    }

    notice(
      "All standings stats were cleared in the editor. Press Save standings live to publish the reset."
    );
  }

  function setupStandingsTools() {
    const clearButton =
      document.getElementById(
        "clearStandingStats"
      );

    clearButton?.addEventListener(
      "click",
      clearStandingStats
    );

    const body =
      document.getElementById(
        "standingEditorBody"
      );

    if (body) {
      const observer = new MutationObserver(
        lockSavedStandingTeams
      );

      observer.observe(body, {
        childList: true,
        subtree: true
      });
    }

    document
      .querySelector(
        '[data-admin-tab="standings"]'
      )
      ?.addEventListener("click", () => {
        window.setTimeout(
          lockSavedStandingTeams,
          0
        );
      });

    lockSavedStandingTeams();
  }

  document.addEventListener(
    "DOMContentLoaded",
    setupStandingsTools
  );
})();
