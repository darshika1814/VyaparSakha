const express = require('express');
const multer  = require('multer');
const fs = require('fs');
const path = require('path');
const cloudinary = require("cloudinary").v2;
const { protect } = require('../middleware/auth');

const uploadDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

cloudinary.config({ 
    cloud_name: `${process.env.CLOUDINARY_NAME}`, 
    api_key: `${process.env.CLOUDINARY_API_KEY}`, 
    api_secret: `${process.env.CLOUDINARY_API_SECRET}`
  });

const config = cloudinary.config();

console.log("Cloudinary configuration check:", {
    cloudNamePresent: Boolean(config.cloud_name),
    apiKeyPresent: Boolean(config.api_key),
    apiSecretPresent: Boolean(config.api_secret),
    cloudNameMatchesEnv:
        config.cloud_name === process.env.CLOUDINARY_NAME,
    apiKeyMatchesEnv:
        config.api_key === process.env.CLOUDINARY_API_KEY,
    apiSecretMatchesEnv:
        config.api_secret === process.env.CLOUDINARY_API_SECRET
});

const router = express.Router();

// Every image route requires a logged-in shopkeeper.
router.use(protect);

const uploadoncloudinary = async (localFilePath, shopkeeperId) => {
    try {
        if (!localFilePath) {
            return null;
        }

        const result = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "image",
            // Each shopkeeper's bills live in their own folder.
            folder: `Bills/${shopkeeperId}`
        });

        console.log("File uploaded:", result.secure_url);
        return result.secure_url;

    } catch (error) {
        console.error("Cloudinary upload failed:", error.message);
        return null;

    } finally {
        // Remove the temporary local file after the upload attempt.
        if (localFilePath && fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }
    }
};

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
      return cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      return cb(null, `${Date.now()}-${file.originalname}`);
    },
  });
  
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024, files: 3 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype && file.mimetype.startsWith('image/')) {
            return cb(null, true);
        }
        return cb(new Error('Only image files are allowed.'));
    }
});

// Run multer manually so upload problems return a clean 400.
const handleUpload = (req, res, next) => {
    upload.array("billimage", 3)(req, res, (err) => {
        if (err) {
            return res.status(400).json({ message: err.message });
        }
        return next();
    });
};

router.post("/images", handleUpload, async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                message: "Please select at least one bill image."
            });
        }
        const uploadedUrls = [];

        // Upload sequentially instead of sending concurrent requests.
        for (const file of req.files) {
            const url = await uploadoncloudinary(file.path, req.shopkeeper.id);

            if (url) {
                uploadedUrls.push(url);
            }
        }
        if (uploadedUrls.length === 0) {
            return res.status(502).json({
                message: "Image upload failed. Please wait and try again."
            });
        }
        return res.status(200).json(uploadedUrls);

    } catch (error) {
        console.error("Image upload error:", error);

        // Clean up any temporary files remaining after an unexpected error.
        if (req.files) {
            for (const file of req.files) {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            }
        }
        return res.status(500).json({
            message: "An error occurred while uploading bill images."
        });
    }
});

function getPublicIdFromUrl(imageUrl) {
  const parts = imageUrl.split('/');
  const uploadIndex = parts.indexOf('upload');
  
  // Extract everything after the 'upload/' part, ignoring the version number (if any)
  const publicIdWithExtension = parts.slice(uploadIndex + 2).join('/'); // Skip the 'upload' and the version part
  const publicId = publicIdWithExtension.split('.')[0]; // Remove file extension
  return publicId;
}

router.delete('/deleteimage', async (req, res) => {
    try {
        const { imageUrls } = req.body;

        if (!Array.isArray(imageUrls)) {
            return res.status(400).json({
                message: 'imageUrls must be an array'
            });
        }

        // A shopkeeper may only delete images in their own folder.
        const ownPrefix = `Bills/${req.shopkeeper.id}/`;
        const publicIds = imageUrls.map((imageUrl) =>
            typeof imageUrl === 'string' ? getPublicIdFromUrl(imageUrl) : ''
        );

        if (publicIds.some((id) => !id || !id.startsWith(ownPrefix) || id.includes('..'))) {
            return res.status(403).json({
                success: false,
                message: 'You can only delete your own bill images.'
            });
        }

        const results = await Promise.all(
            publicIds.map(async (publicId) => {

                return cloudinary.uploader.destroy(publicId, {
                    resource_type: 'image'
                });
            })
        );

        console.log('Images deleted:', results);

        // Important: send a response to finish the HTTP request.
        return res.status(200).json({
            success: true,
            message: 'Images deleted successfully',
            results
        });

    } catch (error) {
        console.error('Error deleting images:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to delete images'
        });
    }
});

exports.router = router;