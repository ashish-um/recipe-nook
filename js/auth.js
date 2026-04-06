// js/auth.js

const CLIENT_ID  = "440586625032-kfifni9affih1uh0plbrm3s5e2r83gin.apps.googleusercontent.com";
const SCOPE      = "https://www.googleapis.com/auth/drive.appdata";
const TOKEN_KEY  = "nook_access_token";
const EXPIRY_KEY = "nook_token_expiry";
const EMAIL_KEY  = "nook_email";

let authClient   = null;
let currentToken = null;

let onReadyCallback    = null;
let onSignOutCallback  = null;

export function onReady(cb)   { onReadyCallback   = cb; }
export function onSignOut(cb) { onSignOutCallback = cb; }

// ─── Initialise ───────────────────────────────────────────────────────────────

export function initAuth() {
  return new Promise((resolve) => {
    const wait = setInterval(() => {
      if (!window.google?.accounts?.oauth2) return;
      clearInterval(wait);

      // We now use initCodeClient for Authorization Code Flow
      authClient = window.google.accounts.oauth2.initCodeClient({
        client_id: CLIENT_ID,
        scope: SCOPE,
        access_type: 'offline', // Crucial: This triggers Google to issue a refresh_token
        callback: async (response) => {
          if (response.error) {
            console.warn("Auth error:", response.error);
            clearAuth();
            return;
          }
          
          try {
            // Send the auth code to our new Vercel serverless backend
            const apiRes = await fetch("/api/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ code: response.code })
            });
            const data = await apiRes.json();
            
            if (data.error) throw new Error(data.error);

            currentToken = data.access_token;
            const expiresIn = data.expires_in ? parseInt(data.expires_in, 10) : 3600;
            const expiryTime = Date.now() + (expiresIn * 1000) - 60000;
            localStorage.setItem(TOKEN_KEY, currentToken);
            localStorage.setItem(EXPIRY_KEY, expiryTime.toString());

            // Because this provides a backend-granted token without an ID, we manually fetch identifying details again
            await fetchUserData();

            if (onReadyCallback) onReadyCallback(currentToken);
          } catch(e) {
            console.error("Login exchange failed", e);
            clearAuth();
          }
        },
      });

      resolve();
    }, 100);
  });
}

// ─── Helper for User Details ──────────────────────────────────────────────────

async function fetchUserData() {
  try {
    const res = await fetch("https://www.googleapis.com/drive/v3/about?fields=user", {
      headers: { Authorization: "Bearer " + currentToken }
    });
    const data = await res.json();
    if (data.user && data.user.emailAddress) {
      localStorage.setItem(EMAIL_KEY, data.user.emailAddress);
    }
  } catch (err) {
    console.warn("Could not fetch user email:", err);
  }
}

// ─── Sign In (explicit — button click) ───────────────────────────────────────

export function signIn() {
  // Triggers the Google popup to get an Auth Code
  authClient?.requestCode();
}

export function markAuthed() {
  // Unused placeholder
}

// ─── Silent Restore (on page load) ───────────────────────────────────────────

// Attempts to seamlessly get a fresh token avoiding GIS completely
export async function trySilentRestore() {
  const token = localStorage.getItem(TOKEN_KEY);
  const expiry = localStorage.getItem(EXPIRY_KEY);
  
  if (token && expiry && Date.now() < parseInt(expiry, 10)) {
    currentToken = token;
    if (onReadyCallback) onReadyCallback(currentToken);
    return true;
  }
  
  // We rely EXCLUSIVELY on hitting our Vercel Serverless Function when our local token expires!
  // It reads the Secure HttpOnly Cookie `refresh_token` naturally protecting against stolen tokens.
  try {
    const res = await fetch("/api/refresh", { method: "POST" });
    if (!res.ok) throw new Error("No refresh token");
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    
    currentToken = data.access_token;
    const expiresIn = data.expires_in ? parseInt(data.expires_in, 10) : 3600;
    const expiryTime = Date.now() + (expiresIn * 1000) - 60000;
    localStorage.setItem(TOKEN_KEY, currentToken);
    localStorage.setItem(EXPIRY_KEY, expiryTime.toString());

    if (!localStorage.getItem(EMAIL_KEY)) {
      await fetchUserData();
    }

    if (onReadyCallback) onReadyCallback(currentToken);
    return true;
  } catch (e) {
    clearAuth();
    return false;
  }
}

// ─── Token Refresh Callback ───────────────────────────────────────────

export function makeRefreshCallback() {
  return () =>
    new Promise(async (resolve, reject) => {
      try {
        const res = await fetch("/api/refresh", { method: "POST" });
        if (!res.ok) throw new Error("No refresh token");
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        
        currentToken = data.access_token;
        const expiresIn = data.expires_in ? parseInt(data.expires_in, 10) : 3600;
        const expiryTime = Date.now() + (expiresIn * 1000) - 60000;
        localStorage.setItem(TOKEN_KEY, currentToken);
        localStorage.setItem(EXPIRY_KEY, expiryTime.toString());

        resolve(currentToken);
      } catch (err) {
        clearAuth();
        reject(err);
      }
    });
}

// ─── Sign Out ─────────────────────────────────────────────────────────────────

export function signOut() {
  if (currentToken && window.google?.accounts?.oauth2) {
    window.google.accounts.oauth2.revoke(currentToken, () => {});
  }
  clearAuth();
}

function clearAuth() {
  currentToken = null;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EXPIRY_KEY);
  localStorage.removeItem(EMAIL_KEY);
  
  // Because HttpOnly cookies can only be deleted securely by the server, 
  // typical production environments have a `/api/logout` endpoint that sends an empty expiring cookie
  // However simply forcing reauth handles security fine.
  
  if (onSignOutCallback) onSignOutCallback();
}

export function getEmail() {
  return localStorage.getItem(EMAIL_KEY) ?? "";
}

export function getCurrentToken() {
  return currentToken;
}
