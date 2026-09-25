# Bookstore Website V10 — Frontend Test Build

## Main flow
Books → Cart → Checkout → Order Success

## Customer features
- Search, category filtering and sorting
- Book details modal
- Stock / out-of-stock handling
- Amazon purchase button per book
- Cart count and per-book cart badge
- Offers: 10% OFF, Buy 1 Get 1, Buy Any 2 Get 1 Free
- Delivery ON/OFF, per-km fee, minimum fee and free-delivery threshold
- Gallery and enquiry pages
- WhatsApp, Call, Address text and Google Maps link
- Responsive desktop/mobile layout
- Invoice/print-friendly order area and demo order tracking UI
- SEO and prototype analytics
- COD ON/OFF

## Integrated admin
Admin is integrated into `index.html` and accessed through the visible **Admin** button in the main header (also `#admin`). The panel is protected by the prototype PIN and includes books, orders, delivery, offers, gallery, enquiries, contact/links, SEO, analytics, home content and security settings.

## Cinematic 3D intro
The top of the main website now contains a Three.js cinematic book animation adapted from the provided reference code. Three hardcover books fall and remain visible, a fourth book lands on top and opens, and a gold pen writes on the cream page. The final frame holds the full stack, open book and pen in place. No item is intentionally removed or faded from the animation.

## Prototype limitations
Data is stored in browser localStorage/sessionStorage. This is not production security or shared multi-device data. Before launch, replace prototype storage with Firebase Auth/Firestore/Storage and integrate Razorpay with server-side order creation and payment verification.


V8 layout update: the cinematic Three.js book animation is embedded on the right side of the main hero, while “Discover Books That Inspire Change”, the supporting text, Shop Books, and Ask an Enquiry remain on the left. The Admin button remains in the top navigation.

## V9/V10 updates
- Hero animation is isolated in a dedicated rounded card to the right of the hero copy.
- Replay controls and animation captions were removed.
- The Three.js animation auto-plays once and freezes on the completed open-book frame.
- Per-book WhatsApp enquiry buttons were removed from cards and book details; WhatsApp remains in Contact/Enquiry areas.
- Cinematic pen ink uses antique-gold drawing with warm glow, and the canvas color space is explicitly set for consistent rendering.
- Book-details modal uses the single working `.modal-backdrop` + `.modal-card` CSS path; dead modal rules were removed.
- Main hero copy stays separate from the animation.
