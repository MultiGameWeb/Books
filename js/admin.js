import {
  auth,
  db,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  getAllBooks,
  getBookPages
} from "./db.js";
import { isFirebaseConfigured } from "./firebase-config.js";
import { compressAuthorPhoto, compressCover, compressSamplePage } from "./images.js";
import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

// Replace these placeholders with the exact author email(s). Keep this list in sync with firestore.rules.
const ADMIN_EMAILS = ["devinaresh4@gmail.com"]
  .map((email) => email.trim().toLowerCase())
  .filter((email) => email.includes("@") && !email.startsWith("admin_email_"));

const $ = (selector) => document.querySelector(selector);
const signInView = $("#signInView");
const dashboardView = $("#dashboardView");
const googleSignInButton = $("#googleSignInButton");
const authStatus = $("#authStatus");
const signedInEmail = $("#signedInEmail");
const signOutButton = $("#signOutButton");
const booksStatus = $("#booksStatus");
const booksList = $("#booksList");
const bookEditor = $("#bookEditor");
const bookForm = $("#bookForm");
const bookFormError = $("#bookFormError");
const bookUploadStatus = $("#bookUploadStatus");
const bookUploadProgress = $("#bookUploadProgress");
const coverPreviewWrap = $("#coverPreviewWrap");
const pagePreviewWrap = $("#pagePreviewWrap");
const existingPagesHelp = $("#existingPagesHelp");
const settingsForm = $("#settingsForm");
const settingsFormError = $("#settingsFormError");
const settingsStatus = $("#settingsStatus");
const authorPhotoPreviewWrap = $("#authorPhotoPreviewWrap");

let booksCache = [];
let editingBook = null;
let editingPages = [];
let currentSettings = {};
let currentAuthorPhotoPreviewUrl = null;
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

function status(element, message, kind = "info") {
  if (!element) return;
  element.textContent = message || "";
  element.dataset.kind = kind;
  element.hidden = !message;
}

function userMessage(error) {
  const code = String(error?.code || "");
  if (code.includes("permission-denied")) return "Firestore denied this action. Check that your email is in firestore.rules and that the rules have been published in Firebase Console.";
  if (code.includes("unauthorized-domain")) return "This domain is not authorized for Google sign-in. In Firebase Console → Authentication → Settings → Authorized domains, add multigameweb.github.io.";
  if (code.includes("network-request-failed")) return "Network error. Check your connection and try again.";
  if (code.includes("popup-blocked")) return "The sign-in popup was blocked. Redirect sign-in will be attempted.";
  return error?.message || "Something went wrong. Please try again.";
}

function showSignIn() {
  signInView.hidden = false;
  dashboardView.hidden = true;
  signOutButton.hidden = true;
  signedInEmail.textContent = "";
}

function showDashboard(user) {
  signInView.hidden = true;
  dashboardView.hidden = false;
  signOutButton.hidden = false;
  signedInEmail.textContent = user.email || "";
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined && text !== null) element.textContent = String(text);
  return element;
}

function makeButton(label, className, handler, ariaLabel = "", disabled = false) {
  const button = createElement("button", className || "btn btn-outline btn-small", label);
  button.type = "button";
  button.disabled = Boolean(disabled);
  if (ariaLabel) button.setAttribute("aria-label", ariaLabel);
  button.addEventListener("click", handler);
  return button;
}

function addBadge(parent, label, isOff = false) {
  const badge = createElement("span", isOff ? "badge badge-off" : "badge", label);
  parent.append(badge);
}

function safeImageData(value) {
  return typeof value === "string" && /^data:image\/(jpeg|png|webp);base64,/i.test(value);
}

function appendPreview(container, src, alt, className = "preview-thumb") {
  if (!safeImageData(src)) return;
  const image = createElement("img", className);
  image.src = src;
  image.alt = alt;
  image.loading = "lazy";
  container.append(image);
}

