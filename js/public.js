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
const els = {
  header: $("#siteHeader"),
  headerOrderLink: $("#headerOrderLink"),
  loading: $("#loadingState"),
  siteContent: $("#siteContent"),
  emptyStoreState: $("#emptyStoreState"),
  error: $("#errorState"),
  errorMessage: $("#errorMessage"),
  fallback: $("#errorWhatsApp"),
  brand: $("#brand"),
  brandName: $("#brandName"),
  brandTagline: $("#brandTagline"),
  hero: $("#hero"),
  heroName: $("#heroName"),
  heroTagline: $("#heroTagline"),
  heroSeeBooks: $("#heroSeeBooks"),
  booksSection: $("#booksSection"),
  booksGrid: $("#booksGrid"),
  bookCount: $("#bookCount"),
  search: $("#bookSearch"),
  booksEmpty: $("#booksEmpty"),
  orderSection: $("#orderSection"),
  orderList: $("#orderList"),
  orderEmpty: $("#orderEmpty"),
  orderTotal: $("#orderTotal"),
  customerName: $("#customerName"),
  orderStatus: $("#orderStatus"),
  whatsappOrder: $("#whatsappOrder"),
  upiSection: $("#upiSection"),
  upiPay: $("#upiPay"),
  upiIdText: $("#upiIdText"),
  copyUpi: $("#copyUpi"),
  aboutSection: $("#aboutSection"),
  aboutName: $("#aboutName"),
  aboutBio: $("#aboutBio"),
  aboutPhotoWrap: $("#aboutPhotoWrap"),
  aboutPhoto: $("#aboutPhoto"),
  contactSection: $("#contactSection"),
  contactName: $("#contactName"),
  contactWhatsApp: $("#contactWhatsApp"),
  contactPhone: $("#contactPhone"),
  footerName: $("#footerName"),
  footer: $("#siteFooter"),
  navBooks: $("#navBooks"),
  navAbout: $("#navAbout"),
  navContact: $("#navContact"),
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
const quantities = new Map();
let activePreview = { bookId: null, pages: [], index: 0 };
let previewRequestToken = 0;
let touchStartX = null;

const money = (amount) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 0
}).format(Number(amount) || 0);

function text(element, value) {
  if (!element) return;
  const result = value == null ? "" : String(value);
  element.textContent = result;
  element.hidden = !result.trim();
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
  const digits = String(value || "").replace(/\s/g, "");
  return /^[0-9]{10,15}$/.test(digits) ? digits : "";
}

function safePhone(value) {
  const candidate = String(value || "").trim();
  return /^[+0-9().\s-]{7,24}$/.test(candidate) ? candidate : "";
}

function safeAmazonUrl(value) {
  const allowedDomains = new Set([
    "amazon.in", "amazon.com", "amazon.co.uk", "amazon.co.jp", "amazon.de", "amazon.fr",
    "amazon.ca", "amazon.com.au", "amazon.it", "amazon.es", "amazon.com.mx", "amazon.com.br",
    "amazon.nl", "amazon.se", "amazon.pl", "amazon.sg", "amazon.ae", "amazon.sa", "amazon.com.tr"
  ]);
  try {
    const url = new URL(String(value || ""));
    if (url.protocol !== "https:") return "";
    const host = url.hostname.toLowerCase().replace(/^www\\./, "");
    return allowedDomains.has(host) ? url.href : "";
  } catch {
    return "";
  }
}

function makeElement(tag, className, content) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (content !== undefined && content !== null) element.textContent = String(content);
  return element;
}

