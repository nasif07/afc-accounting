const fs = require("fs");
const os = require("os");
const path = require("path");

const uploadDir =
  process.env.UPLOAD_DIR ||
  (process.env.VERCEL
    ? path.join(os.tmpdir(), "uploads")
    : path.resolve(process.cwd(), "uploads"));

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
]);

const ALLOWED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".pdf",
]);

const ensureUploadDir = () => {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
};

const mvAsync = (file, dest) =>
  new Promise((resolve, reject) =>
    file.mv(dest, (err) => (err ? reject(err) : resolve())),
  );

const fileUploader = async (req, res, next) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return next();
  }

  try {
    ensureUploadDir();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Upload storage is not available",
      error: error.message,
    });
  }

  const maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 5242880; // 5 MB

  for (const key in req.files) {
    const file = req.files[key];

    if (file.size > maxFileSize) {
      return res.status(400).json({
        success: false,
        message: `File size exceeds maximum limit of ${maxFileSize / 1024 / 1024}MB`,
      });
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: `File type '${file.mimetype}' is not allowed. Allowed types: JPEG, PNG, GIF, WEBP, PDF`,
      });
    }

    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return res.status(400).json({
        success: false,
        message: `File extension '${ext}' is not allowed`,
      });
    }

    const uniqueName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${ext}`;
    const filepath = path.join(uploadDir, uniqueName);

    try {
      await mvAsync(file, filepath);
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Error uploading file",
        error: err.message,
      });
    }

    req.uploadedFiles = req.uploadedFiles || {};
    req.uploadedFiles[key] = {
      filename: uniqueName,
      originalName: file.name,
      size: file.size,
      mimetype: file.mimetype,
      path: filepath,
    };
  }

  next();
};

module.exports = fileUploader;