function previewSelectedFiles(files, container, label, thumbClass = "preview-thumb") {
  container.replaceChildren();
  files.forEach((file, index) => {
    if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) return;
    const image = createElement("img", thumbClass);
    image.alt = `${label} ${index + 1} preview`;
    const url = URL.createObjectURL(file);
    image.onload = () => URL.revokeObjectURL(url);
    image.onerror = () => URL.revokeObjectURL(url);
    image.src = url;
    container.append(image);
  });
}

function inr(value) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value) || 0);
}

async function requireAllowedUser(user) {
  const email = String(user?.email || "").trim().toLowerCase();
  return Boolean(user && user.emailVerified && ADMIN_EMAILS.includes(email));
}

async function loadBooks() {
  status(booksStatus, "Loading books…");
  booksList.replaceChildren();
  try {
    booksCache = await getAllBooks();
    renderBooks();
    status(booksStatus, booksCache.length ? `${booksCache.length} book(s) loaded.` : "No books yet. Select “Add book” to create the first entry.");
  } catch (error) {
    booksCache = [];
    renderBooks();
    status(booksStatus, `Could not load books. ${userMessage(error)}`, "error");
  }
}

function renderBooks() {
  booksList.replaceChildren();
  if (!booksCache.length) {
    booksList.append(createElement("div", "empty-state", "No books have been added yet."));
    return;
  }

  booksCache.forEach((book, index) => {
    const row = createElement("article", "book-row");
    const cover = createElement("div", "book-cover");
    if (safeImageData(book.cover)) {
      const image = createElement("img");
      image.src = book.cover;
      image.alt = `Cover of ${book.title || "book"}`;
      image.loading = "lazy";
      cover.append(image);
    } else {
      cover.textContent = "No cover";
    }

    const details = createElement("div");
    details.append(createElement("h3", "book-title", book.title || "Untitled book"));
    details.append(createElement("p", "book-meta", `${book.author || "Author not set"} · ${inr(book.price)}`));
    if (book.category) details.append(createElement("p", "book-meta", book.category));
    const badges = createElement("div", "badges");
    addBadge(badges, book.inStock ? "In stock" : "Out of stock", !book.inStock);
    addBadge(badges, book.visible ? "Visible on website" : "Hidden from website", !book.visible);
    if (book.amazonUrl) addBadge(badges, "Amazon link set");
    details.append(badges);

    const actions = createElement("div", "book-actions");
    actions.append(makeButton("Edit", "btn btn-outline btn-small", () => openBookEditor(book)));
    actions.append(makeButton("↑", "btn btn-outline btn-small", () => moveBook(index, -1), "Move book up", index === 0));
    actions.append(makeButton("↓", "btn btn-outline btn-small", () => moveBook(index, 1), "Move book down", index === booksCache.length - 1));
    actions.append(makeButton(book.inStock ? "Mark out of stock" : "Mark in stock", "btn btn-outline btn-small", () => toggleBookField(book, "inStock")));
    actions.append(makeButton(book.visible ? "Hide" : "Show", "btn btn-outline btn-small", () => toggleBookField(book, "visible")));
    actions.append(makeButton("Delete", "btn btn-danger btn-small", () => removeBook(book)));
    row.append(cover, details, actions);
    booksList.append(row);
  });
}

async function toggleBookField(book, field) {
  try {
    await updateDoc(doc(db, "books", book.id), { [field]: !Boolean(book[field]), updatedAt: serverTimestamp() });
    status(booksStatus, `${field === "inStock" ? "Stock status" : "Visibility"} updated.`, "success");
    await loadBooks();
  } catch (error) {
    status(booksStatus, userMessage(error), "error");
  }
}