function makeButton(label, className, handler, ariaLabel = "") {
  const button = makeElement("button", className || "btn btn-outline btn-small", label);
  button.type = "button";
  if (ariaLabel) button.setAttribute("aria-label", ariaLabel);
  button.addEventListener("click", handler);
  return button;
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

function applySettings(value) {
  settings = value && typeof value === "object" ? value : {};
  const authorName = String(settings.authorName || "").trim();
  const tagline = String(settings.tagline || "").trim();
  const bio = String(settings.bio || "").trim();
  const whatsapp = safeWhatsAppNumber(settings.whatsappNumber);
  const phone = safePhone(settings.phone);
  const brandName = authorName;

  text(els.brandName, brandName);
  text(els.brandTagline, tagline);
  els.brand.hidden = !brandName && !tagline;
  text(els.heroName, authorName);
  const heroHeading = els.heroName.closest("h1");
  if (heroHeading) heroHeading.hidden = !authorName;
  text(els.heroTagline, tagline);
  const heroHasText = Boolean(authorName || tagline);
  els.hero.hidden = !heroHasText;
  els.heroSeeBooks.hidden = books.length === 0;

  text(els.aboutName, authorName);
  const aboutHeading = els.aboutName.closest("h2");
  if (aboutHeading) aboutHeading.hidden = !authorName;
  text(els.aboutBio, bio);
  const hasPhoto = setDataImage(els.aboutPhoto, settings.authorPhoto, authorName ? "Portrait of " + authorName : "Author portrait");
  els.aboutPhotoWrap.hidden = !hasPhoto;
  els.aboutSection.hidden = !(bio || hasPhoto);

  text(els.contactName, authorName);
  const waUrl = whatsapp ? "https://wa.me/" + whatsapp : "";
  setHref(els.contactWhatsApp, waUrl);
  if (waUrl) els.contactWhatsApp.textContent = "Message on WhatsApp";
  const phoneHref = phone ? "tel:" + phone.replace(/[^+0-9]/g, "") : "";
  setHref(els.contactPhone, phoneHref);
  if (phoneHref) els.contactPhone.textContent = "Call";
  els.contactSection.hidden = !waUrl && !phoneHref;

  text(els.footerName, authorName);
  els.footer.hidden = !authorName;
  els.navAbout.hidden = els.aboutSection.hidden;
  els.navContact.hidden = els.contactSection.hidden;

  const title = authorName ? authorName + " | Printed Books" : "Printed Books";
  document.title = title;
  const description = (bio || tagline || "").replace(/\s+/g, " ").slice(0, 300);
  updateMeta("description", description);
  updatePropertyMeta("og:title", title);
  updatePropertyMeta("og:description", description);
  if (hasPhoto) updatePropertyMeta("og:image", settings.authorPhoto);
  else updatePropertyMeta("og:image", "");
  return { whatsapp, authorName, tagline };
}

function handleStateError(message, whatsapp = safeWhatsAppNumber(settings.whatsappNumber)) {
  text(els.errorMessage, message);
  const url = whatsapp ? "https://wa.me/" + whatsapp : "";
  setHref(els.fallback, url);
  if (url) els.fallback.textContent = "Contact the author on WhatsApp";
  els.error.hidden = false;
}

function hideLoading() {
  els.loading.hidden = true;
  els.siteContent.hidden = false;
}

function sortBooks(list) {
  return [...list].sort((a, b) => {
    const ao = Number.isFinite(Number(a.sortOrder)) ? Number(a.sortOrder) : Number.MAX_SAFE_INTEGER;
    const bo = Number.isFinite(Number(b.sortOrder)) ? Number(b.sortOrder) : Number.MAX_SAFE_INTEGER;
    return ao - bo || String(a.title || "").localeCompare(String(b.title || ""));
  });
}

function buildBookCard(book) {
  const card = makeElement("article", "book-card");
  card.dataset.bookId = book.id;

  if (safeDataImage(book.cover)) {
    const coverFrame = makeElement("div", "book-cover-frame");
    const cover = makeElement("img", "book-cover");
    cover.loading = "lazy";
    setDataImage(cover, book.cover, "Cover of " + String(book.title || "book"));
    coverFrame.append(cover);
    card.append(coverFrame);
  } else {
    card.classList.add("without-cover");
  }

  const body = makeElement("div", "book-card-body");
  if (book.category) body.append(makeElement("p", "book-category", book.category));
  body.append(makeElement("h3", "book-title", book.title || ""));
  if (book.author) body.append(makeElement("p", "book-author", book.author));
  if (book.description) {
    const description = makeElement("p", "book-description", String(book.description).trim().slice(0, 220));
    body.append(description);
  }

  const bottom = makeElement("div", "book-bottom");
  bottom.append(makeElement("span", "book-price", money(book.price)));
  if (book.inStock === false) bottom.append(makeElement("span", "out-stock", "Out of stock"));
  body.append(bottom);

  const controls = makeElement("div", "book-controls");
  const preview = makeButton("Preview pages", "btn btn-outline btn-small", () => openPreview(book));
  preview.setAttribute("aria-label", "Preview pages for " + String(book.title || "book"));
  controls.append(preview);

  const qtyControl = makeElement("div", "qty-control");
  const minus = makeButton("−", "", () => changeQuantity(book.id, -1), "Decrease quantity of " + String(book.title || "book"));
  const amount = makeElement("span", "qty-value", quantities.get(book.id) || 0);
  amount.dataset.quantityFor = book.id;
  const plus = makeButton("+", "", () => changeQuantity(book.id, 1), "Increase quantity of " + String(book.title || "book"));
  plus.disabled = book.inStock === false;
  minus.disabled = !(quantities.get(book.id) > 0) || book.inStock === false;
  qtyControl.append(minus, amount, plus);
  controls.append(qtyControl);

  const amazon = safeAmazonUrl(book.amazonUrl);
  if (amazon) {
    const amazonLink = makeElement("a", "btn btn-outline btn-small", "Also on Amazon ↗");
    amazonLink.href = amazon;
    amazonLink.target = "_blank";
    amazonLink.rel = "noopener noreferrer";
    amazonLink.setAttribute("aria-label", "Also buy " + String(book.title || "this book") + " on Amazon");
    controls.append(amazonLink);
  }
  body.append(controls);
  if (book.inStock === false) body.append(makeElement("p", "stock-note", "This book is currently unavailable to order."));
  card.append(body);
  return card;
}

function renderBooks() {
  const queryText = String(els.search.value || "").trim().toLocaleLowerCase();
  const filtered = books.filter((book) => {
    const searchable = [book.title, book.author, book.category, book.description].filter(Boolean).join(" ").toLocaleLowerCase();
    return searchable.includes(queryText);
  });
  els.booksGrid.replaceChildren();
  filtered.forEach((book) => els.booksGrid.append(buildBookCard(book)));
  text(els.bookCount, filtered.length === books.length ? String(books.length) + (books.length === 1 ? " book" : " books") : String(filtered.length) + " of " + String(books.length) + " books");
  els.booksEmpty.hidden = filtered.length !== 0;
  if (!filtered.length) text(els.booksEmpty, "No matching books.");
  els.booksSection.hidden = books.length === 0;
  els.orderSection.hidden = books.length === 0;
  els.navBooks.hidden = books.length === 0;
  els.headerOrderLink.hidden = books.length === 0;
  els.heroSeeBooks.hidden = books.length === 0;
  const hasNavLinks = !els.navBooks.hidden || !els.navAbout.hidden || !els.navContact.hidden;
  els.header.hidden = els.brand.hidden && !hasNavLinks && els.headerOrderLink.hidden;
  renderOrder();
}

function changeQuantity(bookId, delta) {
  const book = books.find((item) => item.id === bookId);
  if (!book || book.inStock === false) return;
  const next = Math.max(0, (quantities.get(bookId) || 0) + delta);
  if (next === 0) quantities.delete(bookId);
  else quantities.set(bookId, next);
  renderBooks();
}

function selectedItems() {
  return books.filter((book) => quantities.get(book.id) > 0 && book.inStock !== false)
    .map((book) => ({ ...book, quantity: quantities.get(book.id), lineTotal: Number(book.price) * quantities.get(book.id) }));
}

function renderOrder() {
  const items = selectedItems();
  const total = items.reduce((sum, item) => sum + (Number.isFinite(item.lineTotal) ? item.lineTotal : 0), 0);
  els.orderList.replaceChildren();
  els.orderEmpty.hidden = items.length > 0;
  if (!items.length) {
    text(els.orderEmpty, "Choose a book above to start an order.");
  } else {
    items.forEach((item) => {
      const line = makeElement("div", "order-line");
      const description = makeElement("div");
      description.append(makeElement("div", "order-line-name", item.title || ""));
      description.append(makeElement("div", "order-line-meta", "Qty " + item.quantity + " × " + money(item.price)));
      const remove = makeButton("Remove", "btn btn-outline btn-small", () => {
        quantities.delete(item.id);
        renderBooks();
      }, "Remove " + String(item.title || "book") + " from order");
      description.append(remove);
      line.append(description, makeElement("div", "order-line-price", money(item.lineTotal)));
      els.orderList.append(line);
    });
  }
  text(els.orderTotal, money(total));

  const hasItems = items.length > 0 && total > 0;
  els.whatsappOrder.disabled = !hasItems || !safeWhatsAppNumber(settings.whatsappNumber);
  if (!safeWhatsAppNumber(settings.whatsappNumber)) els.whatsappOrder.hidden = true;
  else els.whatsappOrder.hidden = false;

  const upiId = String(settings.upiId || "").trim();
  els.upiSection.hidden = !upiId;
  els.upiPay.disabled = !hasItems || !upiId;
  if (upiId) text(els.upiIdText, upiId);
  els.copyUpi.hidden = !upiId;
  els.copyUpi.dataset.upiId = upiId;
}

function buildWhatsAppMessage(items, total, customerName) {
  const lines = [
    "Book order",
    "Name: " + customerName,
    "",
    ...items.map((item) => item.title + " — Qty " + item.quantity + " × " + money(item.price) + " = " + money(item.lineTotal)),
    "",
    "Total: " + money(total),
    "",
    "Please share the delivery details needed to complete this order."
  ];
  return lines.join("\n");
}

els.whatsappOrder.addEventListener("click", () => {
  const name = String(els.customerName.value || "").trim();
  if (!name) {
    statusOrder("Please enter your name before sending the order.", "error");
    els.customerName.focus();
    return;
  }
  const items = selectedItems();
  const total = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const number = safeWhatsAppNumber(settings.whatsappNumber);
  if (!items.length || !number) return;
  const href = "https://wa.me/" + number + "?text=" + encodeURIComponent(buildWhatsAppMessage(items, total, name));
  window.open(href, "_blank", "noopener,noreferrer");
  statusOrder("WhatsApp opened with your order details.", "success");
});

function statusOrder(message, kind = "info") {
  text(els.orderStatus, message);
  if (els.orderStatus) els.orderStatus.dataset.kind = kind;
}

els.upiPay.addEventListener("click", () => {
  const name = String(els.customerName.value || "").trim();
  if (!name) {
    statusOrder("Please enter your name before continuing to UPI.", "error");
    els.customerName.focus();
    return;
  }
  const items = selectedItems();
  const total = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const upiId = String(settings.upiId || "").trim();
  if (!items.length || !upiId || total <= 0) return;
  const params = new URLSearchParams({
    pa: upiId,
    pn: String(settings.upiName || settings.authorName || "").trim(),
    am: String(total),
    cu: "INR",
    tn: "Book order"
  });
  // UPI apps accept percent-encoded spaces in the transaction note.
  window.location.href = "upi://pay?" + params.toString().replace(/\\+/g, "%20");
});

els.copyUpi.addEventListener("click", async () => {
  const value = els.copyUpi.dataset.upiId || "";
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
    statusOrder("UPI ID copied.", "success");
  } catch {
    const temporary = document.createElement("textarea");
    temporary.value = value;
    temporary.setAttribute("readonly", "");
    temporary.style.position = "fixed";
    temporary.style.opacity = "0";
    document.body.append(temporary);
    temporary.select();
    const copied = document.execCommand("copy");
    temporary.remove();
    statusOrder(copied ? "UPI ID copied." : "Copy failed. You can select the UPI ID shown above.", copied ? "success" : "error");
  }
});

