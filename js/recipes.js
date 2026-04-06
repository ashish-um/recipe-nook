// js/recipes.js

import { DriveCRUD } from "../lib/@ashish-um/nook/dist/index.js";
import { DriveFiles } from "../lib/@ashish-um/nook-files/dist/index.js";

const PREFIX = "recipes/";

let drive = null;
let files = null;

// Called by app.js once we have a token
export function initRecipes(token, onTokenExpired) {
  drive = new DriveCRUD(token, { onTokenExpired });
  files = new DriveFiles(token, { onTokenExpired });
}

// List all recipe metadata entries
export async function listRecipes() {
  const entries = await drive.list(PREFIX);
  // Filter out binary files — we only want the JSON records
  const jsonEntries = entries.filter(e => e.name.endsWith(".json"));
  // Read all recipes in parallel
  const recipes = await Promise.all(jsonEntries.map(e => drive.read(e.name)));
  // Sort newest first
  return recipes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// Read a single recipe
export async function getRecipe(id) {
  return drive.read(`${PREFIX}${id}.json`);
}

// Create a new recipe (metadata only — photos/videos uploaded separately)
export async function createRecipe(data) {
  const id = Date.now().toString();
  const recipe = {
    id,
    title: data.title,
    ingredients: data.ingredients,
    steps: data.steps,
    coverPhoto: null,
    video: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await drive.create(`${PREFIX}${id}.json`, recipe);
  return recipe;
}

// Update recipe metadata
export async function updateRecipe(id, data) {
  const existing = await getRecipe(id);
  const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
  await drive.update(`${PREFIX}${id}.json`, updated);
  return updated;
}

// Upload cover photo — returns the filename stored in Drive
export async function uploadCoverPhoto(id, file, onProgress) {
  const name = `${PREFIX}${id}/cover.${getExt(file)}`;
  await files.create(name, file, { onProgress });
  return name;
}

// Upload recipe video — returns the filename stored in Drive
export async function uploadVideo(id, file, onProgress) {
  const name = `${PREFIX}${id}/video.${getExt(file)}`;
  await files.create(name, file, { onProgress });
  return name;
}

// Get a blob URL for a stored binary file (photo or video)
// Returns null if name is null (no file uploaded)
export async function getBlobURL(name) {
  if (!name) return null;
  const blob = await files.read(name);
  return URL.createObjectURL(blob);
}

// Delete a recipe and all its associated binary files
export async function deleteRecipe(id) {
  const recipe = await getRecipe(id);

  // Delete binary files first, then the JSON — order matters
  const deleteOps = [];
  if (recipe.coverPhoto) deleteOps.push(files.delete(recipe.coverPhoto));
  if (recipe.video)      deleteOps.push(files.delete(recipe.video));
  await Promise.all(deleteOps);

  await drive.delete(`${PREFIX}${id}.json`);
}

// Replace a binary file during edit
// Creates if it doesn't exist yet, updates if it does
export async function replaceBinary(existingName, id, file, type, onProgress) {
  const ext = getExt(file);
  const newName = `${PREFIX}${id}/${type}.${ext}`;

  if (existingName) {
    // If name matches (same extension), update in place
    if (existingName === newName) {
      await files.update(newName, file, { onProgress });
      return newName;
    }
    // Extension changed — delete old, create new
    await files.delete(existingName);
  }
  await files.create(newName, file, { onProgress });
  return newName;
}

function getExt(file) {
  return file.name.split(".").pop().toLowerCase() || "bin";
}
