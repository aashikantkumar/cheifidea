# Test Chef Registration

## Postman Request Setup

### Endpoint
```
POST http://localhost:8000/api/chef/register
```

### Headers
```
Content-Type: multipart/form-data
(Automatically set by Postman when using form-data)
```

### Body (form-data)

| Key | Type | Value | Required |
|-----|------|-------|----------|
| fullName | Text | `John Chef` | ✅ Yes |
| email | Text | `john.chef@example.com` | ✅ Yes |
| password | Text | `password123` | ✅ Yes |
| phone | Text | `9876543210` | ✅ Yes |
| experience | Text | `5` | ✅ Yes |
| pricePerHour | Text | `150` | ✅ Yes |
| bio | Text | `Experienced chef specializing in Italian cuisine` | ❌ Optional |
| specialization | Text | `["Italian", "French", "Continental"]` | ❌ Optional |
| serviceLocations | Text | `[{"city": "Mumbai", "state": "Maharashtra", "country": "India"}]` | ❌ Optional |
| avatar | File | Select an image file (JPG/PNG) | ✅ Yes |
| coverImage | File | Select an image file (JPG/PNG) | ❌ Optional |
| certificates | File | Select PDF/Image files (max 5) | ❌ Optional |

### Important Notes:

1. **specialization** must be valid JSON array with values from:
   - `"Italian"`, `"Chinese"`, `"Indian"`, `"Mexican"`, `"Japanese"`, `"French"`, 
   - `"Thai"`, `"Continental"`, `"BBQ"`, `"Desserts"`, `"Vegan"`, `"Fusion"`, `"Street Food"`

2. **serviceLocations** must be valid JSON array with objects containing at least a `"city"` field:
   ```json
   [
       {
           "city": "Mumbai",
           "state": "Maharashtra",
           "country": "India",
           "radius": 50
       }
   ]
   ```

3. Files must be actual image files (not just file paths)

## Expected Success Response

```json
{
    "statusCode": 201,
    "data": {
        "chef": {
            "_id": "65abc123...",
            "email": "john.chef@example.com",
            "role": "chef",
            "chefProfile": {
                "_id": "65abc456...",
                "account": "65abc123...",
                "fullName": "John Chef",
                "phone": "9876543210",
                "avatar": "https://res.cloudinary.com/...",
                "bio": "Experienced chef specializing in Italian cuisine",
                "specialization": ["Italian", "French", "Continental"],
                "experience": 5,
                "pricePerHour": 150,
                "serviceLocations": [
                    {
                        "city": "Mumbai",
                        "state": "Maharashtra",
                        "country": "India"
                    }
                ],
                "averageRating": 0,
                "totalReviews": 0,
                "totalBookings": 0,
                "isAvailable": true,
                "accountStatus": "pending"
            }
        },
        "accessToken": "eyJhbGci...",
        "refreshToken": "eyJhbGci..."
    },
    "message": "Chef registered successfully",
    "success": true
}
```

## Check Console Output

After sending the request, check your server console for:
```
Account created with ID: 65abc123...
ChefProfile created with ID: 65abc456...
Account updated with chefProfile reference
File uploaded successfully to cloudinary: https://...
```

## Check MongoDB

### Using MongoDB Compass or Shell:

```javascript
// Check Account
db.accounts.find({ email: "john.chef@example.com" })

// Check ChefProfile
db.chefprofiles.find({ fullName: "John Chef" })

// Both should exist and be linked:
// Account.chefProfile should equal ChefProfile._id
// ChefProfile.account should equal Account._id
```

## Common Errors

### 1. ChefProfile not created
**Check console for**: `ChefProfile creation failed: ...`

**Possible causes**:
- Invalid specialization values
- Missing `city` in serviceLocations
- Invalid data types (experience/pricePerHour not numbers)

### 2. File upload failed
**Check console for**: `Cloudinary upload error: ...`

**Possible causes**:
- Cloudinary credentials not set in .env
- File size too large
- Invalid file format

### 3. Validation Error
**Error message**: `All required fields must be provided`

**Solution**: Ensure fullName, email, password, phone, experience, pricePerHour, and avatar are provided

## Test with cURL (Alternative)

```bash
curl -X POST http://localhost:8000/api/chef/register \
  -F "fullName=John Chef" \
  -F "email=john.chef@example.com" \
  -F "password=password123" \
  -F "phone=9876543210" \
  -F "experience=5" \
  -F "pricePerHour=150" \
  -F "bio=Experienced chef" \
  -F 'specialization=["Italian","French"]' \
  -F 'serviceLocations=[{"city":"Mumbai"}]' \
  -F "avatar=@/path/to/image.jpg"
```
