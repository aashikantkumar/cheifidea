import multer from "multer"

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, './public/temp')
    },
    filename: function(req, file, cb) {
        cb(null, file.originalname)
    }
})

// File filter to allow only images
const fileFilter = (req, file, cb) => {
    // Allow only image files
    const allowedMimeTypes = [
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf' // For certificates
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type. Only ${allowedMimeTypes.join(', ')} are allowed.`), false);
    }
};

export const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB max file size
        files: 10 // Maximum 10 files per request
    },
    fileFilter: fileFilter
});