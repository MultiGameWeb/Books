# Bookstore Website V2

Frontend prototype for a direct-to-customer printed bookstore.

## Main screens
- `index.html` — Books / Home
- `cart.html` — Cart
- `checkout.html` — Checkout & demo payment UI
- `success.html` — Order Success
- `gallery.html` — Gallery
- `enquiry.html` — Customer Enquiry
- `admin.html` — Prototype Admin Panel

## Admin panel features
- Home text editing
- Book add/edit/delete
- Book cover upload (prototype localStorage) or image URL
- Gallery add/delete
- WhatsApp number
- Phone number
- Google Maps location link
- Support/contact text
- Enquiry inbox

## Important
This is a static prototype. Admin data and enquiries are stored in browser `localStorage`; there is no real security, backend, authentication, file storage, or payment gateway yet.

For production, migrate the data layer to Firebase (Auth + Firestore + Storage) and integrate Razorpay server-side after frontend testing.
