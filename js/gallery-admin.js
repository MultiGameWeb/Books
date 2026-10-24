import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { auth, db } from "./db.js";
import { isFirebaseConfigured } from "./firebase-config.js";
import { compressImage } from "./images.js";

const ADMIN_EMAIL = "devinaresh4@gmail.com";
const $ = (selector) => document.querySelector(selector);
const els = {
  authPanel: $("#galleryAuthPanel"),
  dashboard: $("#galleryDashboard"),
  email: $("#galleryAdminEmail"),
  signIn: $("#gallerySignIn"),
  signOut: $("#gallerySignOut"),
  authStatus: $("#galleryAuthStatus"),
  form: $("#galleryForm"),
  imageFile: $("#galleryImageFile"),
  caption: $("#galleryCaption"),
  sortOrder: $("#gallerySortOrder"),
  visible: $("#galleryVisible"),
  imagePreview: $("#galleryImagePreview"),
  imagePreviewPhoto: $("#galleryImagePreviewPhoto"),
  progress: $("#galleryUploadProgress"),
  formError: $("#galleryFormError"),
  save: $("#gallerySave"),
  list: $("#galleryAdminList"),
  status: $("#galleryAdminStatus"),
  refresh: $("#galleryRefresh")
};

let savedPhotos = [];
let selectedCompressedImage = "";
let selectedCompressedImageFile = null;

function status(element, message, kind = "info") {
  element.textContent = message || "";
  element.hidden = !message;
  element.dataset.kind = kind;
}

function createElement(tag, className, value) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (value !== undefined && value !== null) element.textContent = String(value);
  return element;
}

function safeImage(value) {
  return typeof value === "string" && /^data:image\/jpeg;base64,/i.test(value);
}

function safePhotoUrl(image, value, alt) {
  if (!safeImage(value)) {
    image.removeAttribute("src");
    image.hidden = true;
    return false;
  }
  image.src = value;
  image.alt = alt || "";
  image.hidden = false;
  return true;
}

function userIsAllowed(user) {
  return Boolean(
    user &&
    user.emailVerified === true &&
    String(user.email || "").trim().toLowerCase() === ADMIN_EMAIL
  );
}

function setError(message) {
  els.formError.textContent = message || "";
}

function setImagePreview(value) {
  const valid = safePhotoUrl(els.imagePreviewPhoto, value, "Selected gallery photo");
  els.imagePreview.hidden = !valid;
}

async function loadGallery() {
  status(els.status, "Loading gallery photos…");
  els.list.replaceChildren();
  try {
    const snapshot = await getDocs(query(collection(db, "gallery"), where("visible", "in", [true, false])));
    savedPhotos = snapshot.docs
      .map((entry) => ({ id: entry.id, ...entry.data() }))
      .sort((a, b) => {
        const ao = Number.isFinite(Number(a.sortOrder)) ? Number(a.sortOrder) : Number.MAX_SAFE_INTEGER;
        const bo = Number.isFinite(Number(b.sortOrder)) ? Number(b.sortOrder) : Number.MAX_SAFE_INTEGER;
        return ao - bo || String(a.caption || "").localeCompare(String(b.caption || ""));
      });
    renderGalleryList();
    status(els.status, savedPhotos.length ? savedPhotos.length + " photo(s) loaded." : "No gallery photos yet. Add the first photo above.");
  } catch (error) {
    console.error("Could not load gallery administration records:", error);
    status(els.status, "Could not load gallery photos. Confirm that the gallery Firestore rules have been published.", "error");
  }
}

function renderGalleryList() {
  els.list.replaceChildren();
  if (!savedPhotos.length) {
    els.list.append(createElement("div", "empty-state", "No gallery photos have been added yet."));
    return;
  }

  savedPhotos.forEach((photo) => {
    const card = createElement("article", "gallery-admin-card");
    const image = createElement("img", "gallery-admin-thumb");
    if (safeImage(photo.image)) safePhotoUrl(image, photo.image, String(photo.caption || "Gallery photo"));
    else image.alt = "Image data unavailable";
    const main = createElement("div", "gallery-admin-detail");
    main.append(createElement("h3", "book-title", String(photo.caption || "Untitled caption")));
    main.append(createElement("p", "book-meta", "Order: " + String(photo.sortOrder ?? "—") + " · " + (photo.visible === true ? "Visible on website" : "Hidden from website")));
    const actions = createElement("div", "gallery-admin-actions");
    const visibilityButton = createElement("button", "btn btn-outline btn-small", photo.visible === true ? "Hide" : "Show");
    visibilityButton.type = "button";
    visibilityButton.addEventListener("click", async () => {
      visibilityButton.disabled = true;
      try {
        await updateDoc(doc(db, "gallery", photo.id), {
          visible: photo.visible !== true,
          updatedAt: serverTimestamp()
        });
        await loadGallery();
      } catch (error) {
        console.error("Could not update gallery visibility:", error);
        status(els.status, "Could not update photo visibility. Confirm Firestore rules are published.", "error");
      } finally {
        visibilityButton.disabled = false;
      }
    });
    const deleteButton = createElement("button", "btn btn-danger btn-small", "Delete");
    deleteButton.type = "button";
    deleteButton.addEventListener("click", async () => {
      const confirmed = window.confirm("Delete this gallery photo permanently?");
      if (!confirmed) return;
      deleteButton.disabled = true;
      try {
        await deleteDoc(doc(db, "gallery", photo.id));
        await loadGallery();
      } catch (error) {
        console.error("Could not delete gallery photo:", error);
        status(els.status, "Could not delete photo. Confirm Firestore rules are published.", "error");
      } finally {
        deleteButton.disabled = false;
      }
    });
    actions.append(visibilityButton, deleteButton);
    card.append(image, main, actions);
    els.list.append(card);
  });
}