async function moveBook(index, direction) {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= booksCache.length) return;
  const current = booksCache[index];
  const target = booksCache[targetIndex];
  const currentOrder = Number.isFinite(Number(current.sortOrder)) ? Number(current.sortOrder) : index + 1;
  const targetOrder = Number.isFinite(Number(target.sortOrder)) ? Number(target.sortOrder) : targetIndex + 1;
  try {
    await Promise.all([
      updateDoc(doc(db, "books", current.id), { sortOrder: targetOrder, updatedAt: serverTimestamp() }),
      updateDoc(doc(db, "books", target.id), { sortOrder: currentOrder, updatedAt: serverTimestamp() })
    ]);
    await loadBooks();
  } catch (error) {
    status(booksStatus, userMessage(error), "error");
  }
}

async function removeBook(book) {
  if (!window.confirm(`Delete “${book.title || "this book"}” and its sample pages? This cannot be undone.`)) return;
  try {
    const pages = await getBookPages(book.id);
    for (const page of pages) {
      await deleteDoc(doc(db, "books", book.id, "pages", page.id));
    }
    await deleteDoc(doc(db, "books", book.id));
    status(booksStatus, "Book deleted.", "success");
    await loadBooks();
  } catch (error) {
    status(booksStatus, userMessage(error), "error");
  }
}

function setField(id, value) {
  const field = document.getElementById(id);
  if (field) field.value = value === undefined || value === null ? "" : String(value);
}

function openBookEditor(book = null) {
  editingBook = book;
  editingPages = [];
  bookForm.reset();
  bookFormError.textContent = "";
  status(bookUploadStatus, "");
  bookUploadProgress.hidden = true;
  bookUploadProgress.value = 0;
  coverPreviewWrap.replaceChildren();
  pagePreviewWrap.replaceChildren();
  existingPagesHelp.textContent = "";
  $("#bookId").value = book?.id || "";
  $("#bookEditorTitle").textContent = book ? "Edit book" : "Add a book";
  $("#saveBookButton").textContent = book ? "Save changes" : "Save book";
  setField("bookTitle", book?.title);
  setField("bookAuthor", book?.author);
  setField("bookPrice", book?.price);
  setField("bookCategory", book?.category);
  setField("bookDescription", book?.description);
  setField("bookAmazonUrl", book?.amazonUrl);
  setField("bookSortOrder", book?.sortOrder ?? booksCache.length + 1);
  $("#bookInStock").checked = book ? Boolean(book.inStock) : true;
  $("#bookVisible").checked = book ? Boolean(book.visible) : true;
  if (safeImageData(book?.cover)) appendPreview(coverPreviewWrap, book.cover, "Current book cover");
  bookEditor.hidden = false;
  bookEditor.scrollIntoView({ behavior: "smooth", block: "start" });

  if (book) {
    existingPagesHelp.textContent = "Loading current sample pages…";
    getBookPages(book.id).then((pages) => {
      if (editingBook?.id !== book.id) return;
      editingPages = pages;
      pagePreviewWrap.replaceChildren();
      pages.forEach((page, index) => appendPreview(pagePreviewWrap, page.image, `Existing sample page ${index + 1}`, "preview-thumb page-thumb"));
      existingPagesHelp.textContent = pages.length ? `${pages.length} saved sample page(s). Select 3–6 new files above to replace them.` : "No saved sample pages. Choose 3–6 images before saving.";
    }).catch((error) => {
      existingPagesHelp.textContent = `Could not load sample pages: ${userMessage(error)}`;
    });
  } else {
    existingPagesHelp.textContent = "Choose 3–6 images before saving a new book.";
  }
}

function closeBookEditor() {
  bookEditor.hidden = true;
  editingBook = null;
  editingPages = [];
  bookForm.reset();
  bookFormError.textContent = "";
  status(bookUploadStatus, "");
  bookUploadProgress.hidden = true;
  coverPreviewWrap.replaceChildren();
  pagePreviewWrap.replaceChildren();
  existingPagesHelp.textContent = "";
}

function setProgress(value, message) {
  bookUploadProgress.hidden = false;
  bookUploadProgress.value = value;
  status(bookUploadStatus, message);
}

