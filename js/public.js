import { db } from "./db.js";
import { isFirebaseConfigured } from "./firebase-config.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const $ = (selector) => document.querySelector(selector);
const STORAGE_KEY = "drMDevendrammaBooks.cart.v1";
const els = {
  header: $("#siteHeader"),
  brandCopy: $("#brandCopy"),
  brandName: $("#brandName"),
  brandTagline: $("#brandTagline"),
  loading: $("#loadingState"),
  siteContent: $("#siteContent"),
  error: $("#errorState"),
  errorMessage: $("#errorMessage"),
  errorWhatsApp: $("#errorWhatsApp"),
  emptyStore: $("#emptyStoreState"),
  emptyStoreWhatsApp: $("#emptyStoreWhatsApp"),
  hero: $("#hero"),
  heroHeading: $("#heroHeading"),
  heroName: $("#heroName"),
  heroTagline: $("#heroTagline"),
  heroSeeBooks: $("#heroSeeBooks"),
  booksSection: $("#booksSection"),
  booksGrid: $("#booksGrid"),
  bookCount: $("#bookCount"),
  search: $("#bookSearch"),
  booksEmpty: $("#booksEmpty"),
  aboutSection: $("#aboutSection"),
  aboutHeading: $("#aboutHeading"),
  aboutName: $("#aboutName"),
  aboutBio: $("#aboutBio"),
  aboutPhotoWrap: $("#aboutPhotoWrap"),
  aboutPhoto: $("#aboutPhoto"),
  contactSection: $("#contactSection"),
  contactName: $("#contactName"),
  contactWhatsApp: $("#contactWhatsApp"),
  contactPhone: $("#contactPhone"),
  footerName: $("#footerName"),
  navBooks: $("#navBooks"),
  navAbout: $("#navAbout"),
  navContact: $("#navContact"),
  cartToggle: $("#cartToggle"),
  cartCount: $("#cartCount"),
  cartBackdrop: $("#cartBackdrop"),
  cartDrawer: $("#cartDrawer"),
  cartClose: $("#cartClose"),
  cartItems: $("#cartItems"),
  cartUnavailableMessage: $("#cartUnavailableMessage"),
  cartGrandTotal: $("#cartGrandTotal"),
  customerName: $("#customerName"),
  deliveryLocation: $("#deliveryLocation"),
  alternatePhone: $("#alternatePhone"),
  orderValidation: $("#orderValidation"),
  whatsappOrder: $("#whatsappOrder"),
  orderingUnavailable: $("#orderingUnavailable"),
  clearCart: $("#clearCart"),
  viewer: $("#sampleViewer"),
  viewerTitle: $("#viewerTitle"),
  viewerCount: $("#viewerCount"),
  viewerImage: $("#viewerImage"),
  viewerMessage: $("#viewerMessage"),
  viewerClose: $("#viewerClose"),
  viewerPrev: $("#viewerPrev"),
  viewerNext: $("#viewerNext")
};

let settings = {};
let books = [];
let cart = readCart();
let currentWhatsAppNumber = "";
let activePreview = { bookId: null, pages: [], index: 0 };
let previewRequestToken = 0;
let touchStartX = null;

function readCart() {
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || "{}");
    const result = Object.create(null);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return result;
    for (const [id, value] of Object.entries(parsed)) {
      const quantity = Math.floor(Number(value));
      if (id && Number.isFinite(quantity) && quantity > 0 && quantity <= 99) result[id] = quantity;
    }
    return result;
  } catch {
    return Object.create(null);
  }
}

function saveCart() {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  } catch {
    // The in-memory cart still works if this browser blocks sessionStorage.
  }
}

function setText(element, value, hideWhenEmpty = false) {
  if (!element) return;
  const next = value == null ? "" : String(value);
  element.textContent = next;
  if (hideWhenEmpty) element.hidden = !next.trim();
}

function createElement(tag, className, content) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (content !== undefined && content !== null) element.textContent = String(content);
  return element;
}

