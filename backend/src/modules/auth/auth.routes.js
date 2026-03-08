const express = require("express");
const AuthController = require("./auth.controller");
const auth = require("../../middleware/auth");

const router = express.Router();

// Public routes
router.post("/register", AuthController.register);
router.post("/login", AuthController.login);

// Protected routes
router.post("/logout", auth, AuthController.logout);
router.get("/me", auth, AuthController.getCurrentUser);

module.exports = router;
