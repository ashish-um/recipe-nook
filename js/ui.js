// js/ui.js

// ─── View Management ──────────────────────────────────────────────────────────

const views = ["view-list", "view-detail", "view-form", "view-loading"];

export function showView(id) {
  views.forEach(v => {
    document.getElementById(v).classList.add("hidden");
    document.getElementById(v).classList.remove("flex");
  });
  
  const el = document.getElementById(id);
  el.classList.remove("hidden");
  
  // Update floating action button visibility globally
  // We want it visible when 'view-list' is active, and hidden otherwise.
  const fab = document.getElementById("new-recipe-btn");
  if (fab) {
    if (id === "view-list") {
      fab.classList.remove("hidden");
      fab.classList.add("flex");
    } else {
      fab.classList.add("hidden");
      fab.classList.remove("flex");
    }
  }
}

export function showApp(email) {
  if (email && document.getElementById("user-email")) {
    document.getElementById("user-email").textContent = email;
    if (document.getElementById("user-initial")) {
      document.getElementById("user-initial").textContent = email.charAt(0).toUpperCase();
    }
  }
}



export function showToast(message) {
  const toast = document.getElementById("toast");
  document.getElementById("toast-text").textContent = message;
  toast.classList.remove("hidden");
  toast.classList.add("flex");
  
  setTimeout(() => {
    toast.classList.add("hidden");
    toast.classList.remove("flex");
  }, 4000);
}

// ─── Recipe List ──────────────────────────────────────────────────────────────