function makeButton(label, className, handler, ariaLabel = "") {
  const button = createElement("button", className || "btn btn-outline btn-small", label);
  button.type = "button";
  if (ariaLabel) button.setAttribute("aria-label", ariaLabel);
  button.addEventListener("click", handler);
  return button;
}

function safeDataImage(value) {
  return typeof value === "string" && /^data:image\/(?:jpeg|png|webp);base64,/i.test(value);
}

function setDataImage(image, value, alt) {
  if (!image) return false;
  if (!safeDataImage(value)) {
    image.removeAttribute("src");
    image.hidden = true;
    return false;
  }
  image.src = value;
  image.alt = alt || "";
  image.hidden = false;
  return true;
}

function safeWhatsAppNumber(value) {
  const raw = String(value || "").trim();
  if (!raw || !/^[+\d\s().-]+$/.test(raw)) return "";
  const digits = raw.replace(/\D/g, "");
  return /^[0-9]{10,15}$/.test(digits) ? digits : "";
}

function safePhone(value) {
  const raw = String(value || "").trim();
  return raw && /^[+0-9().\s-]{7,30}$/.test(raw) ? raw : "";
}

function safeAmazonUrl(value) {
  const allowedDomains = new Set([
    "amazon.in", "amazon.com", "amazon.co.uk", "amazon.co.jp", "amazon.de", "amazon.fr",
    "amazon.ca", "amazon.com.au", "amazon.it", "amazon.es", "amazon.com.mx", "amazon.com.br",
    "amazon.nl", "amazon.se", "amazon.pl", "amazon.sg", "amazon.ae", "amazon.sa", "amazon.com.tr"
  ]);
  try {
    const url = new URL(String(value || ""));
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    return url.protocol === "https:" && allowedDomains.has(host) ? url.href : "";
  } catch {
    return "";
  }
}

function priceOf(book) {
  const price = Math.round(Number(book && book.price) || 0);
  return Number.isFinite(price) && price >= 0 ? price : 0;
}

function money(amount) {
  const value = Math.round(Number(amount) || 0);
  return "Rs " + value.toLocaleString("en-IN");
}

function updateMeta(name, content) {
  let element = document.querySelector('meta[name="' + name + '"]');
  if (!element) {
    element = document.createElement("meta");
    element.name = name;
    document.head.append(element);
  }
  element.content = content || "";
}

function updatePropertyMeta(property, content) {
  let element = document.querySelector('meta[property="' + property + '"]');
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute("property", property);
    document.head.append(element);
  }
  element.content = content || "";
}

function setHref(anchor, href) {
  if (!anchor) return;
  if (!href) {
    anchor.hidden = true;
    anchor.removeAttribute("href");
    return;
  }
  anchor.href = href;
  anchor.hidden = false;
}

