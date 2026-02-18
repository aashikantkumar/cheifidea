# File Upload Specifications

## 📏 **File Size Limits**

### **Current Configuration:**

| File Type | Maximum Size | Allowed Per Request |
|-----------|--------------|---------------------|
| **Avatar** | 5 MB | 1 file |
| **Cover Image** | 5 MB | 1 file |
| **Certificates** | 5 MB each | 5 files |
| **Dish Images** | 5 MB each | 5 files |
| **Total per request** | - | 10 files max |

---

## 🖼️ **Allowed File Formats**

### **Images (Avatar, Cover, Dishes):**
- ✅ JPEG/JPG
- ✅ PNG
- ✅ GIF
- ✅ WebP

### **Certificates:**
- ✅ PDF
- ✅ JPEG/JPG
- ✅ PNG

---

## ☁️ **Cloudinary Limits (Free Plan)**

| Limit Type | Amount |
|------------|--------|
| Max image size | 10 MB |
| Max video size | 100 MB |
| Total storage | 25 GB |
| Monthly bandwidth | 25 GB |
| Monthly transformations | 25,000 |

---

## 🎯 **Optimization Features**

### **Automatic by Cloudinary:**
- ✅ **Quality optimization** - Reduces file size while maintaining quality
- ✅ **Format conversion** - Converts to WebP for modern browsers
- ✅ **Responsive images** - Can serve different sizes based on device
- ✅ **CDN delivery** - Fast global delivery

---

## 🚫 **Error Messages**

### **File Too Large:**
```json
{
    "statusCode": 400,
    "message": "File size too large. Maximum allowed size is 5 MB per file.",
    "success": false
}
```

### **Too Many Files:**
```json
{
    "statusCode": 400,
    "message": "Too many files. Maximum 10 files allowed per request.",
    "success": false
}
```

### **Invalid File Type:**
```json
{
    "statusCode": 400,
    "message": "Invalid file type. Only image/jpeg, image/png, image/gif, etc. are allowed.",
    "success": false
}
```

---

## 📝 **Testing File Uploads**

### **Using Postman:**

1. **Select Body → form-data**
2. **Change key type to "File"** for image fields
3. **Select your file** (must be < 5 MB)
4. **Supported formats**: JPG, PNG, GIF, WebP

### **Example Test Files:**
- ✅ Avatar: 800x800 pixels, ~200 KB
- ✅ Cover: 1920x600 pixels, ~500 KB
- ✅ Certificate: PDF, ~1 MB

---

## 🔧 **Customizing Limits**

To change file size limits, edit [`multer.middleware.js`]:

```javascript
export const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // Change this: 5 MB
        files: 10 // Change this: max files
    },
    fileFilter: fileFilter
});
```

### **Common Sizes:**
- 1 MB = `1 * 1024 * 1024`
- 5 MB = `5 * 1024 * 1024`
- 10 MB = `10 * 1024 * 1024`

---

## 📊 **Recommended Image Sizes**

### **Avatar:**
- Dimensions: 400x400 to 800x800 pixels
- Format: JPEG (best compression)
- Size: 100-300 KB

### **Cover Image:**
- Dimensions: 1920x600 to 1920x1080 pixels
- Format: JPEG or WebP
- Size: 300-800 KB

### **Dish Images:**
- Dimensions: 800x800 to 1200x1200 pixels
- Format: JPEG
- Size: 200-500 KB each

### **Certificates:**
- Format: PDF preferred
- Size: 500 KB - 2 MB
- Image alternative: High-res JPEG/PNG

---

## 🛡️ **Security Features**

1. ✅ **File type validation** - Only allowed formats accepted
2. ✅ **Size limits** - Prevents huge file uploads
3. ✅ **Temporary storage** - Files deleted after upload to Cloudinary
4. ✅ **MIME type checking** - Validates actual file type, not just extension

---

## 💡 **Best Practices**

1. **Compress images before upload** using tools like:
   - TinyPNG
   - ImageOptim
   - Squoosh.app

2. **Use appropriate dimensions**:
   - Don't upload 5000x5000 images if you only need 800x800

3. **Choose the right format**:
   - Photos → JPEG
   - Graphics/logos → PNG
   - Documents → PDF

4. **Test with real files**:
   - Don't use placeholder URLs
   - Use actual image files in Postman

---

## 🔍 **Troubleshooting**

### **Upload fails but no error:**
- Check Cloudinary credentials in `.env`
- Ensure `public/temp` directory exists
- Check server console for errors

### **File too large error:**
- Compress your image
- Or increase limit in `multer.middleware.js`

### **Invalid file type error:**
- Ensure using JPG, PNG, GIF, or WebP
- Check MIME type matches file extension

---

## 📁 **File Storage Flow**

```
1. User uploads file via Postman/Frontend
   ↓
2. Multer validates:
   - File size (< 5 MB)
   - File type (allowed formats)
   - File count (< 10 files)
   ↓
3. File saved temporarily to public/temp/
   ↓
4. Cloudinary uploads file from temp:
   - Optimizes quality
   - Converts format (WebP)
   - Returns CDN URL
   ↓
5. Temp file deleted from server
   ↓
6. CDN URL saved to MongoDB
```

---

## 🚀 **Performance Tips**

1. **Cloudinary automatically optimizes** - Don't worry about perfect compression
2. **Use CDN URLs** - Always store and serve Cloudinary URLs
3. **Lazy load images** - Load images as user scrolls (frontend)
4. **Use thumbnails** - Generate smaller versions for lists/grids