$("#addBookButton").addEventListener("click", () => openBookEditor());
$("#cancelBookButton").addEventListener("click", closeBookEditor);
$("#bookCoverFile").addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (file) previewSelectedFiles([file], coverPreviewWrap, "Selected cover");
  else {
    coverPreviewWrap.replaceChildren();
    if (safeImageData(editingBook?.cover)) appendPreview(coverPreviewWrap, editingBook.cover, "Current book cover");
  }
});
$("#bookPagesFiles").addEventListener("change", (event) => {
  const files = [...(event.target.files || [])];
  previewSelectedFiles(files, pagePreviewWrap, "Selected sample page", "preview-thumb page-thumb");
  existingPagesHelp.textContent = files.length ? `${files.length} new image(s) selected. Choose between 3 and 6.` : (editingPages.length ? `${editingPages.length} saved sample page(s) will be kept.` : "Choose 3–6 images before saving a new book.");
});

bookForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  bookFormError.textContent = "";
  if (!db) {
    bookFormError.textContent = "Firebase is not configured. Update js/firebase-config.js first.";
    return;
  }
  const title = $("#bookTitle").value.trim();
  const author = $("#bookAuthor").value.trim();
  const price = Number($("#bookPrice").value);
  const amazonUrl = $("#bookAmazonUrl").value.trim();
  const coverFile = $("#bookCoverFile").files?.[0] || null;
  const pageFiles = [...($("#bookPagesFiles").files || [])];

  if (!title) return (bookFormError.textContent = "Book title is required.");
  if (!author) return (bookFormError.textContent = "Author is required.");
  if (!Number.isInteger(price) || price <= 0) return (bookFormError.textContent = "Price must be a whole number greater than zero.");
  if (amazonUrl) {
    try {
      const parsed = new URL(amazonUrl);
      if (parsed.protocol !== "https:") throw new Error();
    } catch {
      return (bookFormError.textContent = "Enter a valid HTTPS Amazon book URL, or leave it blank.");
    }
  }
  if (!editingBook && !coverFile) return (bookFormError.textContent = "A cover image is required for a new book.");
  if (pageFiles.length && (pageFiles.length < 3 || pageFiles.length > 6)) return (bookFormError.textContent = "Choose between 3 and 6 sample page images.");
  if (!pageFiles.length && !editingBook && editingPages.length === 0) return (bookFormError.textContent = "A new book needs 3–6 sample page images.");
  if (!pageFiles.length && editingBook && editingPages.length === 0) return (bookFormError.textContent = "Choose 3–6 sample page images for this book.");
  if (coverFile && !/^image\/(jpeg|png|webp)$/i.test(coverFile.type)) return (bookFormError.textContent = "Cover must be JPG, PNG or WebP.");
  if (pageFiles.some((file) => !/^image\/(jpeg|png|webp)$/i.test(file.type))) return (bookFormError.textContent = "All sample pages must be JPG, PNG or WebP.");

  const oldCover = editingBook?.cover || "";
  let cover = oldCover;
  let compressedPages = [];
  const totalImages = (coverFile ? 1 : 0) + pageFiles.length;
  let completedImages = 0;
  const updateImageProgress = (message) => {
    const percent = totalImages ? Math.round((completedImages / totalImages) * 80) : 70;
    setProgress(percent, message);
  };
  $("#saveBookButton").disabled = true;

  try {
    if (coverFile) {
      updateImageProgress("Compressing cover image…");
      cover = await compressCover(coverFile);
      completedImages += 1;
      updateImageProgress("Cover compressed. Preparing sample pages…");
    }
    for (let index = 0; index < pageFiles.length; index += 1) {
      updateImageProgress(`Compressing sample page ${index + 1} of ${pageFiles.length}…`);
      compressedPages.push(await compressSamplePage(pageFiles[index]));
      completedImages += 1;
    }
    updateImageProgress("Saving book details to Firestore…");

    const bookId = editingBook?.id || doc(collection(db, "books")).id;
    const bookData = {
      title,
      author,
      price,
      description: $("#bookDescription").value.trim(),
      category: $("#bookCategory").value.trim(),
      amazonUrl,
      cover,
      inStock: $("#bookInStock").checked,
      visible: $("#bookVisible").checked,
      sortOrder: Number.parseInt($("#bookSortOrder").value, 10) || 0,
      updatedAt: serverTimestamp()
    };
    if (!editingBook) bookData.createdAt = serverTimestamp();
    await setDoc(doc(db, "books", bookId), bookData, { merge: true });

    if (compressedPages.length) {
      const oldPages = await getBookPages(bookId);
      for (const page of oldPages) await deleteDoc(doc(db, "books", bookId, "pages", page.id));
      for (let index = 0; index < compressedPages.length; index += 1) {
        const percent = 80 + Math.round(((index + 1) / compressedPages.length) * 20);
        setProgress(percent, `Saving sample page ${index + 1} of ${compressedPages.length}…`);
        const pageId = String(index + 1).padStart(2, "0");
        await setDoc(doc(db, "books", bookId, "pages", pageId), {
          image: compressedPages[index],
          sortOrder: index + 1,
          updatedAt: serverTimestamp()
        });
      }
    }
    setProgress(100, "Book saved successfully.");
    status(booksStatus, "Book saved successfully.", "success");
    closeBookEditor();
    await loadBooks();
  } catch (error) {
    bookFormError.textContent = userMessage(error);
    status(bookUploadStatus, "Could not save the book. Your form is still open so you can retry.", "error");
  } finally {
    $("#saveBookButton").disabled = false;
  }
});

