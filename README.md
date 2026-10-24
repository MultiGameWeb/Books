# Dr M Devendramma Books

A static, mobile-first author bookstore served by GitHub Pages. The customer site uses plain HTML, CSS and vanilla JavaScript ES modules. There is no build step, no customer login, and no application-data use of localStorage.

## Public site

- Public URL: https://multigameweb.github.io/Books/
- Admin URL (separate, not linked from the public site): https://multigameweb.github.io/Books/admin.html
- Public homepage: index.html
- Public stylesheet: css/public.css
- Public Firestore client: js/public.js
- Shared Firebase initialization: js/db.js
- Firebase browser configuration: js/firebase-config.js

The page imports Firebase's modular SDK from the official gstatic CDN, using the same SDK version as the admin.

## How the public site reads Firestore

### Site settings

The public page reads the single document **settings/site** with these fields:

- authorName
- tagline
- bio
- authorPhoto
- whatsappNumber (country code plus digits only)
- phone
- upiId
- upiName

Sections and individual contact actions are hidden when their backing setting is missing. The document is publicly readable according to firestore.rules so visitors can view the author profile and contact methods. Only the approved admin can write it.

### Books

The public page queries the **books** collection with a filter for **visible == true**, then sorts the returned documents by sortOrder on the client. It does not load hidden books into the public UI. Each book can have:

- title, author, price, description, category
- amazonUrl (optional)
- cover (a compressed data:image URL)
- inStock (false disables ordering)
- visible (must be true to be shown)
- sortOrder

Only valid data-image URLs are assigned to image src attributes. User-provided text is rendered through DOM text properties, not interpolated into HTML.

### Sample page preview

Sample pages are read from **books/{bookId}/pages** only after the visitor presses **Preview pages**. The full-screen viewer has previous/next buttons, arrow-key and swipe navigation, Escape/close support, and a visible SAMPLE overlay. There is no download button.

### WhatsApp and UPI orders

Customers select quantities in memory on the current page; there is no customer login and no cart data is saved to localStorage. The order box asks for the customer name and calculates the total from the selected visible, in-stock books.

- **Send order on WhatsApp** opens a wa.me URL with the customer name, book titles, quantities, line totals, total amount, and a request for delivery details.
- **Pay by UPI** opens a upi://pay link with the configured UPI ID, payee name, total in INR, and the “Book order” transaction note.
- **Copy UPI ID** is available on desktop browsers.

This site does not integrate a payment gateway. UPI hand-off is not proof that a payment completed; the author should confirm payment and order details separately.

## Firebase setup and security

The project uses Firebase project **Dr M Devendramma Books**. The Firebase Web App config is in js/firebase-config.js. It is browser configuration, not a service-account secret. Never commit service-account JSON, private keys, access tokens, or other server secrets.

Firebase Console should have Google sign-in enabled. Add **multigameweb.github.io** under Authentication → Settings → Authorized domains.

The approved admin email must match in both js/admin.js and firestore.rules. The browser allowlist is only a user-experience check; Firestore rules are the actual write-security boundary. Make sure the rules in this repository are published in Firebase Console → Firestore Database → Rules. GitHub commits do not publish Firestore rules automatically.

The rules allow public reads of books, book sample pages and settings, permit writes only for the verified email in isAdmin(), and deny all other paths.

## Deploy to GitHub Pages

1. Open the repository Settings → Pages.
2. Select **Deploy from a branch**, branch **main**, folder **/(root)**, and save.
3. Wait for the Pages deployment to complete.
4. Test the public site and the admin URL over HTTPS.

No npm installation, bundler, build command, or server is required.

## Phase 2 customer-site testing checklist

After adding or changing data through the admin, refresh the public site and check:

1. A book added in Admin with **Visible on website** checked appears in the public Books grid.
2. Changing a book price in Admin shows the updated price on refresh.
3. Turning **Visible on website** off hides the book from the public page.
4. Setting **In stock** off displays “Out of stock” and disables ordering for that book.
5. Preview pages load only after tapping the button; the viewer opens/closes, arrows work, swipes work on a phone, Escape closes it, and the SAMPLE overlay stays visible.
6. The WhatsApp link contains the right destination number and correctly encoded item/name/quantity/total message; the message asks for delivery details.
7. The UPI link has the correct pa, pn, am, cu=INR, and tn=Book%20order values; Copy UPI ID works on desktop.
8. Telugu text in book title, description, biography and author name renders with Noto Sans Telugu.
9. Confirm missing contact fields and empty sections remain hidden, and test both the loading and error/fallback states.
10. Try the site in mobile and desktop widths, light/dark mode, keyboard-only navigation and reduced-motion mode.

The admin remains a separate noindex page and is not linked from the public site.
