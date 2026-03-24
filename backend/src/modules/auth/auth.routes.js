const express = require("express");
const AuthController = require("./auth.controller");
const auth = require("../../middleware/auth");
const roleCheck = require("../../middleware/roleCheck");

const router = express.Router();

// Public routes
router.post("/register", AuthController.register);
router.post("/login", AuthController.login);

// Protected routes
router.post("/logout", auth, AuthController.logout);
router.get("/me", auth, AuthController.getCurrentUser);

// Director-only routes
router.get("/pending", auth, roleCheck.directorOnly, AuthController.getPendingUsers);
router.patch("/approve/:id", auth, roleCheck.directorOnly, AuthController.approveUser);
router.patch("/reject/:id", auth, roleCheck.directorOnly, AuthController.rejectUser);

module.exports = router;