function applySettings(value) {
  settings = value && typeof value === "object" ? value : {};
  const authorName = String(settings.authorName || "").trim();
  const tagline = String(settings.tagline || "").trim();
  const bio = String(settings.bio || "").trim();
  const hasPhoto = safeDataImage(settings.authorPhoto);
  currentWhatsAppNumber = safeWhatsAppNumber(settings.whatsappNumber);
  const phone = safePhone(settings.phone);

  setText(els.brandName, authorName, true);
  setText(els.brandTagline, tagline, true);
  els.brandName.hidden = !authorName;
  els.brandCopy.hidden = !authorName && !tagline;
  els.brandTagline.hidden = !tagline;

  setText(els.heroName, authorName);
  els.heroHeading.hidden = !authorName;
  setText(els.heroTagline, tagline);
  els.heroTagline.hidden = !tagline;
  els.hero.hidden = !(authorName || tagline);
  els.heroSeeBooks.hidden = books.length === 0;

  setText(els.aboutName, authorName);
  els.aboutHeading.hidden = !authorName;
  setText(els.aboutBio, bio);
  els.aboutBio.hidden = !bio;
  els.aboutPhotoWrap.hidden = !hasPhoto;
  if (hasPhoto) setDataImage(els.aboutPhoto, settings.authorPhoto, authorName ? "Portrait of " + authorName : "Author portrait");
  else {
    els.aboutPhoto.removeAttribute("src");
    els.aboutPhoto.hidden = true;
  }
  els.aboutSection.hidden = !(bio || hasPhoto);

  setText(els.contactName, authorName, true);
  const waUrl = currentWhatsAppNumber ? "https://wa.me/" + currentWhatsAppNumber : "";
  setHref(els.contactWhatsApp, waUrl);
  const phoneHref = phone ? "tel:" + phone.replace(/[^+0-9]/g, "") : "";
  setHref(els.contactPhone, phoneHref);
  els.contactSection.hidden = !waUrl && !phoneHref;

  setText(els.footerName, authorName, true);
  els.footerName.hidden = !authorName;

  const title = authorName ? authorName + " | Printed Books" : "Printed Books";
  document.title = title;
  const description = (bio || tagline || "").replace(/\s+/g, " ").slice(0, 300);
  updateMeta("description", description);
  updatePropertyMeta("og:title", title);
  updatePropertyMeta("og:description", description);
  updatePropertyMeta("og:image", hasPhoto ? settings.authorPhoto : "");

  setHref(els.emptyStoreWhatsApp, waUrl);
  setHref(els.errorWhatsApp, waUrl);
}

function sortBooks(list) {
  return [...list].sort((a, b) => {
    const orderA = Number.isFinite(Number(a.sortOrder)) ? Number(a.sortOrder) : Number.MAX_SAFE_INTEGER;
    const orderB = Number.isFinite(Number(b.sortOrder)) ? Number(b.sortOrder) : Number.MAX_SAFE_INTEGER;
    return orderA - orderB || String(a.title || "").localeCompare(String(b.title || ""));
  });
}

function booksById() {
  const lookup = Object.create(null);
  for (const book of books) lookup[book.id] = book;
  return lookup;
}

function cartCount() {
  return Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
}

function updateCartCount() {
  const count = cartCount();
  setText(els.cartCount, count);
  els.cartToggle.setAttribute("aria-label", "Open cart, " + count + (count === 1 ? " item" : " items"));
}

function addToCart(bookId) {
  const book = books.find((item) => item.id === bookId);
  if (!book || book.inStock === false) return;
  cart[bookId] = Math.min(99, (cart[bookId] || 0) + 1);
  saveCart();
  renderBooks();
  renderCart();
}

function changeQuantity(bookId, delta) {
  const book = books.find((item) => item.id === bookId);
  const current = cart[bookId] || 0;
  if (!current || (delta > 0 && (!book || book.inStock === false))) return;
  const next = Math.min(99, Math.max(0, current + delta));
  if (next === 0) delete cart[bookId];
  else cart[bookId] = next;
  saveCart();
  renderBooks();
  renderCart();
}

function removeFromCart(bookId) {
  if (!Object.prototype.hasOwnProperty.call(cart, bookId)) return;
  delete cart[bookId];
  saveCart();
  renderBooks();
  renderCart();
}

