import { initAuth, signIn, onReady, trySilentRestore } from "./auth.js";

onReady((token) => {
  window.location.href = "/";
});

document.getElementById("sign-in-btn").addEventListener("click", () => {
    document.getElementById("sign-in-btn").classList.add("hidden");
    document.getElementById("sign-in-btn").classList.remove("flex");
    document.getElementById("restoring-msg").classList.remove("hidden");
    document.getElementById("restoring-msg").classList.add("flex");
    document.getElementById("restoring-msg").innerHTML = `
      <svg class="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
      Waiting for Google...`;
    
    signIn();
});

// Run session check on mount
const restoring = await trySilentRestore();
if (restoring) {
    window.location.href = "/";
} else {
    document.getElementById("restoring-msg").classList.add("hidden");
    document.getElementById("restoring-msg").classList.remove("flex");
    document.getElementById("sign-in-btn").classList.remove("hidden");
    document.getElementById("sign-in-btn").classList.add("flex");
    await initAuth();
}
