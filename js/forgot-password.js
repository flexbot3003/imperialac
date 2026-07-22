let recoveryClient = null;

function getRecoveryClient() {
  const config = window.IMPERIAL_CMS || {};

  if (
    !config.supabaseUrl ||
    !config.supabaseAnonKey ||
    !window.supabase?.createClient
  ) {
    return null;
  }

  recoveryClient ||= window.supabase.createClient(
    config.supabaseUrl,
    config.supabaseAnonKey
  );

  return recoveryClient;
}

function showRecoveryNotice(message, type = "") {
  const notice = document.getElementById("authNotice");
  notice.textContent = message;
  notice.className = `auth-notice ${type}`.trim();
  notice.hidden = false;
}

async function requestPasswordReset(event) {
  event.preventDefault();

  const client = getRecoveryClient();
  const button = document.getElementById("sendResetButton");
  const emailInput = document.getElementById("resetEmail");
  const email = emailInput.value.trim();

  if (!email || !emailInput.checkValidity()) {
    emailInput.reportValidity();
    showRecoveryNotice("Enter a valid email address.", "error");
    return;
  }

  if (!client) {
    showRecoveryNotice("The authentication service is unavailable.", "error");
    return;
  }

  button.disabled = true;
  button.textContent = "Sending…";

  const redirectTo = new URL(
    "reset-password.html",
    window.location.href
  ).href;

  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo
  });

  button.disabled = false;
  button.textContent = "Send recovery email";

  if (error) {
    const rateLimited =
      error.status === 429 ||
      /rate limit|too many requests/i.test(error.message || "");

    showRecoveryNotice(
      rateLimited
        ? "Too many recovery emails were requested. Please wait before trying again."
        : error.message,
      "error"
    );
    return;
  }

  showRecoveryNotice(
    "Check your inbox. If that address belongs to an administrator account, a recovery link has been sent.",
    "success"
  );

  event.currentTarget.reset();
}

document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("forgotPasswordForm")
    .addEventListener("submit", requestPasswordReset);
});
