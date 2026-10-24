# Dr M Devendramma Books — Phase 1 Admin

This repository is a static GitHub Pages site. Phase 1 builds the private author admin first. The public storefront migration is intentionally held until the author confirms the admin works.

## Admin URL

After GitHub Pages deploys the main branch from the repository root:

- Admin: https://multigameweb.github.io/Books/admin.html
- The public index.html does not link to admin.html.

## 1. Firebase project setup

Use the Firebase project **Dr M Devendramma Books**.

1. In Firebase Console, open **Project settings → General → Your apps**.
2. Register a **Web app** if one does not already exist.
3. Copy its firebaseConfig object.
4. Open **js/firebase-config.js** in GitHub and replace the six PASTE_... values with the values from your own Firebase Web App config. Do not paste a service-account JSON or private key. Browser Firebase config is public; Firestore rules are what protect data.
5. In **Authentication → Sign-in method**, enable **Google**.
6. In **Authentication → Settings → Authorized domains**, ensure **multigameweb.github.io** is listed. Firebase Authentication does not use the full /Books/admin.html path in this setting.

The admin page intentionally disables the sign-in button until Firebase config and admin emails are filled in.

## 2. Set the only allowed admin email

The author’s Google email must be listed in **both** places:

- **js/admin.js**: the ADMIN_EMAILS array.
- **firestore.rules**: the email array inside isAdmin().

Replace ADMIN_EMAIL_1 and ADMIN_EMAIL_2 with the approved email addresses. For one author account only, use the same real email in both slots (or remove the second entry from both files). Use the exact Google account email, lowercase, and do not add an address that should not have access.

The UI allowlist is only a user-experience check. The Firestore rules are the actual write-security boundary.

## 3. Publish Firestore rules (mandatory before testing)

**Important:** Committing firestore.rules to GitHub does not publish it to Firebase automatically. Your current Firebase Console starter rule allows public reads and writes until you replace it.

1. Open Firebase Console → **Firestore Database → Rules**.
2. Open this repository’s firestore.rules, copy the full contents into the Rules editor.
3. Replace the email placeholders in that editor with the same approved email(s) used in js/admin.js.
4. Check that the rule protects:
   - books/{bookId}: public read, admin-only create/update/delete.
   - books/{bookId}/pages/{pageId}: public read, admin-only create/update/delete.
   - settings/{settingsId}: public read, admin-only create/update/delete.
   - every other path: denied.
5. Click **Publish**.

Do not leave the temporary open starter rules in production. They permit anyone with access to the project reference to change catalogue and settings data.

## 4. Phase 1 admin features

- Google sign-in using Firebase Authentication; popup with redirect fallback.
- Email allowlist check and automatic sign-out for unauthorized accounts.
- Books: list, add, edit, delete, change display order, toggle stock, toggle public visibility.
- Book fields: title, author, integer INR price, description, category, optional Amazon URL, cover, 3–6 sample pages, stock/visibility, sort order, timestamps.
- Settings document: settings/site with author name, tagline, bio, author photo, WhatsApp number, phone, UPI ID and UPI payee name.
- No password, OTP or PIN login.
- No application data is stored in localStorage.
- Images are compressed in the browser and saved as data URLs in Firestore documents; Firebase Storage is not used.
  - Covers: max 600 px wide.
  - Sample pages: max 900 px wide, targeted below 300 KB per page document.
  - Author photo: compressed for Firestore storage.
- All database writes depend on the published Firestore rules.

## 5. Image and content constraints

Choose JPG, PNG or WebP images. The admin converts them to JPEG before saving. If an image is still too large, choose a simpler/smaller source image. Sample pages are saved separately in books/{bookId}/pages/{pageId} so each one remains below the Firestore document-size limit.

Book descriptions and author text are rendered with DOM text properties in the admin interface to avoid interpreting user content as HTML.

## 6. Deploy with GitHub Pages

1. Open the repository’s **Settings → Pages**.
2. Select **Deploy from a branch**.
3. Select branch **main** and folder **/(root)**, then Save.
4. Wait for the Pages deployment to finish.
5. Visit the Admin URL above.

No build step or package installation is required. The app imports the modular Firebase SDK from the official gstatic CDN.

## 7. Phase 1 test checklist

Before asking for the public storefront, test the admin and the security rules:

1. **Approved admin:** Sign in with the one approved Google account; Books and Settings should open.
2. **Non-admin sign-in:** Sign in with a different Google account; the page should show “This account is not allowed” and sign that account out.
3. **Rules enforce security:** In Firebase Console’s Rules Playground / Emulator, verify that an unauthenticated user and a signed-in non-admin cannot create or change a document under books, books/{id}/pages, or settings/site. The admin-page allowlist alone is not a security test.
4. **Book entry:** Add a book with a cover and 3–6 sample pages. Refresh the admin; the book and page count should still be there.
5. **Book changes:** Change its price; toggle “In stock” and “Visible on website”; move its order up/down; edit and delete a test entry.
6. **Settings:** Save author name, tagline, bio, an author photo, a digits-only WhatsApp number, phone and UPI fields; refresh and confirm values persisted.
7. **Telugu:** Enter Telugu characters in title/description/bio and confirm they display correctly using Noto Sans Telugu.
8. **Unauthorized writes:** Ensure publishing firestore.rules is complete before treating any test as passed.

The new public catalogue, WhatsApp order messages and UPI links are **Phase 2** and will be built only after you confirm Phase 1 admin testing.
