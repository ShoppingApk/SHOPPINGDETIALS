# Kaasni API Reference

Base URL: `http://localhost:5000/api` (local) or `https://<your-render-app>.onrender.com/api` (deployed).

## Conventions

**Response envelope.** Every response, success or error, has the same shape:

```json
{ "success": true, "message": "OK", "data": { } }
```

```json
{ "success": false, "message": "Enter a valid email", "data": [{ "field": "email", "message": "Enter a valid email" }] }
```

For validation errors (`422`), `data` lists every invalid field. For other errors, `data` is `null`.

**Authentication.** Log in, then send the token on each request:

```
Authorization: Bearer <token>
```

The server also sets an httpOnly `token` cookie, which works when the client and API share a site.

**Status codes**

| Code | Meaning |
|---|---|
| `200` / `201` | OK / created |
| `400` | Invalid request (for example: empty bag, size not chosen) |
| `401` | Not logged in, session expired, password changed since login, or account disabled (the client signs out) |
| `403` | Logged in but not allowed (wrong role). Login with a disabled account also returns `403`. |
| `404` | Not found |
| `409` | Conflict (duplicate email, out of stock while placing an order) |
| `422` | Validation failed |
| `429` | Rate limited |

**Pagination.** List endpoints return:

```json
"pagination": { "page": 1, "limit": 20, "total": 48, "pages": 3, "hasMore": true }
```

`hasMore` appears on product lists.

**Ids.** All ids are 24-character MongoDB ObjectIds. A malformed id returns `422`.

---

## Health

### `GET /health`
Public. Used by Render health checks and uptime pingers. It returns plain JSON, not the envelope.

```json
{ "status": "ok", "time": "2026-11-20T06:30:00.000Z" }
```

---

## Auth

Login and register are limited to 20 requests per 15 minutes per IP.

### `POST /auth/register`
Creates a normal shopper account (role `user`).

```json
{ "name": "Priya Sharma", "email": "priya@example.com", "password": "Secret123", "phone": "9876543210" }
```

- Password: 8–72 characters, with at least one letter and one number.
- Phone is optional (a 10-digit Indian mobile number).

`201`:

```json
{
  "success": true,
  "message": "Account created",
  "data": {
    "token": "eyJhbGciOi...",
    "user": { "id": "6745...", "name": "Priya Sharma", "email": "priya@example.com", "role": "user", "phone": "9876543210", "avatar": "", "mustChangePassword": false, "createdAt": "..." }
  }
}
```

### `POST /auth/login`

```json
{ "email": "priya@example.com", "password": "Secret123" }
```

`200`: same shape as register. A wrong email or password returns `401 "Invalid email or password"`.

### `POST /auth/logout`
Clears the auth cookie. `200` with `data: null`.

### `GET /auth/me`
Requires login. `200`: `{ "data": { "user": { ... } } }`

### `PUT /auth/password`
Requires login.

```json
{ "currentPassword": "Secret123", "newPassword": "NewSecret456" }
```

`200`: returns a new token and user, and clears `mustChangePassword`.

---

## Profile & addresses

All of these require login.

### `PUT /users/profile`

```json
{ "name": "Priya S", "phone": "9876543210", "avatar": "https://..." }
```

`200`: `{ "data": { "user": { ... } } }`

### `GET /users/addresses`
`200`: `{ "data": { "addresses": [ { "_id": "...", "fullName": "...", "isDefault": true, ... } ] } }`

### `POST /users/addresses`

```json
{ "fullName": "Priya Sharma", "phone": "9876543210", "line1": "12 MG Road", "line2": "Near City Mall", "city": "Pune", "state": "Maharashtra", "pincode": "411001", "isDefault": true }
```

- The first saved address becomes the default automatically.
- You can save up to 10 addresses.
- `201`: returns the full `addresses` list.

### `PUT /users/addresses/:id`
Same body as `POST`. `200`: returns the `addresses` list.

### `DELETE /users/addresses/:id`
`200`: returns the `addresses` list.

---

## Products

### `GET /products`
Public.

| Query | Example | Notes |
|---|---|---|
| `q` | `cotton kurti` | Every word must match the title, brand, sub-category, tags, category or colours. Matching is partial and case-insensitive. |
| `category` | `Women` | One of `Women, Men, Kids, Home, Beauty, Electronics` |
| `brand` | `Voltix,Soundpeak` | Comma-separated, case-insensitive |
| `size` | `M` | The product must offer this size |
| `minPrice`, `maxPrice` | `300`, `1000` | In INR |
| `minRating` | `4` | 0–5 |
| `sort` | `price_asc` | `relevance` (default), `newest`, `price_asc`, `price_desc`, `rating`, `discount` |
| `page`, `limit` | `1`, `20` | `limit` can be at most 50 |

