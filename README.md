# Bookstore Website V4 Prototype

Core flow: Books → Cart → Checkout → Order Success.

Added in V4:
- Admin book catalog with cover upload, stock quantity, visible/out-of-stock status and Amazon URL.
- Storefront stock badges and disabled purchase buttons for out-of-stock books.
- Per-book cart quantity badge on the book card after Add to Cart.
- Admin Delivery & Shipping settings: ON/OFF, fee per KM, minimum fee and free-shipping threshold.
- Checkout delivery-distance field for prototype shipping calculation.
- Admin Offers: 10% OFF, Buy 1 Get 1, Buy Any 2 Get 1 Free.
- Admin Gallery image/poster upload and delete.
- WhatsApp, phone, Google Maps and support text settings.
- Fixed internal navigation to use index.html as the main Books page; no books.html dependency.

Prototype limitation: data is stored in browser localStorage. Before real orders, add Firebase Authentication, Firestore, Storage and secure payment/server integration such as Razorpay.
