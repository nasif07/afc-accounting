const express = require("express");
const DashboardController = require("./dashboard.controller");
const auth = require("../../middleware/auth");

const router = express.Router();

router.use(auth);

router.get("/summary", DashboardController.getSummary);

module.exports = router;