Example: `GET /products?category=Women&size=M&maxPrice=800&sort=price_asc&page=1&limit=2`

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "products": [
      {
        "_id": "6aff...",
        "title": "Women Casual Western Top",
        "brand": "Mehrang",
        "category": "Women",
        "subCategory": "Tops",
        "price": 249,
        "mrp": 699,
        "discountPercent": 64,
        "images": [{ "url": "https://placehold.co/...", "publicId": "" }],
        "rating": 4.2,
        "numReviews": 1835,
        "sizes": ["S", "M", "L", "XL", "XXL"],
        "colors": ["Teal", "Black", "Pink"],
        "stock": 120
      }
    ],
    "pagination": { "page": 1, "limit": 2, "total": 4, "pages": 2, "hasMore": true }
  }
}
```

The search endpoint works the same for every user and role.

### `GET /products/categories`
Public.

```json
{ "data": { "categories": [ { "name": "Women", "count": 8 }, { "name": "Men", "count": 8 } ] } }
```

The response lists all 6 categories.

### `GET /products/filters?category=Women`
Public. Returns the values to show in filter controls. `category` is optional.

```json
{ "data": { "brands": ["Kesariya", "Mehrang", "Saanjh"], "sizes": ["S", "M", "L", "XL", "XXL", "Free Size", "6", "7"], "colors": ["Black", "Pink"], "priceRange": { "min": 249, "max": 1199 } } }
```

### `GET /products/:id`
Public. Returns the full product, including `description` and `tags`.

```json
{ "data": { "product": { "_id": "...", "title": "...", "description": "...", "images": [ ... ], "sizes": [ ... ], "colors": [ ... ], "stock": 148, "rating": 4.7, "numReviews": 4097, "isActive": true, "createdAt": "...", "updatedAt": "..." } } }
```

Unknown or hidden products return `404`.

### `GET /products/:id/similar`
Public. Returns up to 8 products from the same category, closest in price first.

`{ "data": { "products": [ ... ] } }`

---

## Reviews

### `GET /products/:id/reviews?page=1`
Public. Returns 10 reviews per page, newest first.

```json
{ "data": { "reviews": [ { "_id": "...", "rating": 5, "comment": "Lovely fabric", "user": { "_id": "...", "name": "Priya Sharma" }, "createdAt": "..." } ], "pagination": { "page": 1, "limit": 10, "total": 1, "pages": 1 } } }
```

### `POST /products/:id/reviews`
Requires login. Each user can have one review per product; posting again updates it.

```json
{ "rating": 5, "comment": "Lovely fabric, true to size" }
```

- `201` for a new review, `200` when updating an existing one.
- The product's rating is recalculated, and the new value is returned:

```json
{ "message": "Review added", "data": { "review": { ... }, "product": { "_id": "...", "rating": 4.7, "numReviews": 4098 } } }
```

Seeded products start with a baseline rating and count, and real reviews are averaged in with it.

---

## Products — admin only

These require login as an `admin`. Other roles get `403`.

### `POST /products`
Send either JSON or `multipart/form-data`.

**JSON (image links):**

```json
{
  "title": "Chanderi Silk Kurta",
  "description": "Festive kurta with zari work",
  "category": "Women",
  "subCategory": "Kurtis",
  "brand": "Saanjh",
  "price": 899,
  "mrp": 1999,
  "stock": 40,
  "sizes": ["S", "M", "L"],
  "colors": ["Maroon", "Teal"],
  "tags": ["kurta", "festive"],
  "imageUrls": ["https://example.com/kurta-front.jpg", "https://example.com/kurta-back.jpg"]
}
```

**Multipart (file upload):**
- Use the same fields as text.
- Add up to 5 files in `images`: JPG, PNG, WEBP or GIF, 2 MB each.
- `sizes`, `colors`, `tags` and `imageUrls` can be comma-separated (`S,M,L`) or a JSON array string.
- Uploaded files go to Cloudinary. If the Cloudinary env vars are not set, file uploads return `400` with a hint to use `imageUrls` instead. `imageUrls` works with or without Cloudinary.

Rules:
- `title`, `category`, `price`, `mrp`, `stock` and at least one image are required.
- `price` cannot be more than `mrp`.
- A product can have at most 5 images.
- `discountPercent` is calculated automatically.

`201`: `{ "message": "Product created", "data": { "product": { ... } } }`

### `PUT /products/:id`
Partial update: send only the fields that change. Same formats as `POST`.

Images on update:
- Omit `keepImages` to keep all current images.
- Send `keepImages` with the current image URLs you want to keep. Any image not listed is removed, and deleted from Cloudinary if it was uploaded there.
- New files and `imageUrls` are appended.

```json
{ "price": 749, "stock": 25, "keepImages": ["https://example.com/kurta-front.jpg"], "imageUrls": ["https://example.com/kurta-side.jpg"] }
```

To hide a product without deleting it: `{ "isActive": false }`. `200`: returns the updated `product`.

### `DELETE /products/:id`
Permanently deletes the product, its reviews and its Cloudinary images, and removes it from every bag and wishlist. Past orders keep their own copy of the title, price and image.

`200`: `{ "message": "Product deleted", "data": { "id": "..." } }`

---

## Bag (cart)

All of these require login. Every bag response returns the whole bag:

```json
{
  "success": true,
  "message": "Added to bag",
  "data": {
    "items": [
      {
        "_id": "<itemId>",
        "size": "M",
        "quantity": 2,
        "inStock": true,
        "product": { "_id": "...", "title": "Floral Printed Cotton Kurti", "brand": "Saanjh", "image": "https://...", "price": 349, "mrp": 999, "discountPercent": 65, "sizes": ["S", "M", "L", "XL", "XXL"], "stock": 148 }
      }
    ],
    "summary": { "count": 2, "mrpTotal": 1998, "discount": 1300, "itemsTotal": 698, "shippingFee": 0, "total": 698, "freeShippingAbove": 499 },
    "removedUnavailable": 0
  }
}
```

Delivery is free when the items total is ₹499 or more; otherwise it costs ₹49. Items whose product was deleted or hidden are dropped automatically, and `removedUnavailable` gives the count.

| Method & path | Body | Notes |
|---|---|---|
| `GET /cart` | – | |
| `POST /cart` | `{ "productId": "...", "size": "M", "color": "Teal", "quantity": 1 }` | See below |
| `PATCH /cart/:itemId` | `{ "quantity": 3 }` | 1–10, checked against stock |
| `DELETE /cart/:itemId` | – | Removes one line |
| `DELETE /cart` | – | Clears the bag |

Adding to the bag with `POST /cart`:
- `size` is required when the product has sizes, and matching is case-insensitive.
- `color` is optional. When the product has colours, it defaults to the first one; any other value must be one of the product's colours. Bag items and orders store the chosen colour.
- Adding the same product, size and colour again increases the quantity.
- Each line can have at most 10, and never more than the stock.

---

## Wishlist

All of these require login.

### `GET /wishlist`

```json
{ "data": { "products": [ { ...product card... } ], "ids": ["..."] } }
```

### `POST /wishlist/:productId`
Toggles the product: adds it if absent, removes it if present.

```json
{ "message": "Added to wishlist", "data": { "added": true, "products": [ ... ], "ids": ["..."] } }
```

---

## Orders

All of these require login.

### `POST /orders`
Checks out the whole bag. Payment is Cash on Delivery only.

Use a saved address:

```json
{ "addressId": "6746...", "paymentMethod": "COD" }
```

Or send a new address, optionally saving it to the address book:

```json
{
  "address": { "fullName": "Priya Sharma", "phone": "9876543210", "line1": "12 MG Road", "line2": "", "city": "Pune", "state": "Maharashtra", "pincode": "411001" },
  "saveAddress": true,
  "paymentMethod": "COD"
}
```

When the order is placed:
- Stock is reserved safely. If an item ran out, you get `409` and nothing is charged or reserved.
- The bag is emptied.

`201`:

```json
{
  "message": "Order placed",
  "data": {
    "order": {
      "_id": "...",
      "user": "...",
      "items": [ { "product": "...", "title": "Floral Printed Cotton Kurti", "image": "https://...", "price": 349, "mrp": 999, "size": "M", "quantity": 1 } ],
      "address": { "fullName": "Priya Sharma", "phone": "9876543210", "line1": "12 MG Road", "line2": "", "city": "Pune", "state": "Maharashtra", "pincode": "411001" },
      "paymentMethod": "COD",
      "itemsTotal": 349,
      "shippingFee": 49,
      "totalAmount": 398,
      "status": "placed",
      "statusHistory": [ { "status": "placed", "at": "..." } ],
      "createdAt": "..."
    }
  }
}
```

Errors:
- `400` if the bag is empty.
- `422` for an invalid address, or a payment method other than `COD`.

### `GET /orders/my?page=1`
Your orders, newest first, 10 per page.

`{ "data": { "orders": [ ... ], "pagination": { ... } } }`

### `GET /orders/:id`
Your own order. Admins can view any order. Other users' orders return `404`.

### `PUT /orders/:id/cancel`
Customers can cancel only while the status is `placed`. Cancelling restores the stock.

`200`: `{ "message": "Order cancelled", "data": { "order": { ... } } }`

`400` once the order has shipped.

---

## Orders — admin only

### `GET /orders?status=placed&page=1`
All orders, 20 per page, with the customer's name and email.

```json
{ "data": { "orders": [ { "_id": "...", "user": { "_id": "...", "name": "Priya Sharma", "email": "priya@example.com" }, "status": "placed", "totalAmount": 398, ... } ], "pagination": { ... } } }
```

### `PUT /orders/:id/status`

```json
{ "status": "shipped" }
```

Allowed status changes:

```
placed  -> shipped | cancelled
shipped -> delivered | cancelled
delivered, cancelled -> (final)
```

Cancelling restores the stock. Any other change returns `400` with a message like `Cannot change status from "placed" to "delivered"`.

---

## Admin — dashboard and products

These require login as an `admin`.

| Method & path | Notes |
|---|---|
| `GET /admin/stats` | Returns `{ users: { user, chatuser, admin }, products: { total, inactive, lowStock: [...] }, orders: { total, placed, shipped, delivered, cancelled }, revenue, recentOrders: [...] }`. Revenue excludes cancelled orders. |
| `GET /admin/config` | Returns `{ imageUpload: bool, maxImages: 5, maxImageMB: 2 }`. `imageUpload` is false when Cloudinary isn't configured. |
| `GET /admin/products?q=&category=&status=active\|inactive&lowStock=1&page=` | Includes hidden products and every field; 20 per page. |
| `GET /admin/users?q=&role=user\|chatuser\|admin&status=active\|disabled&page=` | Returns `{ users, page, pages, total }`. |

Disabled accounts get `401 "This account has been disabled"` on their next request, and their sockets are closed, so they are signed out everywhere. Changing a password invalidates every token issued before the change.

## Admin — users

These require login as an `admin`.

| Method & path | Body | Notes |
|---|---|---|
| `GET /admin/users?role=chatuser&q=priya&page=1` | – | 20 per page |
| `POST /admin/chatusers` | `{ "name": "...", "email": "...", "password": "Temp1234" }` | The user must change this password after first login |
| `PATCH /admin/users/:id/status` | `{ "isActive": false }` | Disable or enable an account. Admin accounts can't be disabled here. |

---

## Seeding

```bash
cd shopchat
npm run seed
```

This is safe to re-run. It:
- Replaces all products with the 48-product sample catalogue.
- Clears reviews, bags and wishlists.
- Keeps users and orders.
- Creates an admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD` if no admin exists yet.