function buildBookCard(book) {
  const card = createElement("article", "book-card");
  card.dataset.bookId = book.id;

  if (safeDataImage(book.cover)) {
    const coverFrame = createElement("div", "book-cover-frame");
    const cover = createElement("img", "book-cover");
    cover.loading = "lazy";
    setDataImage(cover, book.cover, "Cover of " + String(book.title || "book"));
    coverFrame.append(cover);
    card.append(coverFrame);
  } else {
    card.classList.add("without-cover");
  }

  const body = createElement("div", "book-card-body");
  if (book.category) body.append(createElement("p", "book-category", book.category));
  body.append(createElement("h3", "book-title", book.title || ""));
  if (book.author) body.append(createElement("p", "book-author", book.author));
  if (book.description) body.append(createElement("p", "book-description", String(book.description).trim().slice(0, 220)));

  const bottom = createElement("div", "book-bottom");
  bottom.append(createElement("span", "book-price", money(priceOf(book))));
  if (book.inStock === false) bottom.append(createElement("span", "out-stock", "Out of stock"));
  body.append(bottom);

  const controls = createElement("div", "book-controls");
  const quantity = cart[book.id] || 0;
  if (book.inStock === false && quantity === 0) {
    const addButton = makeButton("Add to cart", "btn btn-primary btn-small", () => {}, "Add " + String(book.title || "book") + " to cart");
    addButton.disabled = true;
    controls.append(addButton);
  } else if (quantity > 0) {
    const stepper = createElement("div", "qty-control");
    const minus = makeButton("−", "qty-button", () => changeQuantity(book.id, -1), "Decrease quantity of " + String(book.title || "book"));
    const amount = createElement("span", "qty-value", quantity);
    const plus = makeButton("+", "qty-button", () => changeQuantity(book.id, 1), "Increase quantity of " + String(book.title || "book"));
    plus.disabled = book.inStock === false || quantity >= 99;
    minus.disabled = quantity <= 0;
    stepper.append(minus, amount, plus);
    controls.append(stepper);
  } else {
    controls.append(makeButton("Add to cart", "btn btn-primary btn-small", () => addToCart(book.id), "Add " + String(book.title || "book") + " to cart"));
  }

  const preview = makeButton("Preview pages", "btn btn-outline btn-small", () => openPreview(book));
  preview.setAttribute("aria-label", "Preview pages for " + String(book.title || "book"));
  controls.append(preview);
  const amazon = safeAmazonUrl(book.amazonUrl);
  if (amazon) {
    const link = createElement("a", "btn btn-outline btn-small", "Also on Amazon ↗");
    link.href = amazon;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    controls.append(link);
  }
  body.append(controls);
  card.append(body);
  return card;
}

function renderBooks() {
  const searchText = String(els.search.value || "").trim().toLocaleLowerCase();
  const filtered = books.filter((book) => {
    const searchable = [book.title, book.author, book.category, book.description].filter(Boolean).join(" ").toLocaleLowerCase();
    return searchable.includes(searchText);
  });

  els.booksGrid.replaceChildren();
  for (const book of filtered) els.booksGrid.append(buildBookCard(book));
  setText(els.bookCount, filtered.length === books.length ? String(books.length) + (books.length === 1 ? " book" : " books") : filtered.length + " of " + books.length + " books");
  els.booksEmpty.hidden = filtered.length !== 0;
  els.booksSection.hidden = books.length === 0;
  els.emptyStore.hidden = books.length !== 0;
  els.hero.hidden = books.length === 0 || !(String(settings.authorName || "").trim() || String(settings.tagline || "").trim());
  els.heroHeading.hidden = !String(settings.authorName || "").trim();
  els.heroTagline.hidden = !String(settings.tagline || "").trim();
  els.heroSeeBooks.hidden = books.length === 0;
  els.aboutSection.hidden = books.length === 0 || !(String(settings.bio || "").trim() || safeDataImage(settings.authorPhoto));
  els.contactSection.hidden = books.length === 0 || !(currentWhatsAppNumber || safePhone(settings.phone));
  els.navBooks.hidden = books.length === 0;
  els.navAbout.hidden = els.aboutSection.hidden;
  els.navContact.hidden = els.contactSection.hidden;
  if (books.length === 0) {
    setText(els.emptyStoreText, "");
  }
  updateCartCount();
  renderCart();
}

function currentCartState() {
  const lookup = booksById();
  const ids = Object.keys(cart).filter((id) => cart[id] > 0);
  const unavailable = ids.filter((id) => !lookup[id] || lookup[id].inStock === false);
  const items = ids
    .filter((id) => lookup[id] && lookup[id].inStock !== false)
    .map((id) => {
      const book = lookup[id];
      const quantity = cart[id];
      const unitPrice = priceOf(book);
      return { id, book, quantity, unitPrice, lineTotal: unitPrice * quantity };
    });
  const total = items.reduce((sum, item) => sum + item.lineTotal, 0);
  return { ids, unavailable, items, total };
}

