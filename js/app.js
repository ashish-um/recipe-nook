// js/app.js

import {
  signOut, markAuthed, trySilentRestore, getEmail, onReady, onSignOut, makeRefreshCallback
} from "./auth.js";
import { 
  showApp, showView, renderRecipeList, loadThumbnails, 
  renderRecipeDetail, setVideoURL, revokeDetailURLs, showToast,
  showForm, getFormValues, setProgress, setFormSaving 
} from "./ui.js";
import { 
  initRecipes, listRecipes, getRecipe, createRecipe, updateRecipe, deleteRecipe, 
  uploadCoverPhoto, uploadVideo, getBlobURL, replaceBinary 
} from "./recipes.js";

// ─── State ────────────────────────────────────────────────────────────────────
let currentRecipeId = null;

// ─── Auth Callbacks ───────────────────────────────────────────────────────────

onReady(async (token) => {
  markAuthed();
  initRecipes(token, makeRefreshCallback());
  showApp(getEmail());
  
  await refreshRecipeList();
});

onSignOut(() => {
  window.location.href = "/login.html";
});

// ─── App Logic ────────────────────────────────────────────────────────────────

async function refreshRecipeList() {
  const recipes = await listRecipes();
  renderRecipeList(recipes, { 
    onSelect: openRecipeDetail 
  });
  loadThumbnails(recipes, getBlobURL);
}

async function openRecipeDetail(id) {
  currentRecipeId = id;
  showView("view-loading");
  
  try {
    const recipe = await getRecipe(id);
  
  // Read cover synchronously if it exists
  let coverURL = null;
  if (recipe.coverPhoto) {
    coverURL = await getBlobURL(recipe.coverPhoto);
  }
  
  renderRecipeDetail(recipe, coverURL, {
    onEdit: () => {
        const vidNode = document.getElementById("detail-video");
        const currentVideoURL = !vidNode.classList.contains("hidden") && vidNode.src ? vidNode.src : null;
        openForm(recipe, coverURL, currentVideoURL);
    },
    onDelete: async () => {
      if (!confirm("Are you sure you want to delete this recipe?")) return;
      await deleteRecipe(id);
      revokeDetailURLs();
      await refreshRecipeList();
      showToast("Recipe deleted");
    },
    onBack: () => {
      revokeDetailURLs();
      showView("view-list");
    }
  });

  // Load video asynchronously if it exists
  if (recipe.video) {
    getBlobURL(recipe.video).then(url => {
        if (currentRecipeId === id && url) { // Verify we haven't navigated away
           setVideoURL(url);
        } else if (url) {
           URL.revokeObjectURL(url);
        }
    }).catch(console.error);
  }
  
  } catch (err) {
    showToast("Error loading recipe");
    showView("view-list");
  }
}

// ─── Form Logic ───────────────────────────────────────────────────────────────

document.getElementById("home-btn").addEventListener("click", () => {
  if (document.getElementById("app").classList.contains("hidden")) return;
  revokeDetailURLs();
  showView("view-list");
});

document.getElementById("new-recipe-btn").addEventListener("click", () => openForm(null));

document.getElementById("form-cancel-btn").addEventListener("click", () => {
  if (currentRecipeId) {
    showView("view-detail");
  } else {
    showView("view-list");
  }
});

function openForm(recipe = null, coverURL = null, videoURL = null) {
  currentRecipeId = recipe?.id || null;
  showForm(recipe, coverURL, videoURL);
}

document.getElementById("form-save-btn").addEventListener("click", async () => {
  const { title, ingredients, steps, coverPhotoFile: photoFile, videoFile } = getFormValues();
  
  if (!title) return showToast("Title is required");
  
  const data = { title, ingredients, steps };
  
  setFormSaving(true);
  
  try {
    let finalRecipe;
    
    if (currentRecipeId) {
      // Update existing
      finalRecipe = await updateRecipe(currentRecipeId, data);
      
      const ops = [];
      if (photoFile) {
        ops.push(replaceBinary(finalRecipe.coverPhoto, finalRecipe.id, photoFile, "cover", ({ percent }) => {
          setProgress("photo", Math.round(percent));
        }).then(name => { finalRecipe.coverPhoto = name; }));
      }
      if (videoFile) {
        ops.push(replaceBinary(finalRecipe.video, finalRecipe.id, videoFile, "video", ({ percent }) => {
          setProgress("video", Math.round(percent));
        }).then(name => { finalRecipe.video = name; }));
      }
      
      await Promise.all(ops);
      if (photoFile || videoFile) {
        finalRecipe = await updateRecipe(currentRecipeId, finalRecipe); // update refs
      }
      showToast("Recipe updated");
    } else {
      // Create new
      finalRecipe = await createRecipe(data);
      
      const ops = [];
      if (photoFile) {
        ops.push(uploadCoverPhoto(finalRecipe.id, photoFile, ({ percent }) => {
          setProgress("photo", Math.round(percent));
        }).then(name => { finalRecipe.coverPhoto = name; }));
      }
      if (videoFile) {
        ops.push(uploadVideo(finalRecipe.id, videoFile, ({ percent }) => {
          setProgress("video", Math.round(percent));
        }).then(name => { finalRecipe.video = name; }));
      }
      
      await Promise.all(ops);
      if (photoFile || videoFile) {
        finalRecipe = await updateRecipe(finalRecipe.id, finalRecipe); // update refs
      }
      showToast("Recipe created");
    }
    
    await refreshRecipeList();
    openRecipeDetail(finalRecipe.id);
  } catch (err) {
    showToast("Error saving recipe");
    console.error(err);
  } finally {
    setFormSaving(false);
  }
});

// ─── Init ─────────────────────────────────────────────────────────────────────

showView("view-loading");

const restoring = await trySilentRestore();
if (!restoring) {
  window.location.href = "/login.html";
}

document.getElementById("sign-out-btn").addEventListener("click", signOut);
