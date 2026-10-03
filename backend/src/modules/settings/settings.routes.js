const express = require('express');
const SettingsController = require('./settings.controller');
const auth = require('../../middleware/auth');
const { directorOnly } = require('../../middleware/roleCheck');
const validate = require('../../validation/validate');
const {
  presignLogoBody,
  setLogoBody,
} = require('../../validation/settings.validation');

const router = express.Router();

// Declared BEFORE router.use(auth): the logo is rendered by <img> tags, which
// send no Authorization header and — once this app is served from a different
// origin to the API — may not send cookies either. An organisation's logo is
// not a secret, and gating it only produces broken images. It exposes nothing
// beyond the artwork itself: the object key stays server-side and the
// presigned URL it redirects to expires in minutes.
router.get('/logo', SettingsController.getLogo);

router.use(auth);

router.get('/', SettingsController.getSettings);
router.put('/', directorOnly, SettingsController.updateSettings);

// ── Logo upload (director only) ──────────────────────────────────────────
// Two steps, matching the approval-attachment flow: mint a presigned PUT, then
// commit the key once the browser has uploaded straight to R2. The bytes never
// pass through this process.
router.post(
  '/logo/presign',
  directorOnly,
  validate({ body: presignLogoBody }),
  SettingsController.presignLogoUpload,
);

router.patch(
  '/logo',
  directorOnly,
  validate({ body: setLogoBody }),
  SettingsController.setLogo,
);

router.delete('/logo', directorOnly, SettingsController.clearLogo);

module.exports = router;