function renderCart() {
  const state = currentCartState();
  els.cartItems.replaceChildren();

  if (state.ids.length === 0) {
    els.cartItems.append(createElement("p", "cart-empty", "Your cart is empty."));
  } else {
    for (const id of state.ids) {
      const book = books.find((item) => item.id === id);
      const quantity = cart[id];
      const row = createElement("article", "cart-item");
      const details = createElement("div", "cart-item-details");
      if (!book) {
        details.append(createElement("p", "cart-item-title", "This book is no longer in the public catalogue."));
        details.append(createElement("p", "muted small", "Remove this unavailable item to continue."));
      } else {
        details.append(createElement("h3", "cart-item-title", book.title || ""));
        details.append(createElement("p", "cart-item-unit", money(priceOf(book)) + " per book"));
        if (book.inStock === false) details.append(createElement("span", "out-stock", "Out of stock"));
      }
      const actions = createElement("div", "cart-item-actions");
      const stepper = createElement("div", "qty-control");
      const minus = makeButton("−", "qty-button", () => changeQuantity(id, -1), "Decrease cart quantity");
      const amount = createElement("span", "qty-value", quantity);
      const plus = makeButton("+", "qty-button", () => changeQuantity(id, 1), "Increase cart quantity");
      minus.disabled = quantity <= 0;
      plus.disabled = !book || book.inStock === false || quantity >= 99;
      stepper.append(minus, amount, plus);
      const remove = makeButton("Remove", "btn btn-outline btn-small", () => removeFromCart(id), "Remove item from cart");
      actions.append(stepper, remove);
      row.append(details, actions);
      const lineTotal = book && book.inStock !== false ? money(priceOf(book) * quantity) : "—";
      row.append(createElement("strong", "cart-item-total", lineTotal));
      els.cartItems.append(row);
    }
  }

  els.cartUnavailableMessage.hidden = state.unavailable.length === 0;
  setText(els.cartUnavailableMessage, state.unavailable.length ? "Some cart items are unavailable or out of stock. Remove them before ordering." : "");
  setText(els.cartGrandTotal, money(state.total));
  updateCartCount();
  updateOrderValidation(state);
}

function updateOrderValidation(state = currentCartState()) {
  const name = String(els.customerName.value || "").trim();
  const location = String(els.deliveryLocation.value || "").trim();
  const hasWhatsApp = Boolean(currentWhatsAppNumber);
  const hasUnavailable = state.unavailable.length > 0;
  const hasItems = state.items.length > 0 && state.total >= 0;

  els.whatsappOrder.hidden = !hasWhatsApp;
  els.orderingUnavailable.hidden = hasWhatsApp;
  els.whatsappOrder.disabled = !hasWhatsApp || !name || !location || !hasItems || hasUnavailable;

  let message = "";
  if (!hasWhatsApp) {
    message = "Ordering is not available right now.";
  } else if (hasUnavailable) {
    message = "Remove unavailable or out-of-stock books before ordering.";
  } else if (state.ids.length === 0 || !state.items.length) {
    message = "Add at least one available book to your cart.";
  } else if (!name && !location) {
    message = "Enter your customer name and delivery location to enable ordering.";
  } else if (!name) {
    message = "Please enter your customer name.";
  } else if (!location) {
    message = "Please enter your delivery location.";
  } else {
    message = "Your order is ready to send on WhatsApp.";
  }
  setText(els.orderValidation, hasWhatsApp ? message : "", true);
}

function openCart() {
  els.cartBackdrop.hidden = false;
  els.cartDrawer.setAttribute("aria-hidden", "false");
  els.cartToggle.setAttribute("aria-expanded", "true");
  document.body.classList.add("cart-open");
  renderCart();
  els.cartClose.focus();
}

