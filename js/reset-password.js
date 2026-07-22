let passwordClient = null;
let recoverySessionReady = false;

const originalRecoveryUrl = `${window.location.search}${window.location.hash}`;
const hasRecoveryHint =
  /(?:^|[?&#])type=recovery(?:&|$)/.test(originalRecoveryUrl) ||
  /(?:^|[?&#])access_token=/.test(originalRecoveryUrl) ||
  /(?:^|[?&#])code=/.test(originalRecoveryUrl) ||
  /(?:^|[?&#])token_hash=/.test(originalRecoveryUrl);

function getPasswordClient() {
  const config = window.IMPERIAL_CMS || {};

  if (
    !config.supabaseUrl ||
    !config.supabaseAnonKey ||
    !window.supabase?.createClient
  ) {
    return null;
  }

  passwordClient ||= window.supabase.createClient(
    config.supabaseUrl,
    config.supabaseAnonKey
  );

  return passwordClient;
}

function showPasswordNotice(message, type = "") {
  const notice = document.getElementById("authNotice");
  notice.textContent = message;
  notice.className = `auth-notice ${type}`.trim();
  notice.hidden = false;
}

function enablePasswordForm() {
  recoverySessionReady = true;
  document.getElementById("resetPasswordForm").hidden = false;
  showPasswordNotice("Recovery link accepted. Enter your new password.", "success");
}

async function initialisePasswordReset() {
  const client = getPasswordClient();

  if (!client) {
    showPasswordNotice("The authentication service is unavailable.", "error");
    return;
  }

  client.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY" && session) {
      enablePasswordForm();
    }
  });

  const { data, error } = await client.auth.getSession();

  if (error) {
    showPasswordNotice(error.message, "error");
    return;
  }

  if (data.session && hasRecoveryHint) {
    enablePasswordForm();
    return;
  }

  window.setTimeout(() => {
    if (!recoverySessionReady) {
      showPasswordNotice(
        "This recovery link is invalid, expired or has already been used. Request a new link.",
        "error"
      );
    }
  }, 1800);
}

async function updatePassword(event) {
  event.preventDefault();

  const client = getPasswordClient();
  const button = document.getElementById("updatePasswordButton");
  const password = document.getElementById("newPassword").value;
  const confirmation = document.getElementById("confirmPassword").value;

  if (!recoverySessionReady) {
    showPasswordNotice("Open this page using a valid recovery email link.", "error");
    return;
  }

  if (password.length < 12) {
    showPasswordNotice("Use a password containing at least 12 characters.", "error");
    return;
  }

  if (password !== confirmation) {
    showPasswordNotice("The two passwords do not match.", "error");
    return;
  }

  button.disabled = true;
  button.textContent = "Saving…";

  const { error } = await client.auth.updateUser({ password });

  if (error) {
    button.disabled = false;
    button.textContent = "Save new password";
    showPasswordNotice(error.message, "error");
    return;
  }

  await client.auth.signOut({ scope: "local" });

  event.currentTarget.reset();
  event.currentTarget.hidden = true;

  showPasswordNotice(
    "Your password has been updated. You can now sign in to the club dashboard.",
    "success"
  );
}

document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("resetPasswordForm")
    .addEventListener("submit", updatePassword);

  initialisePasswordReset();
});
