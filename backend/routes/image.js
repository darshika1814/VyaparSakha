const express = require('express');
const multer  = require('multer');
const fs = require('fs');
const path = require('path');
const cloudinary = require("cloudinary").v2;

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

const uploadoncloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) {
            return null;
        }

        const result = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "image",
            folder: "Bills"
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
  
const upload = multer({ storage });

router.post("/images", upload.array("billimage", 3), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                message: "Please select at least one bill image."
            });
        }
        const uploadedUrls = [];

        // Upload sequentially instead of sending concurrent requests.
        for (const file of req.files) {
            const url = await uploadoncloudinary(file.path);

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

        const results = await Promise.all(
            imageUrls.map(async (imageUrl) => {
                const publicId = getPublicIdFromUrl(imageUrl);

                if (!publicId) {
                    throw new Error('Invalid Cloudinary image URL');
                }

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