---

## Private messaging (chatusers only)

### Visibility rule
Every `/api/chat/*` route answers **exactly like an unknown route** (`404 { "success": false, "message": "Not found", "data": null }`) unless the request comes from a logged-in, active user whose role is `chatuser`. This applies to guests, `user`, `admin`, expired or invalid tokens, and disabled accounts. Admins are not allowed either.

### Encryption at rest
Message text is stored only as AES-256-GCM ciphertext `{ iv, tag, data }`, using `ENCRYPTION_KEY` (64 hex characters) with a random IV per message. The API decrypts on read and never returns the encrypted fields. A message deleted for everyone has its content wiped and is returned as a placeholder:

```json
{ "_id": "...", "deleted": true, "text": "This message was deleted", "imageUrl": "", "status": "read", "createdAt": "..." }
```

### Message object

```json
{ "_id": "...", "conversation": "...", "sender": "<userId>", "receiver": "<userId>", "text": "Hi!", "imageUrl": "", "status": "sent|delivered|read", "deleted": false, "createdAt": "...", "deliveredAt": null, "readAt": null }
```

### REST routes

| Method & path | Body / query | Response `data` |
|---|---|---|
| `POST /chat/unlock` | `{ "keyword": "..." }` | `{ "unlocked": true }` or `{ "unlocked": false }` (constant-time compare against `CHAT_UNLOCK_KEYWORD`; limited to 10 attempts per 5 minutes per account) |
| `GET /chat/config` | – | `{ "images": bool, "maxTextLength": 2000, "maxImageMB": 5 }` (`images` is false when Cloudinary isn't configured) |
| `GET /chat/users?q=` | `q` optional (name search) | `{ "users": [ { "_id", "name", "avatar", "online", "lastSeen" } ] }`: other active chatusers only, never email, password or role |
| `GET /chat/conversations` | – | `{ "conversations": [ { "_id", "other": {user}, "lastMessage": {message} \| null, "unread": 0, "updatedAt" } ] }` |
| `POST /chat/conversations` | `{ "userId": "..." }` | `{ "conversation": {...} }`: gets or creates the single conversation for this pair |
| `GET /chat/conversations/:id/messages?before=<messageId>&limit=30` | `limit` 1–50 | `{ "messages": [ ... newest first ], "hasMore": bool }`; excludes messages you deleted for yourself |
| `POST /chat/upload` | multipart `image` (JPG, PNG or WEBP, max 5 MB) | `{ "url": "https://res.cloudinary.com/..." }` (`400` if Cloudinary isn't configured) |
| `DELETE /chat/messages/:id?scope=me\|everyone` | – | `{ "messageId", "conversationId", "scope", "message" }` |

Rules for `DELETE /chat/messages/:id`:
- `everyone` is allowed only for the sender, and only within 1 hour of sending.
- It also notifies both users over the socket.

Every route checks that you are a participant of the conversation. Anything else returns `404`.

### Socket.IO

**Connecting**
- Connect to the API origin with `io(API_URL, { auth: { token }, transports: ['websocket', 'polling'] })`.
- The JWT is read only from the handshake `auth` payload, never from the query string.
- Guests, non-chatusers, admins and disabled accounts are refused with `connect_error: "unauthorized"`.
- If an admin disables a user, that user's sockets are disconnected immediately.

**Rooms and presence**
- Each user joins the room `user:<id>`.
- Online status is tracked in memory, and a user can be connected from several tabs or devices at once.

**Limits**
- Payloads are validated: ObjectId formats, text up to 2000 characters, and image URLs must point to this app's Cloudinary account.
- Each socket can send at most 20 `message:send` per 10 seconds and 60 other events per 10 seconds.

**Client → server events** (most accept an ack callback that receives `{ ok, error? }`):

| Event | Payload | Ack / effect |
|---|---|---|
| `message:send` | `{ conversationId, text?, imageUrl?, tempId? }` | Ack: `{ ok, message, tempId }`. Emits `message:new` to the receiver and to your other tabs. |
| `message:delivered` | `{ messageIds: [] }` | Marks the messages delivered and emits `message:delivered` to the sender. |
| `message:read` | `{ conversationId }` | Marks everything addressed to you as read and emits `message:read` to the sender and to your other tabs. |
| `message:delete` | `{ messageId, scope: 'me' \| 'everyone' }` | Same rules as the REST delete. Emits `message:deleted`. |
| `typing:start` / `typing:stop` | `{ conversationId }` | Forwarded to the other participant. |

**Server → client events**

| Event | Payload |
|---|---|
| `message:new` | `{ message, tempId? }` |
| `message:delivered` | `{ conversationId, messageIds, at }` |
| `message:read` | `{ conversationId, messageIds, at, readerId }` |
| `message:deleted` | `{ conversationId, messageId, scope, message? }` |
| `typing:start` / `typing:stop` | `{ conversationId, userId }` |
| `presence:online` | `{ userId }` |
| `presence:offline` | `{ userId, lastSeen }` |

When you connect, any messages that arrived for you while you were offline are marked delivered, and their senders receive `message:delivered`.

### Audio and video calls (WebRTC)

Calls are one-to-one, between two active chatusers who already share a conversation.
- **Media:** goes directly between the two browsers, or through a TURN relay, and is always encrypted with DTLS-SRTP. It never passes through the API and is never recorded.
- **Socket.IO:** carries only the signaling.
- **Privacy:** SDP, ICE candidates and call content are never logged.

#### `GET /chat/ice-servers`
Chatusers only (404 for everyone else). Limited to 30 requests per 10 minutes per account. Sent with `Cache-Control: no-store`.

```json
{
  "iceServers": [
    { "urls": ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
    { "urls": ["turn:203.0.113.10:3478?transport=udp"], "username": "1767229200:4f9a1c2b7d3e", "credential": "base64..." }
  ],
  "provider": "none | static | coturn-secret | cloudflare | metered",
  "turn": true,
  "ttl": 3600
}
```

- **`turn`:** true when at least one TURN relay is included.
- **`ttl`:** how long the credentials last in seconds, or `null` for fixed ones.
- **Provider (`TURN_PROVIDER`):**
  - `none`: STUN only;
  - `coturn-secret`: HMAC-SHA1 credentials valid for 1 hour;
  - `cloudflare` and `metered`: generated server-side through the provider's API.
- **Caching:** the server caches generated credentials for up to 10 minutes. If the provider can't be reached, it falls back to STUN only and retries after 30 seconds.
- **Filtering:** URLs on port 53 are always removed, because browsers block them.

#### Call log message
Every call adds a message to the conversation; it appears when the chat is unlocked. `sender` is the caller and `receiver` is the callee.

```json
{ "_id": "...", "kind": "call", "call": { "type": "audio|video", "outcome": "completed|missed|declined", "duration": 65 }, "text": "", "sender": "...", "receiver": "...", "createdAt": "..." }
```

`duration` is in seconds and is set only for completed calls. Ordinary messages have `"kind": "text"`.

#### Rules
- **IDs:** `callId` is a UUID made by the caller. Anything else is ignored.
- **Who can signal:** only the two participants, and only from the tab that is in the call. Messages for unknown or ended calls are ignored.
- **One call at a time:** a second invite returns `call:busy` to the other caller.
- **Locked or offline callee:** the caller only ever gets `call:unavailable`; the reason is never revealed. A chatuser only has a socket while the private area is unlocked and open. A missed call is logged.
- **Ringing:** every unlocked tab of the callee rings. When one accepts, the others get `call:answered-elsewhere`.
- **Timeouts:** ringing stops after 45 seconds (`call:end { reason: "no-answer" }` to both sides). If a participant's socket drops during a call, there is a 15-second grace period to `call:rejoin`; after that the other side gets `call:end { reason: "connection-lost" }`.
- **Rate limits:**
  - `call:invite`: 5 per minute per user;
  - control events: 30 per 10 seconds per socket;
  - SDP/ICE relay: 400 per 10 seconds per socket.
- **Size limits:** an SDP can be at most 32 KB, and a socket message at most 64 KB.

**Client → server**

| Event | Payload | Ack / effect |
|---|---|---|
| `call:invite` | `{ callId, toUserId, type: "audio" \| "video" }` | Ack `{ ok, error? }`. Then one of: `call:invite` to the callee, `call:busy` or `call:unavailable` to the caller. |
| `call:ringing` | `{ callId }` | Callee's tab is showing the call. The caller receives `call:ringing`. |
| `call:accept` | `{ callId }` | Ack `{ ok, resume }`. The caller receives `call:accept { resume }`; other callee tabs receive `call:answered-elsewhere`. |
| `call:reject` | `{ callId }` | Caller receives `call:reject`; logged as *declined*. |
| `call:cancel` | `{ callId }` | Caller hangs up while ringing. Callee receives `call:cancel`; logged as *missed*. |
| `call:end` | `{ callId }` | Ends the call. The other side receives `call:end { reason: "ended" }`; logged as *completed* with its duration. While ringing, it acts as cancel or reject. |
| `call:offer` / `call:answer` | `{ callId, description: { type, sdp } }` | Relayed to the other participant. |
| `call:ice-candidate` | `{ callId, candidate: { candidate, sdpMid, sdpMLineIndex, usernameFragment } }` | Relayed. |
| `call:media-state` | `{ callId, audio?, video?, videoPaused? }` | Relayed (mute, camera on/off, video paused for a poor network). |
| `call:rejoin` | `{ callId, resume }` | After a socket reconnect: re-attaches this tab to the call. Ack `{ ok }`. The other side receives `call:peer-reconnected`. |

**Server → client:**
- `call:invite { callId, type, conversationId, from: { _id, name, avatar } }`
- `call:ringing`
- `call:accept { resume }`
- `call:reject`
- `call:busy`
- `call:unavailable`
- `call:cancel`
- `call:end { reason: "ended" | "no-answer" | "declined" | "connection-lost" }`
- `call:answered-elsewhere`
- `call:offer`, `call:answer`, `call:ice-candidate`, `call:media-state` (relayed payloads)
- `call:peer-reconnecting`, `call:peer-reconnected`

Every event includes `callId`.

### Creating chatusers
```bash
npm run create-chatuser -- <email> <password> <name>
# e.g. npm run create-chatuser -- asha@example.com Temp1234 Asha Verma
```