function closeCart() {
  els.cartBackdrop.hidden = true;
  els.cartDrawer.setAttribute("aria-hidden", "true");
  els.cartToggle.setAttribute("aria-expanded", "false");
  document.body.classList.remove("cart-open");
  els.cartToggle.focus();
}

function buildWhatsAppMessage(state, name, location, phone) {
  const lines = [
    "New book order",
    "Name: " + name,
    "Location: " + location
  ];
  if (phone) lines.push("Phone: " + phone);
  lines.push("Books:");
  state.items.forEach((item, index) => {
    lines.push((index + 1) + ". " + String(item.book.title || "") + " x " + item.quantity + " = Rs " + item.lineTotal);
  });
  lines.push("Total: Rs " + state.total);
  lines.push("(Delivery charges, if any, will be confirmed on WhatsApp.)");
  return lines.join("\n");
}

function sendWhatsAppOrder() {
  const state = currentCartState();
  const name = String(els.customerName.value || "").trim();
  const location = String(els.deliveryLocation.value || "").trim();
  const phone = String(els.alternatePhone.value || "").trim();
  updateOrderValidation(state);
  if (!currentWhatsAppNumber || !name || !location || !state.items.length || state.unavailable.length) return;

  const message = buildWhatsAppMessage(state, name, location, phone);
  const url = "https://wa.me/" + currentWhatsAppNumber + "?text=" + encodeURIComponent(message);
  window.open(url, "_blank", "noopener,noreferrer");
  // Do not clear cart or form automatically. The customer clears it explicitly.
}

async function openPreview(book) {
  if (!db) return;
  const token = ++previewRequestToken;
  activePreview = { bookId: book.id, pages: [], index: 0 };
  els.viewer.hidden = false;
  els.viewer.setAttribute("aria-hidden", "false");
  document.body.classList.add("viewer-open");
  setText(els.viewerTitle, book.title || "");
  setText(els.viewerCount, "");
  setText(els.viewerMessage, "Loading sample pages…");
  els.viewerImage.hidden = true;
  els.viewerPrev.disabled = true;
  els.viewerNext.disabled = true;
  els.viewerClose.focus();

  try {
    const snapshot = await getDocs(collection(db, "books", book.id, "pages"));
    if (token !== previewRequestToken) return;
    const pages = snapshot.docs
      .map((entry) => ({ id: entry.id, ...entry.data() }))
      .sort((a, b) => {
        const ao = Number.parseInt(a.sortOrder ?? a.id, 10);
        const bo = Number.parseInt(b.sortOrder ?? b.id, 10);
        return (Number.isFinite(ao) ? ao : 0) - (Number.isFinite(bo) ? bo : 0);
      })
      .filter((page) => safeDataImage(page.image));
    activePreview.pages = pages;
    if (!pages.length) {
      setText(els.viewerMessage, "No preview pages are available for this book.");
      return;
    }
    els.viewerMessage.hidden = true;
    updatePreviewFrame();
  } catch {
    if (token !== previewRequestToken) return;
    setText(els.viewerMessage, "Could not load sample pages. Please try again later.");
  }
}

function updatePreviewFrame() {
  const page = activePreview.pages[activePreview.index];
  if (!page || !safeDataImage(page.image)) {
    els.viewerImage.hidden = true;
    return;
  }
  setDataImage(els.viewerImage, page.image, "Sample page " + String(activePreview.index + 1));
  setText(els.viewerCount, (activePreview.index + 1) + " / " + activePreview.pages.length);
  els.viewerPrev.disabled = activePreview.index <= 0;
  els.viewerNext.disabled = activePreview.index >= activePreview.pages.length - 1;
  els.viewerMessage.hidden = true;
}

function movePreview(delta) {
  const next = activePreview.index + delta;
  if (next < 0 || next >= activePreview.pages.length) return;
  activePreview.index = next;
  updatePreviewFrame();
}

function closePreview() {
  previewRequestToken += 1;
  els.viewer.hidden = true;
  els.viewer.setAttribute("aria-hidden", "true");
  els.viewerImage.removeAttribute("src");
  els.viewerImage.hidden = true;
  document.body.classList.remove("viewer-open");
  activePreview = { bookId: null, pages: [], index: 0 };
}

