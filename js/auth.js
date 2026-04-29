// js/auth.js
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { auth } from "./firebase-config.js";

// ─── Page Protection ───────────────────────────────────────────────────────────
// Call on every protected page. Redirects to index.html if not authenticated.
export function requireAuth() {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = "index.html";
    }
  });
}

// ─── Login ─────────────────────────────────────────────────────────────────────
export function handleLogin() {
  const form = document.getElementById("loginForm");
  const errorEl = document.getElementById("loginError");
  const btnText = document.getElementById("btnText");
  const btnSpinner = document.getElementById("btnSpinner");

  if (!form) return;

  // If already logged in, go straight to dashboard
  onAuthStateChanged(auth, (user) => {
    if (user) window.location.href = "dashboard.html";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (errorEl) errorEl.textContent = "";
    if (btnText) btnText.textContent = "Signing in…";
    if (btnSpinner) btnSpinner.classList.remove("hidden");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = "dashboard.html";
    } catch (err) {
      let msg = "Invalid credentials. Please try again.";
      if (err.code === "auth/user-not-found") msg = "No account found with this email.";
      if (err.code === "auth/wrong-password") msg = "Incorrect password.";
      if (err.code === "auth/too-many-requests") msg = "Too many attempts. Try again later.";
      if (errorEl) errorEl.textContent = msg;
      if (btnText) btnText.textContent = "Sign In";
      if (btnSpinner) btnSpinner.classList.add("hidden");
    }
  });
}

// ─── Logout ────────────────────────────────────────────────────────────────────
export function handleLogout() {
  const btn = document.getElementById("logoutBtn");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "index.html";
  });
}

// ─── Display current user email ────────────────────────────────────────────────
export function showCurrentUser() {
  onAuthStateChanged(auth, (user) => {
    const el = document.getElementById("currentUser");
    if (el && user) el.textContent = user.email;
  });
}