async function saveGalleryPhoto(event) {
  event.preventDefault();
  setError("");
  const file = els.imageFile.files && els.imageFile.files[0];
  const caption = String(els.caption.value || "").trim();
  const sortOrder = Number.parseInt(els.sortOrder.value, 10);
  if (!file) {
    setError("Choose a photo first.");
    return;
  }
  if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
    setError("Please choose a JPG, PNG or WebP image.");
    return;
  }

  els.save.disabled = true;
  els.progress.hidden = false;
  els.progress.value = 12;
  status(els.status, "Compressing photo…");
  try {
    const image = selectedCompressedImageFile === file && selectedCompressedImage
      ? selectedCompressedImage
      : await compressImage(file, {
          maxWidth: 1100,
          maxHeight: 1100,
          maxBytes: 320 * 1024,
          quality: 0.72
        });
    if (!safeImage(image)) throw new Error("The compressed image format was unexpected.");
    els.progress.value = 75;
    const reference = doc(collection(db, "gallery"));
    await setDoc(reference, {
      image,
      caption,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : savedPhotos.length + 1,
      visible: Boolean(els.visible.checked),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    els.progress.value = 100;
    els.form.reset();
    els.sortOrder.value = "0";
    selectedCompressedImage = "";
    selectedCompressedImageFile = null;
    setImagePreview("");
    status(els.status, "Photo saved.");
    await loadGallery();
  } catch (error) {
    console.error("Could not save gallery photo:", error);
    setError(error && error.message ? error.message : "Could not save this photo. Please try again.");
    status(els.status, "Could not save photo. Confirm that the gallery Firestore rules have been published.", "error");
  } finally {
    els.progress.hidden = true;
    els.progress.value = 0;
    els.save.disabled = false;
  }
}

async function signIn() {
  if (!isFirebaseConfigured() || !auth || !db) {
    status(els.authStatus, "Firebase is not configured. Ask the site administrator to check the project settings.", "error");
    return;
  }
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  els.signIn.disabled = true;
  status(els.authStatus, "Connecting to Google…");
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    if (error && ["auth/popup-blocked", "auth/operation-not-supported-in-this-environment"].includes(error.code)) {
      try {
        await signInWithRedirect(auth, provider);
        return;
      } catch (redirectError) {
        console.error("Gallery manager redirect sign-in failed:", redirectError);
        status(els.authStatus, "Google sign-in could not be completed. Please try again.", "error");
      }
    } else {
      console.error("Gallery manager Google sign-in failed:", error);
      status(els.authStatus, error && error.code === "auth/unauthorized-domain"
        ? "This site domain is not authorized in Firebase Authentication."
        : "Google sign-in failed. Please try again.", "error");
    }
  } finally {
    els.signIn.disabled = false;
  }
}

els.signIn.addEventListener("click", signIn);
els.signOut.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Gallery manager sign-out failed:", error);
    status(els.authStatus, "Could not sign out. Please refresh the page.", "error");
  }
});
els.refresh.addEventListener("click", loadGallery);
els.form.addEventListener("submit", saveGalleryPhoto);
els.imageFile.addEventListener("change", async () => {
  setError("");
  selectedCompressedImage = "";
  selectedCompressedImageFile = null;
  setImagePreview("");
  const file = els.imageFile.files && els.imageFile.files[0];
  if (!file) return;
  try {
    const preview = await compressImage(file, { maxWidth: 700, maxHeight: 700, maxBytes: 180 * 1024, quality: 0.7 });
    selectedCompressedImage = preview;
    selectedCompressedImageFile = file;
    setImagePreview(preview);
  } catch (error) {
    console.error("Gallery photo preview compression failed:", error);
    setError(error && error.message ? error.message : "Could not preview this photo.");
  }
});

if (!isFirebaseConfigured() || !auth || !db) {
  status(els.authStatus, "Firebase is not configured. Ask the site administrator to check the project settings.", "error");
} else {
  getRedirectResult(auth).catch((error) => {
    console.error("Google redirect sign-in result failed:", error);
    status(els.authStatus, "Google sign-in did not finish. Please try again.", "error");
  });
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      els.authPanel.hidden = false;
      els.dashboard.hidden = true;
      els.signOut.hidden = true;
      els.email.textContent = "";
      return;
    }
    if (!userIsAllowed(user)) {
      await signOut(auth);
      status(els.authStatus, "Access is limited to the approved, verified author account.", "error");
      return;
    }
    els.authPanel.hidden = true;
    els.dashboard.hidden = false;
    els.signOut.hidden = false;
    els.email.textContent = user.email || "";
    await loadGallery();
  });
}
