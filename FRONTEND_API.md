# CheifIdea — Frontend API Reference

Complete guide for frontend developers to consume the CheifIdea backend.

---

## Table of Contents

1. [Base URL & Setup](#1-base-url--setup)
2. [Authentication Flow](#2-authentication-flow)
3. [Standard Response Shape](#3-standard-response-shape)
4. [Error Handling](#4-error-handling)
5. [Public API — No Auth Required](#5-public-api--no-auth-required)
6. [User API](#6-user-api)
7. [Chef API](#7-chef-api)
8. [Booking API](#8-booking-api)
9. [Admin API](#9-admin-api)
10. [Data Models Reference](#10-data-models-reference)
11. [Enums & Allowed Values](#11-enums--allowed-values)
12. [File Upload Guide](#12-file-upload-guide)
13. [Rate Limiting & Security](#13-rate-limiting--security)

---

## 1. Base URL & Setup

```
Development:  http://localhost:8000/api/v1
Production:   https://your-domain.com/api/v1
```

### Axios Setup (recommended)

```js
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000/api/v1",
  withCredentials: true, // REQUIRED — sends cookies automatically
});
```

> **`withCredentials: true` is mandatory.** Tokens are stored in httpOnly cookies.
> The browser cannot read them via JavaScript — that is intentional (XSS protection).

### Fetch Setup

```js
fetch("/api/v1/...", {
  credentials: "include", // equivalent of withCredentials: true
  headers: { "Content-Type": "application/json" },
});
```

---

## 2. Authentication Flow

The API uses a **two-token system**:

| Token | Stored in | Lifetime | Purpose |
|---|---|---|---|
| `accessToken` | httpOnly cookie + response body | Short (15 min) | Sent on every authenticated request |
| `refreshToken` | httpOnly cookie | Long (7 days) | Used only to get a new access token |

### How it works

```
1. User/Chef logs in → server sets both cookies automatically
2. Every subsequent request → browser sends cookies automatically
3. When access token expires → call POST /users/refresh-token
4. Server validates refresh token → issues new access token cookie
5. On logout → both cookies are cleared server-side
```

### Token in Authorization Header (alternative)

If you cannot use cookies (e.g. React Native), pass the token manually:

```
Authorization: Bearer <accessToken>
```

The login/register responses also return tokens in the body for this use case.

---

## 3. Standard Response Shape

Every response follows this structure:

```json
{
  "statusCode": 200,
  "data": { },
  "message": "Operation successful",
  "success": true,
  "errors": []
}
```

| Field | Type | Description |
|---|---|---|
| `statusCode` | number | HTTP status code |
| `data` | object / array / null | The actual payload |
| `success` | boolean | `true` for 2xx, `false` for errors |
| `message` | string | Human-readable message |
| `errors` | array | Field-level errors (from validation) |

---

## 4. Error Handling

```json
{
  "statusCode": 400,
  "data": null,
  "message": "Validation failed",
  "success": false,
  "errors": ["fullName is required", "email must be a valid email"]
}
```

### HTTP Status Codes Used

| Code | When |
|---|---|
| `200` | Success |
| `201` | Resource created |
| `400` | Bad request / validation error / invalid JSON |
| `401` | Missing or invalid access token |
| `403` | Valid token, but wrong role (chef trying user route) |
| `404` | Resource not found |
| `409` | Duplicate (email / username already exists) |
| `429` | Rate limit exceeded — wait before retrying |
| `500` | Server error |

### Recommended Axios Interceptor

```js
api.interceptors.response.use(
  (res) => res.data.data,  // unwrap the data field automatically
  async (err) => {
    if (err.response?.status === 401) {
      // Try to refresh token
      try {
        await api.post("/users/refresh-token");
        return api.request(err.config); // retry original request
      } catch {
        // Refresh failed — redirect to login
        window.location.href = "/login";
      }
    }
    return Promise.reject(err.response?.data);
  }
);
```

---

## 5. Public API — No Auth Required

### Browse Chefs

```
GET /public/chefs
```

**Query parameters:**

| Param | Type | Example | Description |
|---|---|---|---|
| `page` | number | `1` | Page number (default: 1) |
| `limit` | number | `12` | Results per page (default: 12) |
| `sortBy` | string | `averageRating` | Field to sort by |
| `order` | string | `desc` | `asc` or `desc` |
| `city` | string | `Mumbai` | Filter by service city (case-insensitive) |
| `specialization` | string | `Italian,Vegan` | Comma-separated list |
| `minPrice` | number | `500` | Minimum price per hour |
| `maxPrice` | number | `2000` | Maximum price per hour |
| `minRating` | number | `4` | Minimum average rating |

**Response `data`:**
```json
{
  "chefs": [
    {
      "_id": "...",
      "fullName": "Rahul Sharma",
      "avatar": "https://res.cloudinary.com/...",
      "coverImage": "https://res.cloudinary.com/...",
      "specialization": ["Indian", "Continental"],
      "experience": 8,
      "pricePerHour": 1500,
      "averageRating": 4.7,
      "totalReviews": 42,
      "totalBookings": 120,
      "serviceLocations": [{ "city": "Mumbai", "state": "Maharashtra" }],
      "bio": "...",
      "isAvailable": true
    }
  ],
  "total": 87,
  "page": 1,
  "totalPages": 8
}
```

---

### Get Single Chef

```
GET /public/chefs/:chefId
```

Returns full chef profile including `workingHours`, `certification`, `socialLinks`, and `portfolioImages`.

---

### Search Chefs (text search)

```
GET /public/chefs/search?q=italian+chef+delhi
```

---

### Get Chef's Dishes

```
GET /public/chefs/:chefId/dishes
```

---

### Search Dishes

```
GET /public/dishes?cuisine=Indian&category=Main+Course
```

---

### Get Single Dish

```
GET /public/dishes/:dishId
```

---

## 6. User API

> All routes below (except register, login, refresh-token) require authentication.

### Register

```
POST /users/register
Content-Type: multipart/form-data
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `fullName` | text | ✅ | |
| `email` | text | ✅ | Must be unique |
| `username` | text | ✅ | Lowercase, must be unique |
| `password` | text | ✅ | |
| `phone` | text | ✅ | |
| `avatar` | file | ❌ | JPEG/PNG/WEBP, max 5MB |

**Response `data`:**
```json
{
  "user": { "_id": "...", "email": "...", "role": "user", "userProfile": { } },
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

---

### Login

```
POST /users/login
Content-Type: application/json
```

```json
{
  "email": "user@example.com",
  "password": "yourpassword"
}
```

---

### Logout

```
POST /users/logout
```
Auth required. Clears both cookies server-side.

---

### Refresh Access Token

```
POST /users/refresh-token
```

No body needed — reads the `refreshToken` cookie automatically.
Issues a new `accessToken` cookie.

---

### Change Password

```
POST /users/change-password
Content-Type: application/json
```

```json
{
  "oldPassword": "current",
  "newPassword": "newone"
}
```

---

### Get Profile

```
GET /users/profile
```

---

### Update Profile

```
PATCH /users/profile/update
Content-Type: application/json
```

```json
{
  "fullName": "New Name",
  "phone": "9999999999",
  "address": "New Address"
}
```

---

### Update Avatar

```
PATCH /users/profile/avatar
Content-Type: multipart/form-data
```

| Field | Type | Required |
|---|---|---|
| `avatar` | file | ✅ |

---

### Get User Bookings

```
GET /users/bookings
```

---

### Favorite Chefs

```
GET    /users/favorites               → list all favorites
POST   /users/favorites/:chefId       → add chef to favorites
DELETE /users/favorites/:chefId       → remove from favorites
```

---

## 7. Chef API

> All routes below (except register, login) require auth + chef role.

### Register

```
POST /chefs/register
Content-Type: multipart/form-data
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `fullName` | text | ✅ | |
| `email` | text | ✅ | |
| `password` | text | ✅ | |
| `phone` | text | ✅ | |
| `experience` | number | ✅ | Years |
| `pricePerHour` | number | ✅ | In rupees |
| `bio` | text | ❌ | Max 500 chars |
| `specialization` | JSON string | ❌ | `'["Indian","Vegan"]'` |
| `serviceLocations` | JSON string | ❌ | `'[{"city":"Mumbai","state":"MH"}]'` |
| `avatar` | file | ✅ | Max 5MB |
| `coverImage` | file | ❌ | Max 5MB |
| `certificates` | file(s) | ❌ | Up to 5 files |

> **Important:** `specialization` and `serviceLocations` must be sent as **JSON strings** in `multipart/form-data`.

```js
const form = new FormData();
form.append("fullName", "Rahul Chef");
form.append("specialization", JSON.stringify(["Indian", "Continental"]));
form.append("serviceLocations", JSON.stringify([{ city: "Mumbai", state: "Maharashtra" }]));
form.append("avatar", avatarFile);
```

> After registration the chef account is in `pending` status and must be **approved by an admin** before they appear in public listings.

---

### Login

```
POST /chefs/login
Content-Type: application/json
```

```json
{
  "email": "chef@example.com",
  "password": "yourpassword"
}
```

---

### Logout

```
POST /chefs/logout
```

---

### Get Own Profile

```
GET /chefs/profile
```

---

### Update Profile

```
PATCH /chefs/profile/update
Content-Type: application/json
```

Any subset of: `fullName`, `phone`, `bio`, `specialization`, `experience`, `pricePerHour`, `serviceLocations`, `workingHours`, `socialLinks`.

---

### Dish Management

```
GET    /chefs/dishes              → list own dishes
POST   /chefs/dishes/add          → add new dish (multipart/form-data)
PATCH  /chefs/dishes/:dishId      → update dish
DELETE /chefs/dishes/:dishId      → delete dish
```

**Add Dish fields (`multipart/form-data`):**

| Field | Type | Required |
|---|---|---|
| `name` | text | ✅ |
| `description` | text | ✅ |
| `category` | text | ✅ |
| `cuisine` | text | ✅ |
| `price` | number | ✅ |
| `preparationTime` | number (mins) | ✅ |
| `cookingTime` | number (mins) | ✅ |
| `servings` | number | ❌ |
| `ingredients` | JSON string | ❌ |
| `images` | file(s) | ❌ |

---

### Booking Management (Chef side)

```
GET   /chefs/bookings                          → list all bookings for this chef
PATCH /chefs/bookings/:bookingId/status        → update booking status
```

**Update booking status body:**
```json
{ "status": "confirmed" }
```

Valid status transitions (chef-side): `pending → confirmed → in-progress → completed`

---

### Dashboard

```
GET   /chefs/stats                → earnings, bookings count, rating summary
PATCH /chefs/availability/toggle  → toggle isAvailable on/off
```

---

## 8. Booking API

> `create`, `cancel`, and `review` require user role.
> `GET /:bookingId` is accessible to both the booking's user and chef.

### Create Booking

```
POST /bookings/create
Content-Type: application/json
```

```json
{
  "chefId": "<ChefProfile _id>",
  "bookingDate": "2026-03-15",
  "bookingTime": "19:00",
  "eventType": "Birthday Party",
  "guestCount": 20,
  "serviceLocation": {
    "address": "123 Main Street",
    "city": "Mumbai",
    "state": "Maharashtra",
    "zipCode": "400001"
  },
  "dishes": [
    { "dishId": "<Dish _id>", "quantity": 2 },
    { "dishId": "<Dish _id>", "quantity": 1 }
  ],
  "paymentMethod": "cash",
  "specialInstructions": "No nuts please",
  "dietaryRestrictions": ["nut-free", "gluten-free"]
}
```

**Price breakdown in response:**

| Field | Meaning |
|---|---|
| `dishesTotal` | Sum of (dish price × quantity) |
| `chefFee` | `pricePerHour × minimumBookingHours` |
| `platformFee` | 5% of dishesTotal |
| `taxes` | 18% GST on (dishesTotal + chefFee) |
| `totalAmount` | dishesTotal + chefFee + platformFee + taxes |

---

### Get Booking Details

```
GET /bookings/:bookingId
```

Both the booking's user and chef can access this.

---

### Cancel Booking

```
PATCH /bookings/:bookingId/cancel
Content-Type: application/json
```

```json
{ "reason": "Change of plans" }
```

Only the **user who made the booking** can cancel.
Cancellable when status is: `pending`, `confirmed`, or `in-progress`.

---

### Add Review

```
POST /bookings/:bookingId/review
Content-Type: application/json
```

```json
{
  "rating": 5,
  "foodQuality": 5,
  "professionalism": 4,
  "punctuality": 5,
  "comment": "Absolutely amazing experience!"
}
```

- Only allowed when `bookingStatus === "completed"`
- Only the booking's user can review
- One review per booking

---

## 9. Admin API

> Requires admin role (`verifyJWT + verifyAdmin`).

```
GET   /admin/chefs/pending             → list chefs awaiting approval
PATCH /admin/chefs/:chefId/approve     → approve a chef (sets isApproved: true, accountStatus: active)
PATCH /admin/chefs/:chefId/reject      → reject a chef (sets isApproved: false, accountStatus: inactive)
PATCH /admin/chefs/:chefId/suspend     → suspend a chef (accountStatus: suspended)
```

After approval, the chef appears in public listings. Before approval they are invisible to users.

---

## 10. Data Models Reference

### Chef Profile (public fields)

```ts
{
  _id: string
  fullName: string
  avatar: string           // Cloudinary URL
  coverImage?: string      // Cloudinary URL
  bio?: string             // max 500 chars
  specialization: string[] // see Enums section
  experience: number       // years
  pricePerHour: number
  minimumBookingHours: number  // default 2
  serviceLocations: [{ city, state?, country?, radius? }]
  workingHours: {
    monday: { available: boolean, slots: [{ start: "HH:MM", end: "HH:MM" }] }
    // ... tuesday through sunday
  }
  averageRating: number    // 0–5
  totalReviews: number
  totalBookings: number
  isAvailable: boolean
  accountStatus: "pending" | "active" | "inactive" | "suspended"
  isApproved: boolean
  socialLinks?: { instagram?, facebook?, youtube? }
  portfolioImages?: [{ url: string, caption?: string }]
}
```

### Dish

```ts
{
  _id: string
  chef: string             // ChefProfile _id
  name: string
  description: string      // max 1000 chars
  category: string         // see Enums
  cuisine: string          // see Enums
  images: string[]         // Cloudinary URLs
  preparationTime: number  // minutes
  cookingTime: number      // minutes
  servings: number
  price: number
  ingredients: [{ name, quantity?, unit? }]
  isAvailable: boolean
  isVegetarian: boolean
  isVegan: boolean
  isGlutenFree: boolean
  spiceLevel: "mild" | "medium" | "hot" | "extra-hot"
  ordersCount: number
}
```

### Booking

```ts
{
  _id: string
  user: UserProfile        // populated
  chef: ChefProfile        // populated
  dishes: [{ dish: Dish, quantity: number, price: number }]
  bookingDate: string      // ISO date
  bookingTime: string      // "HH:MM"
  eventType: string
  guestCount: number
  serviceLocation: { address, city?, state?, zipCode?, coordinates? }
  dishesTotal: number
  chefFee: number
  platformFee: number
  taxes: number
  totalAmount: number
  paymentStatus: "pending" | "paid" | "refunded" | "failed"
  paymentMethod: "cash" | "card" | "upi" | "wallet"
  bookingStatus: "pending" | "confirmed" | "in-progress" | "completed" | "cancelled"
  specialInstructions?: string
  dietaryRestrictions?: string[]
  cancellationReason?: string
  cancelledBy?: "user" | "chef" | "admin"
  createdAt: string
}
```

---

## 11. Enums & Allowed Values

### Chef Specialization
```
"Italian" | "Chinese" | "Indian" | "Mexican" | "Japanese" |
"French" | "Thai" | "Continental" | "BBQ" | "Desserts" |
"Vegan" | "Fusion" | "Street Food"
```

### Dish Category
```
"Appetizer" | "Main Course" | "Dessert" | "Beverage" |
"Snack" | "Breakfast" | "Salad" | "Soup" | "Side Dish"
```

### Dish Cuisine
```
"Italian" | "Chinese" | "Indian" | "Mexican" | "Japanese" |
"French" | "Thai" | "Continental" | "Fusion" | "Other"
```

### Event Type
```
"Birthday Party" | "Wedding" | "Corporate Event" |
"Casual Dinner" | "Festival" | "Anniversary" | "Other"
```

### Booking Status (lifecycle)
```
pending → confirmed → in-progress → completed
                                  ↘ cancelled (from any of the first 3)
```

### Payment Method
```
"cash" | "card" | "upi" | "wallet"
```

---

## 12. File Upload Guide

All file uploads use `multipart/form-data`.

| Uploader | Max files | Max size each | Allowed types |
|---|---|---|---|
| User avatar | 1 | 5 MB | JPEG, PNG, WEBP |
| Chef avatar | 1 | 5 MB | JPEG, PNG, WEBP |
| Chef cover image | 1 | 5 MB | JPEG, PNG, WEBP |
| Chef certificates | 5 | 5 MB each | JPEG, PNG, WEBP |
| Dish images | 5 | 5 MB each | JPEG, PNG, WEBP |

**Example with React + Axios:**

```jsx
const handleSubmit = async (e) => {
  e.preventDefault();
  const form = new FormData();

  form.append("fullName", "Rahul Sharma");
  form.append("email", "rahul@chef.com");
  form.append("password", "secret123");
  form.append("phone", "9876543210");
  form.append("experience", 5);
  form.append("pricePerHour", 1200);
  form.append("specialization", JSON.stringify(["Indian", "Fusion"]));
  form.append("serviceLocations", JSON.stringify([{ city: "Delhi", state: "Delhi" }]));
  form.append("avatar", avatarFile);           // File object
  form.append("coverImage", coverFile);         // File object

  const res = await api.post("/chefs/register", form);
  // tokens are set as cookies automatically
};
```

---

## 13. Rate Limiting & Security

- **Rate limit:** Configurable via env. Default is applied globally to all routes.
- **Response when limited:** `429 Too Many Requests`
- **CORS:** Only origins in the server's allowlist can make requests. Add your frontend URL to the backend `.env` → `CORS_ALLOWLIST`.
- **Cookies:** `httpOnly` (JS cannot read them) + `secure` (HTTPS only in production). Always use `withCredentials: true`.

### Health Check Endpoints

```
GET /health          → { status: "ok", message: "Server is running" }
GET /health/live     → { status: "ok", message: "Service is alive" }
GET /health/ready    → 200 if DB connected, 503 if not
```

Use `/health/ready` in your loading screen to know if the backend is up before rendering the app.

---

## Quick Reference

| Action | Method | Endpoint | Auth |
|---|---|---|---|
| Browse chefs | GET | `/public/chefs` | None |
| Get chef | GET | `/public/chefs/:id` | None |
| Search dishes | GET | `/public/dishes` | None |
| Register user | POST | `/users/register` | None |
| Login user | POST | `/users/login` | None |
| Refresh token | POST | `/users/refresh-token` | None |
| Get profile | GET | `/users/profile` | User |
| Update profile | PATCH | `/users/profile/update` | User |
| Create booking | POST | `/bookings/create` | User |
| Cancel booking | PATCH | `/bookings/:id/cancel` | User |
| Add review | POST | `/bookings/:id/review` | User |
| Register chef | POST | `/chefs/register` | None |
| Login chef | POST | `/chefs/login` | None |
| Add dish | POST | `/chefs/dishes/add` | Chef |
| Get bookings | GET | `/chefs/bookings` | Chef |
| Update booking | PATCH | `/chefs/bookings/:id/status` | Chef |
| Toggle availability | PATCH | `/chefs/availability/toggle` | Chef |
| Pending chefs | GET | `/admin/chefs/pending` | Admin |
| Approve chef | PATCH | `/admin/chefs/:id/approve` | Admin |