async function loadSettings() {
  status(settingsStatus, "Loading site settings…");
  try {
    const snapshot = await getDoc(doc(db, "settings", "site"));
    currentSettings = snapshot.exists() ? snapshot.data() : {};
    setField("authorName", currentSettings.authorName);
    setField("tagline", currentSettings.tagline);
    setField("authorBio", currentSettings.bio);
    setField("whatsappNumber", currentSettings.whatsappNumber);
    setField("phone", currentSettings.phone);
    setField("upiId", currentSettings.upiId);
    setField("upiName", currentSettings.upiName);
    authorPhotoPreviewWrap.replaceChildren();
    if (safeImageData(currentSettings.authorPhoto)) appendPreview(authorPhotoPreviewWrap, currentSettings.authorPhoto, "Current author photo");
    status(settingsStatus, snapshot.exists() ? "Settings loaded." : "No site settings yet. Complete this form and save to create settings/site.");
  } catch (error) {
    status(settingsStatus, `Could not load settings. ${userMessage(error)}`, "error");
  }
}

$("#authorPhotoFile").addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    authorPhotoPreviewWrap.replaceChildren();
    if (safeImageData(currentSettings.authorPhoto)) appendPreview(authorPhotoPreviewWrap, currentSettings.authorPhoto, "Current author photo");
    return;
  }
  previewSelectedFiles([file], authorPhotoPreviewWrap, "Selected author photo");
});

settingsForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  settingsFormError.textContent = "";
  if (!db) {
    settingsFormError.textContent = "Firebase is not configured. Update js/firebase-config.js first.";
    return;
  }
  const authorName = $("#authorName").value.trim();
  const whatsappNumber = $("#whatsappNumber").value.trim();
  const photoFile = $("#authorPhotoFile").files?.[0] || null;
  if (!authorName) return (settingsFormError.textContent = "Author name is required.");
  if (!/^[0-9]{10,15}$/.test(whatsappNumber)) return (settingsFormError.textContent = "WhatsApp number must contain 10–15 digits, including the country code, with no +, spaces or hyphens.");
  if (photoFile && !/^image\/(jpeg|png|webp)$/i.test(photoFile.type)) return (settingsFormError.textContent = "Author photo must be JPG, PNG or WebP.");

  $("#saveSettingsButton").disabled = true;
  status(settingsStatus, photoFile ? "Compressing author photo…" : "Saving settings…");
  try {
    const authorPhoto = photoFile ? await compressAuthorPhoto(photoFile) : (currentSettings.authorPhoto || "");
    await setDoc(doc(db, "settings", "site"), {
      authorName,
      tagline: $("#tagline").value.trim(),
      bio: $("#authorBio").value.trim(),
      authorPhoto,
      whatsappNumber,
      phone: $("#phone").value.trim(),
      upiId: $("#upiId").value.trim(),
      upiName: $("#upiName").value.trim(),
      updatedAt: serverTimestamp()
    }, { merge: true });
    currentSettings = (await getDoc(doc(db, "settings", "site"))).data() || {};
    authorPhotoPreviewWrap.replaceChildren();
    if (safeImageData(currentSettings.authorPhoto)) appendPreview(authorPhotoPreviewWrap, currentSettings.authorPhoto, "Saved author photo");
    $("#authorPhotoFile").value = "";
    status(settingsStatus, "Settings saved successfully.", "success");
  } catch (error) {
    status(settingsStatus, userMessage(error), "error");
    settingsFormError.textContent = userMessage(error);
  } finally {
    $("#saveSettingsButton").disabled = false;
  }
});

