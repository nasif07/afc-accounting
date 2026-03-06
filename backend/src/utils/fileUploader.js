const fs = require('fs');
const path = require('path');

const uploadDir = process.env.UPLOAD_DIR || './uploads';

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const fileUploader = (req, res, next) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return next();
  }

  const maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 5242880; // 5MB default

  for (const key in req.files) {
    const file = req.files[key];

    // Check file size
    if (file.size > maxFileSize) {
      return res.status(400).json({
        success: false,
        message: `File size exceeds maximum limit of ${maxFileSize / 1024 / 1024}MB`
      });
    }

    // Generate unique filename
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${file.name}`;
    const filepath = path.join(uploadDir, uniqueName);

    // Move file to upload directory
    file.mv(filepath, (err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Error uploading file',
          error: err.message
        });
      }
    });

    // Attach file info to request
    req.uploadedFiles = req.uploadedFiles || {};
    req.uploadedFiles[key] = {
      filename: uniqueName,
      originalName: file.name,
      size: file.size,
      mimetype: file.mimetype,
      path: filepath
    };
  }

  next();
};

module.exports = fileUploader;