export function renderRecipeList(recipes, { onSelect }) {
  const grid  = document.getElementById("recipe-grid");
  const empty = document.getElementById("recipe-empty");

  if (recipes.length === 0) {
    grid.innerHTML = "";
    empty.classList.remove("hidden");
    empty.classList.add("flex");
    showView("view-list");
    return;
  }

  empty.classList.add("hidden");
  empty.classList.remove("flex");

  grid.innerHTML = recipes.map(r => `
    <div
      class="bg-white border-2 border-slate-100 rounded-3xl overflow-hidden cursor-pointer hover:border-blue-400 hover:bg-blue-50/10 transition-colors duration-300 group flex flex-col relative"
      data-id="${r.id}"
    >
      <div class="w-full aspect-[4/3] bg-slate-100 flex items-center justify-center overflow-hidden border-b border-slate-50">
        ${r.coverPhoto
          ? `<img data-photo="${r.coverPhoto}" class="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110" />`
          : `<svg class="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`
        }
      </div>
      <div class="p-6 flex-1 flex flex-col bg-white">
        <h3 class="text-xl font-bold text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors">${r.title}</h3>
        <p class="text-sm text-slate-500 mt-2 font-semibold">${r.ingredients.length} ingredients • ${r.steps.length} steps</p>
      </div>
    </div>
  `).join("");

  grid.querySelectorAll("[data-id]").forEach(el => {
    el.addEventListener("click", () => onSelect(el.dataset.id));
  });

  showView("view-list");
}

export function loadThumbnails(recipes, getBlobURL) {
  recipes.forEach(async (r) => {
    if (!r.coverPhoto) return;
    try {
      const url = await getBlobURL(r.coverPhoto);
      const img = document.querySelector(`img[data-photo="${r.coverPhoto}"]`);
      if (img) img.src = url;
    } catch (_) {}
  });
}

// ─── Recipe Detail ────────────────────────────────────────────────────────────

export function renderRecipeDetail(recipe, coverURL, { onEdit, onDelete, onBack }) {
  document.getElementById("detail-title").textContent = recipe.title;

  document.getElementById("detail-ingredients").innerHTML =
    recipe.ingredients.map(i => `<li class="text-lg text-slate-700 flex items-start gap-4 p-2 hover:bg-slate-50 transition-colors rounded-xl">
      <div class="mt-2.5 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></div>
      <span class="leading-relaxed font-semibold">${i}</span>
    </li>`).join("");

  document.getElementById("detail-steps").innerHTML =
    recipe.steps.map((s, i) => `<li class="text-lg text-slate-700 flex items-start gap-5 p-3 hover:bg-slate-50 transition-colors rounded-3xl">
      <div class="flex-shrink-0 w-10 h-10 rounded-full bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-black text-base shadow-sm">${i + 1}</div>
      <span class="leading-relaxed pt-1.5 font-medium">${s}</span>
    </li>`).join("");

  const coverWrap = document.getElementById("detail-cover");
  const coverImg  = document.getElementById("detail-cover-img");
  if (coverURL) {
    coverImg.src = coverURL;
    coverWrap.classList.remove("hidden");
  } else {
    coverWrap.classList.add("hidden");
  }

  const videoWrap    = document.getElementById("detail-video-wrap");
  const videoEl      = document.getElementById("detail-video");
  const videoLoading = document.getElementById("detail-video-loading");

  if (recipe.video) {
    videoWrap.classList.remove("hidden");
    videoEl.classList.add("hidden");
    videoLoading.classList.remove("hidden");
    videoLoading.classList.add("flex");
  } else {
    videoWrap.classList.add("hidden");
  }

  document.getElementById("edit-recipe-btn").onclick   = onEdit;
  document.getElementById("delete-recipe-btn").onclick = onDelete;
  document.getElementById("back-btn").onclick          = onBack;

  showView("view-detail");
}

export function setVideoURL(url) {
  const videoEl      = document.getElementById("detail-video");
  const videoLoading = document.getElementById("detail-video-loading");
  videoEl.src = url;
  videoEl.classList.remove("hidden");
  videoLoading.classList.add("hidden");
  videoLoading.classList.remove("flex");
}

export function revokeDetailURLs() {
  const img   = document.getElementById("detail-cover-img");
  const video = document.getElementById("detail-video");
  if (img.src && img.src.startsWith("blob:"))   { URL.revokeObjectURL(img.src);   img.src   = ""; }
  if (video.src && video.src.startsWith("blob:")) { URL.revokeObjectURL(video.src); video.src = ""; }
}

// ─── Form ─────────────────────────────────────────────────────────────────────

export function showForm(recipe = null, coverURL = null, videoURL = null) {
  document.getElementById("form-title").textContent = recipe ? "Edit Recipe" : "New Recipe";
  document.getElementById("form-recipe-title").value = recipe?.title ?? "";
  document.getElementById("form-ingredients").value  = recipe?.ingredients?.join("\n") ?? "";
  document.getElementById("form-steps").value        = recipe?.steps?.join("\n") ?? "";
  
  // Clear file inputs
  document.getElementById("form-cover-photo").value  = "";
  document.getElementById("form-video").value        = "";
  resetProgress("photo");
  resetProgress("video");

  // Handle Cover Photo preview
  const coverPreviewWrap = document.getElementById("form-cover-preview-wrap");
  const coverPreviewImg = document.getElementById("form-cover-preview");
  const coverStatus = document.getElementById("form-cover-status");
  
  if (coverURL) {
    coverPreviewImg.src = coverURL;
    coverPreviewWrap.classList.remove("hidden");
    coverStatus.classList.remove("hidden");
  } else {
    coverPreviewImg.src = "";
    coverPreviewWrap.classList.add("hidden");
    coverStatus.classList.add("hidden");
  }

  // Handle Video preview
  const videoPreviewWrap = document.getElementById("form-video-preview-wrap");
  const videoPreviewVideo = document.getElementById("form-video-preview");
  const videoStatus = document.getElementById("form-video-status");
  
  if (videoURL) {
    videoPreviewVideo.src = videoURL;
    videoPreviewWrap.classList.remove("hidden");
    videoStatus.classList.remove("hidden");
  } else {
    videoPreviewVideo.src = "";
    videoPreviewWrap.classList.add("hidden");
    videoStatus.classList.add("hidden");
  }

  showView("view-form");
}

export function getFormValues() {
  return {
    title: document.getElementById("form-recipe-title").value.trim(),
    ingredients: document.getElementById("form-ingredients").value
      .split("\n").map(s => s.trim()).filter(Boolean),
    steps: document.getElementById("form-steps").value
      .split("\n").map(s => s.trim()).filter(Boolean),
    coverPhotoFile: document.getElementById("form-cover-photo").files[0] ?? null,
    videoFile: document.getElementById("form-video").files[0] ?? null,
  };
}

export function setProgress(type, percent) {
  const wrap  = document.getElementById(`${type}-progress-wrap`);
  const fill  = document.getElementById(`${type}-progress-fill`);
  const label = document.getElementById(`${type}-progress-label`);
  wrap.classList.remove("hidden");
  fill.style.width   = `${percent}%`;
  label.textContent  = `${percent}%`;
}

function resetProgress(type) {
  const wrap = document.getElementById(`${type}-progress-wrap`);
  if (!wrap) return;
  wrap.classList.add("hidden");
  document.getElementById(`${type}-progress-fill`).style.width = "0%";
  document.getElementById(`${type}-progress-label`).textContent = "0%";
}

export function setFormSaving(saving) {
  const btn = document.getElementById("form-save-btn");
  btn.disabled     = saving;
  btn.innerHTML  = saving ? `<svg class="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Saving...` : `<svg fill="currentColor" viewBox="0 0 20 20" class="w-6 h-6"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg> Save Recipe`;
}