function showLoadError(message) {
  setText(els.errorMessage, message);
  setHref(els.errorWhatsApp, currentWhatsAppNumber ? "https://wa.me/" + currentWhatsAppNumber : "");
  if (!currentWhatsAppNumber) els.errorWhatsApp.hidden = true;
  els.error.hidden = false;
}

async function readSettings() {
  const snapshot = await getDoc(doc(db, "settings", "site"));
  return snapshot.exists() ? snapshot.data() : {};
}

async function readVisibleBooks() {
  const snapshot = await getDocs(query(collection(db, "books"), where("visible", "==", true)));
  return sortBooks(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
}

async function start() {
  if (!isFirebaseConfigured() || !db) {
    els.loading.hidden = true;
    els.siteContent.hidden = false;
    showLoadError("The bookstore could not connect to its catalogue. Please try again later.");
    return;
  }

  const [settingsResult, booksResult] = await Promise.allSettled([readSettings(), readVisibleBooks()]);
  if (settingsResult.status === "fulfilled") applySettings(settingsResult.value);
  else applySettings({});
  if (booksResult.status === "fulfilled") books = booksResult.value;

  els.loading.hidden = true;
  els.siteContent.hidden = false;
  if (booksResult.status === "rejected") {
    els.emptyStore.hidden = true;
    showLoadError("The book catalogue could not be loaded from Firestore. Please try again later.");
  } else {
    els.error.hidden = settingsResult.status === "rejected";
    if (settingsResult.status === "rejected") showLoadError("Author settings could not be loaded. WhatsApp ordering may be unavailable until they are saved.");
    renderBooks();
  }
}

els.cartToggle.addEventListener("click", openCart);
els.cartClose.addEventListener("click", closeCart);
els.cartBackdrop.addEventListener("click", (event) => {
  if (event.target === els.cartBackdrop) closeCart();
});
els.clearCart.addEventListener("click", () => {
  cart = Object.create(null);
  saveCart();
  renderBooks();
  renderCart();
});
els.whatsappOrder.addEventListener("click", sendWhatsAppOrder);
els.customerName.addEventListener("input", () => updateOrderValidation());
els.deliveryLocation.addEventListener("input", () => updateOrderValidation());
els.alternatePhone.addEventListener("input", () => updateOrderValidation());
els.search.addEventListener("input", renderBooks);

els.viewerClose.addEventListener("click", closePreview);
els.viewerPrev.addEventListener("click", () => movePreview(-1));
els.viewerNext.addEventListener("click", () => movePreview(1));
els.viewer.addEventListener("click", (event) => {
  if (event.target === els.viewer) closePreview();
});
document.addEventListener("keydown", (event) => {
  if (!els.cartBackdrop.hidden && event.key === "Escape") {
    closeCart();
    return;
  }
  if (!els.viewer.hidden && event.key === "Escape") closePreview();
  if (!els.viewer.hidden && event.key === "ArrowLeft") movePreview(-1);
  if (!els.viewer.hidden && event.key === "ArrowRight") movePreview(1);
});
$("#viewerStage").addEventListener("touchstart", (event) => {
  touchStartX = event.changedTouches && event.changedTouches[0] ? event.changedTouches[0].clientX : null;
}, { passive: true });
$("#viewerStage").addEventListener("touchend", (event) => {
  if (touchStartX === null) return;
  const endX = event.changedTouches && event.changedTouches[0] ? event.changedTouches[0].clientX : touchStartX;
  const delta = endX - touchStartX;
  touchStartX = null;
  if (Math.abs(delta) >= 45) movePreview(delta > 0 ? -1 : 1);
}, { passive: true });

start().catch(() => {
  els.loading.hidden = true;
  els.siteContent.hidden = false;
  showLoadError("The bookstore could not be loaded right now. Please refresh and try again.");
});