document.querySelectorAll("[data-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-tab]").forEach((tab) => tab.setAttribute("aria-selected", String(tab === button)));
    document.querySelectorAll('[role="tabpanel"]').forEach((panel) => { panel.hidden = panel.id !== button.dataset.tab; });
  });
});

async function loadAdminData() {
  await Promise.all([loadBooks(), loadSettings()]);
}

$("#refreshButton").addEventListener("click", loadAdminData);

googleSignInButton.addEventListener("click", async () => {
  if (!auth) return status(authStatus, "Paste the Firebase web app config into js/firebase-config.js and save the file first.", "error");
  if (!ADMIN_EMAILS.length) return status(authStatus, "Replace ADMIN_EMAIL_1 and ADMIN_EMAIL_2 in js/admin.js with the approved author's Google email address(es), and replace the same placeholders in firestore.rules.", "error");
  googleSignInButton.disabled = true;
  status(authStatus, "Opening Google sign-in…");
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (error) {
    if (["auth/popup-blocked", "auth/operation-not-supported-in-this-environment", "auth/web-storage-unsupported"].includes(error?.code)) {
      status(authStatus, "Popup sign-in is unavailable. Redirecting to Google…");
      try {
        await signInWithRedirect(auth, googleProvider);
        return;
      } catch (redirectError) {
        status(authStatus, userMessage(redirectError), "error");
      }
    } else {
      status(authStatus, userMessage(error), "error");
    }
  } finally {
    googleSignInButton.disabled = !(isFirebaseConfigured() && ADMIN_EMAILS.length > 0);
  }
});

signOutButton.addEventListener("click", async () => {
  if (!auth) return;
  try {
    await signOut(auth);
    status(authStatus, "You have signed out.");
    showSignIn();
  } catch (error) {
    status(authStatus, userMessage(error), "error");
  }
});

if (!isFirebaseConfigured()) {
  googleSignInButton.disabled = true;
  status(authStatus, "Setup needed: paste the Firebase Web App config into js/firebase-config.js. This placeholder config intentionally cannot sign in.", "error");
} else if (!ADMIN_EMAILS.length) {
  googleSignInButton.disabled = true;
  status(authStatus, "Setup needed: replace ADMIN_EMAIL_1 and ADMIN_EMAIL_2 in js/admin.js with the author's approved Google email address(es), and use the same emails in firestore.rules.", "error");
} else {
  googleSignInButton.disabled = false;
}

if (auth) {
  getRedirectResult(auth).catch((error) => status(authStatus, userMessage(error), "error"));
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      showSignIn();
      return;
    }
    if (!(await requireAllowedUser(user))) {
      status(authStatus, "This account is not allowed. Sign in with the approved, verified author Google account.", "error");
      try { await signOut(auth); } catch (error) { status(authStatus, userMessage(error), "error"); }
      showSignIn();
      return;
    }
    showDashboard(user);
    await loadAdminData();
  });
}