async function openPreview(book) {
  const token = ++previewRequestToken;
  activePreview = { bookId: book.id, pages: [], index: 0 };
  els.viewer.hidden = false;
  els.viewer.setAttribute("aria-hidden", "false");
  document.body.classList.add("viewer-open");
  text(els.viewerTitle, book.title || "");
  text(els.viewerCount, "");
  text(els.viewerMessage, "Loading sample pages…");
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
      text(els.viewerMessage, "No preview pages are available for this book.");
      return;
    }
    els.viewerMessage.hidden = true;
    updatePreviewFrame();
  } catch (error) {
    if (token !== previewRequestToken) return;
    text(els.viewerMessage, "Could not load sample pages. Please try again later.");
  }
}

function updatePreviewFrame() {
  const { pages, index } = activePreview;
  const page = pages[index];
  if (!page || !safeDataImage(page.image)) {
    els.viewerImage.hidden = true;
    return;
  }
  setDataImage(els.viewerImage, page.image, "Sample page " + String(index + 1));
  text(els.viewerCount, String(index + 1) + " / " + String(pages.length));
  els.viewerPrev.disabled = index <= 0;
  els.viewerNext.disabled = index >= pages.length - 1;
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

els.viewerClose.addEventListener("click", closePreview);
els.viewerPrev.addEventListener("click", () => movePreview(-1));
els.viewerNext.addEventListener("click", () => movePreview(1));
els.viewer.addEventListener("click", (event) => {
  if (event.target === els.viewer) closePreview();
});
document.addEventListener("keydown", (event) => {
  if (els.viewer.hidden) return;
  if (event.key === "Escape") closePreview();
  if (event.key === "ArrowLeft") movePreview(-1);
  if (event.key === "ArrowRight") movePreview(1);
});
$("#viewerStage").addEventListener("touchstart", (event) => {
  touchStartX = event.changedTouches?.[0]?.clientX ?? null;
}, { passive: true });
$("#viewerStage").addEventListener("touchend", (event) => {
  if (touchStartX === null) return;
  const endX = event.changedTouches?.[0]?.clientX ?? touchStartX;
  const delta = endX - touchStartX;
  touchStartX = null;
  if (Math.abs(delta) < 45) return;
  movePreview(delta > 0 ? -1 : 1);
}, { passive: true });

els.search.addEventListener("input", renderBooks);

async function readSettings() {
  const snapshot = await getDoc(doc(db, "settings", "site"));
  return snapshot.exists() ? snapshot.data() : {};
}
async function readVisibleBooks() {
  const result = await getDocs(query(collection(db, "books"), where("visible", "==", true)));
  return sortBooks(result.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
}

async function start() {
  if (!isFirebaseConfigured() || !db) {
    els.loading.hidden = true;
    els.siteContent.hidden = false;
    handleStateError("The bookstore could not connect to its catalogue. Please try again later.");
    els.booksSection.hidden = true;
    els.orderSection.hidden = true;
    els.header.hidden = true;
    return;
  }

  const [settingsResult, booksResult] = await Promise.allSettled([readSettings(), readVisibleBooks()]);
  if (settingsResult.status === "fulfilled") {
    applySettings(settingsResult.value);
  } else {
    settings = {};
    applySettings({});
  }
  if (booksResult.status === "fulfilled") {
    books = booksResult.value;
  } else {
    books = [];
  }

  hideLoading();
  renderBooks();
  const hasPublishedSiteDetails = Boolean(
    String(settings.authorName || "").trim() ||
    String(settings.tagline || "").trim() ||
    String(settings.bio || "").trim() ||
    safeDataImage(settings.authorPhoto) ||
    safeWhatsAppNumber(settings.whatsappNumber) ||
    safePhone(settings.phone)
  );
  els.emptyStoreState.hidden = books.length > 0 || hasPublishedSiteDetails;
  els.navBooks.hidden = books.length === 0;
  els.heroSeeBooks.hidden = books.length === 0;
  if (settingsResult.status === "rejected" || booksResult.status === "rejected") {
    const failWhatsApp = safeWhatsAppNumber(settings.whatsappNumber);
    const message = booksResult.status === "rejected"
      ? "The book catalogue could not be loaded right now. Please try again in a little while."
      : "Some bookstore details could not be loaded. You can still browse any available books.";
    handleStateError(message, failWhatsApp);
  }
}

start().catch(() => {
  els.loading.hidden = true;
  els.siteContent.hidden = false;
  els.booksSection.hidden = true;
  els.orderSection.hidden = true;
  els.header.hidden = true;
  handleStateError("The bookstore could not be loaded right now. Please refresh and try again.");
});
