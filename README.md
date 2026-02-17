# cheifidea API (Postman Testing Guide)

Backend for a chef-booking platform with separate User/Chef flows.

## Base URL

- `http://localhost:8000`
- API prefix: `/api/v1`

## Quick Start

1. Install dependencies
	 - `npm install`
2. Configure `.env`
3. Run server
	 - `npm run dev`
4. Verify health endpoint
	 - `GET /api/v1/health`

## Required Environment Variables

```env
PORT=8000
MONGODB_URI=mongodb://127.0.0.1:27017
ACCESS_TOKEN_SECRET=your_access_secret
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_SECRET=your_refresh_secret
REFRESH_TOKEN_EXPIRY=7d

USER_WEBSITE_URL=http://localhost:3000
CHEF_WEBSITE_URL=http://localhost:3001
CORS_ORIGIN=http://localhost:3000

CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

## Postman Setup

Create a Postman environment with:

- `baseUrl` = `http://localhost:8000/api/v1`
- `userEmail`
- `userPassword`
- `chefEmail`
- `chefPassword`
- `chefId`
- `dishId`
- `bookingId`

### Cookie/Auth note

Your controllers set cookies with:

- `httpOnly: true`
- `secure: true`

If you test on plain `http://localhost`, secure cookies may not persist in some setups.
For local development, set `secure: false` in cookie options if needed.

## Auth Flow (High Level)

1. Register/Login
2. Backend issues `accessToken` + `refreshToken` cookies
3. Access protected routes using cookies automatically
4. Call refresh route when access token expires
5. Logout clears cookies and DB refresh token

---

## 1) Health

### GET `{{baseUrl}}/health`

No auth required.

---

## 2) User APIs

### Register User

### POST `{{baseUrl}}/users/register`

Body type: `form-data`

- `fullName` (text) *required*
- `email` (text) *required*
- `username` (text) *required*
- `password` (text) *required*
- `phone` (text) *required*
- `avatar` (file) optional

### Login User

### POST `{{baseUrl}}/users/login`

Body JSON:

```json
{
	"email": "user1@example.com",
	"password": "Pass@123"
}
```

### Refresh User Token

### POST `{{baseUrl}}/users/refresh-token`

Uses refresh token from cookie (or body fallback):

```json
{
	"refreshToken": "optional_if_cookie_missing"
}
```

### Logout User

### POST `{{baseUrl}}/users/logout`

Auth required.

### Change Password

### POST `{{baseUrl}}/users/change-password`

Auth required.

```json
{
	"oldPassword": "Pass@123",
	"newPassword": "NewPass@123"
}
```

### Get User Profile

### GET `{{baseUrl}}/users/profile`

Auth required.

### Update User Profile

### PATCH `{{baseUrl}}/users/profile/update`

Auth required.

```json
{
	"fullName": "Updated User",
	"phone": "9999999999",
	"address": {
		"street": "MG Road",
		"city": "Bengaluru",
		"state": "Karnataka",
		"zipCode": "560001",
		"country": "India"
	}
}
```

### Update User Avatar

### PATCH `{{baseUrl}}/users/profile/avatar`

Auth required. Body type `form-data`:

- `avatar` (file)

### Get User Bookings

### GET `{{baseUrl}}/users/bookings?status=pending&page=1&limit=10`

Auth required.

### Favorites

- `GET {{baseUrl}}/users/favorites` (auth)
- `POST {{baseUrl}}/users/favorites/:chefId` (auth)
- `DELETE {{baseUrl}}/users/favorites/:chefId` (auth)

---

## 3) Chef APIs

### Register Chef

### POST `{{baseUrl}}/chefs/register`

Body type `form-data`:

- `fullName` (text) *required*
- `email` (text) *required*
- `password` (text) *required*
- `phone` (text) *required*
- `experience` (text/number) *required*
- `pricePerHour` (text/number) *required*
- `bio` (text) optional
- `specialization` (text JSON array) optional, e.g. `[
"Indian","Italian"]`
- `serviceLocations` (text JSON array) optional
- `avatar` (file) *required*
- `coverImage` (file) optional
- `certificates` (file, multiple) optional

### Login Chef

### POST `{{baseUrl}}/chefs/login`

```json
{
	"email": "chef1@example.com",
	"password": "Pass@123"
}
```

### Logout Chef

### POST `{{baseUrl}}/chefs/logout`

