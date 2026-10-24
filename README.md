# Dr M Devendramma Books

A static, mobile-first author bookstore served by GitHub Pages. The public site uses plain HTML, CSS and vanilla JavaScript ES modules. There is no build step and no customer login.

## Public site

- Public URL: https://multigameweb.github.io/Books/
- Separate admin URL: https://multigameweb.github.io/Books/admin.html
- Public homepage: `index.html`
- Public stylesheet: `css/public.css`
- Public storefront and cart: `js/public.js`
- Shared Firebase initialization: `js/db.js`
- Firebase browser configuration: `js/firebase-config.js`

The admin page is separate, marked noindex and is not linked from the public storefront.

## Firestore data shown on the public site

The storefront uses only real Firestore data. It does not include sample, demo or dummy books.

### Site settings

The public site reads the document `settings/site` and uses these fields when present:

- `authorName`
- `tagline`
- `bio`
- `authorPhoto`
- `whatsappNumber` (country code and digits)
- `phone` (optional)

Missing optional settings are hidden. The public page ignores any UPI fields.

### Books

The public site queries the `books` collection using `visible == true` and sorts those documents by `sortOrder` on the client. Hidden books are not displayed or included in public ordering.

Supported display/order fields include:

- `title`, `author`, `price`, `description`, `category`
- `amazonUrl` (optional external Amazon link)
- `cover` (compressed `data:image` URL)
- `inStock` (when `false`, the book cannot be added or increased in the cart)
- `visible` (must be `true` to appear)
- `sortOrder`

Images are assigned only after checking their data-image type. Text from Firestore is rendered with safe DOM text properties, not HTML interpolation.

Sample pages remain lazy-loaded from `books/{bookId}/pages` only after the visitor taps **Preview pages**.

## WhatsApp-only ordering

There is no payment gateway, UPI flow, or order write to Firestore. The website opens a WhatsApp message addressed to the phone number in `settings/site.whatsappNumber`.

1. A customer taps **Add to cart** on a book. The card shows a quantity stepper after the book is added. Out-of-stock books are clearly marked and cannot be added.
2. The header cart button shows the total item quantity and opens the cart drawer. It lists book titles, unit prices, quantities, line totals and the grand total.
3. The customer enters a required name and delivery location (house/street, area, city and pincode). An alternate phone number is optional. The WhatsApp order button remains disabled until required fields and an orderable cart are present.
4. **Order on WhatsApp** opens a URL-encoded `https://wa.me/<number>?text=...` message containing the name, location, optional phone, book lines and total. Telugu and other Unicode text is URL-encoded.
5. The cart is not cleared when WhatsApp opens. Customers can remove individual books or tap **Clear cart** themselves.

The cart contains only book document IDs and quantities in memory and `sessionStorage`, so it can survive a refresh in the same browser tab/session. Customer name, delivery location and alternate phone are not saved to browser storage. No orders or customer details are written to Firestore. If the WhatsApp number is missing, the order button is hidden and the site displays **Ordering is not available right now**.

When no visible books exist in Firestore, the site shows **Books will be available soon** and displays a WhatsApp contact link only if a valid number is configured. The header and footer stay visible. It never substitutes example books or placeholder author data.

## Firebase setup and security

The Firebase Web App config in `js/firebase-config.js` is public browser configuration, not a service-account secret. Never commit service-account JSON, private keys, access tokens or other server secrets.

Firebase Console should have Google sign-in enabled. Add `multigameweb.github.io` under Authentication → Settings → Authorized domains.

The approved admin email must match in `js/admin.js` and `firestore.rules`. The browser allowlist is only a user-experience check; Firestore rules are the write-security boundary. Publish the rules separately in Firebase Console → Firestore Database → Rules; a GitHub commit does not publish them.

## Deploy to GitHub Pages

1. Open repository Settings → Pages.
2. Select **Deploy from a branch**, branch **main**, folder **/(root)**, and save.
3. Wait for the Pages deployment to complete.
4. Test the public site and separate admin URL over HTTPS.

No npm installation, bundler, build command or server is required.

## Public site testing checklist

- Add a real book in Admin, set **Visible on website** on and save. Confirm it appears publicly. Hidden books should not appear.
- Tap **Add to cart**, increase/decrease quantity and remove the item. Confirm header count, unit price, line total and grand total update.
- Mark a book out of stock. Confirm the badge appears and it cannot be added/increased.
- Refresh the page and confirm the cart IDs and quantities remain in the same browser session.
- Open the cart with name or delivery location empty. Confirm **Order on WhatsApp** stays disabled and an inline message explains what is missing.
- Fill name and delivery location (house/street, area, city, pincode). Confirm ordering enables when the cart contains only available books.
- Add an alternate phone and place a test order. Confirm WhatsApp receives the exact field order, numbered book lines, integer line totals and integer grand total.
- Use Telugu in the name and delivery location. Confirm the WhatsApp message is properly encoded and readable.
- Confirm opening WhatsApp does not clear the cart. Only **Clear cart** or removing an item changes it.
- Remove/turn off the WhatsApp number in Settings. Confirm ordering is unavailable and the order button is hidden.
- With zero visible books, confirm the centered **Books will be available soon** state, a contact link only if WhatsApp is configured, and visible header/footer.
- Test sample-page previews, keyboard closing/navigation, mobile layout, light/dark mode and reduced-motion preferences.
