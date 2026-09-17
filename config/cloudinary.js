const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary only when credentials are provided.
// If CLOUDINARY_* env vars are absent the module still loads successfully,
// but actual upload/delete calls made by the controller will fail gracefully
// with a warning rather than crashing the server at startup.
if (
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
} else {
  console.warn(
    '[Cloudinary] CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET ' +
    'are not set. Image upload/delete operations will be unavailable.'
  );
}

// Multer storage — uses Cloudinary when credentials are present,
// falls back to memory storage so routes still mount without crashing.
let storage;
if (
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
) {
  storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: 'event-notices',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      transformation: [{ width: 1200, crop: 'limit' }],
    },
  });
} else {
  // Fallback: store in memory (no actual upload will occur)
  storage = multer.memoryStorage();
}

const upload = multer({ storage });

// ── System Announcements uploader ──────────────────────────────────────────
// Separate multer instance that stores files in the 'system-announcements'
// Cloudinary folder. Accepts images AND common document types (pdf, doc, docx).
let announcementStorage;
if (
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
) {
  announcementStorage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
      // Determine resource_type based on mimetype:
      // images → 'image', documents/other → 'raw'
      const isImage = file.mimetype.startsWith('image/');
      return {
        folder: 'system-announcements',
        resource_type: isImage ? 'image' : 'raw',
        allowed_formats: isImage
          ? ['jpg', 'jpeg', 'png', 'webp', 'gif']
          : ['pdf', 'doc', 'docx'],
        // preserve the original filename (without extension) as the public_id
        public_id: `${Date.now()}-${file.originalname.replace(/\.[^/.]+$/, '').replace(/\s+/g, '_')}`,
      };
    },
  });
} else {
  announcementStorage = multer.memoryStorage();
}

const uploadAnnouncement = multer({ storage: announcementStorage });

module.exports = { cloudinary, upload, uploadAnnouncement };