Auth + chef role required.

### Get Chef Profile

### GET `{{baseUrl}}/chefs/profile`

Auth + chef role required.

### Update Chef Profile

### PATCH `{{baseUrl}}/chefs/profile/update`

Auth + chef role required.

```json
{
	"bio": "15 years experience",
	"pricePerHour": 700,
	"minimumBookingHours": 2
}
```

### Chef Dishes

- `GET {{baseUrl}}/chefs/dishes` (auth + chef)
- `POST {{baseUrl}}/chefs/dishes/add` (auth + chef, form-data, images[] optional)
- `PATCH {{baseUrl}}/chefs/dishes/:dishId` (auth + chef)
- `DELETE {{baseUrl}}/chefs/dishes/:dishId` (auth + chef)

Sample add dish body (form-data text fields):

- `name`, `description`, `category`, `cuisine`, `preparationTime`, `cookingTime`, `price`
- optional: `servings`, `ingredients` (JSON), `dietaryInfo` (JSON), `tags` (JSON), `images` (files)

### Chef Booking Management

- `GET {{baseUrl}}/chefs/bookings` (auth + chef)
- `PATCH {{baseUrl}}/chefs/bookings/:bookingId/status` (auth + chef)

Status update body:

```json
{
	"status": "confirmed"
}
```

Allowed status values:

- `confirmed`
- `in-progress`
- `completed`
- `cancelled`

### Chef Dashboard

- `GET {{baseUrl}}/chefs/stats` (auth + chef)
- `PATCH {{baseUrl}}/chefs/availability/toggle` (auth + chef)

---

## 4) Public APIs (No Auth)

- `GET {{baseUrl}}/public/chefs`
- `GET {{baseUrl}}/public/chefs/search?q=indian`
- `GET {{baseUrl}}/public/chefs/:chefId`
- `GET {{baseUrl}}/public/chefs/:chefId/dishes`
- `GET {{baseUrl}}/public/dishes`
- `GET {{baseUrl}}/public/dishes/:dishId`

Useful query params:

- chefs: `page`, `limit`, `city`, `specialization`, `minPrice`, `maxPrice`, `minRating`, `sortBy`, `order`
- dishes: `q`, `category`, `cuisine`, `minPrice`, `maxPrice`, `vegetarian`, `vegan`, `spiceLevel`, `page`, `limit`

---

## 5) Booking APIs (Auth Required)

### Create Booking

### POST `{{baseUrl}}/bookings/create`

```json
{
	"chefId": "<chefProfileId>",
	"dishes": [
		{ "dishId": "<dishId1>", "quantity": 2 },
		{ "dishId": "<dishId2>", "quantity": 1 }
	],
	"bookingDate": "2026-03-10",
	"bookingTime": "19:00",
	"eventType": "Casual Dinner",
	"guestCount": 4,
	"serviceLocation": {
		"address": "Flat 12, Main Street",
		"city": "Bengaluru",
		"state": "Karnataka",
		"zipCode": "560001"
	},
	"specialInstructions": "Less spicy",
	"dietaryRestrictions": ["No peanuts"],
	"paymentMethod": "cash"
}
```

### Get Booking By ID

### GET `{{baseUrl}}/bookings/:bookingId`

### Cancel Booking

### PATCH `{{baseUrl}}/bookings/:bookingId/cancel`

```json
{
	"reason": "Plan changed"
}
```

### Add Review (completed bookings only)

### POST `{{baseUrl}}/bookings/:bookingId/review`

```json
{
	"rating": 5,
	"foodQuality": 5,
	"professionalism": 5,
	"punctuality": 4,
	"comment": "Excellent service"
}
```

---

## Suggested Postman Test Order

1. Health check
2. Register chef
3. Login chef
4. Add 1-2 dishes
5. Register user
6. Login user
7. Public chefs/dishes browse
8. Create booking
9. Chef updates booking status
10. User fetches booking and adds review

## Common Issues

- `401 Unauthorized`: missing/expired access token cookie
- `403 Access denied`: role mismatch (user trying chef route)
- `409 already exists`: email/username duplicates
- `Dish does not belong to this chef`: invalid `chefId` + `dishId` pair
- Cookie not set in local: check `secure: true` over HTTP

## API Response Format

Success shape (`ApiResponse`):

```json
{
	"statusCode": 200,
	"data": {},
	"message": "Success",
	"success": true
}
```

