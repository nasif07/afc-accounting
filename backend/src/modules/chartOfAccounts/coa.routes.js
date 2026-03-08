const express = require("express");
const COAController = require("./coa.controller");
const auth = require("../../middleware/auth");
const { accountantOrDirector } = require("../../middleware/roleCheck");

const router = express.Router();

// All routes require authentication
router.use(auth);

// CRUD operations
router.post("/", accountantOrDirector, COAController.createAccount);
router.get("/", COAController.getAllAccounts);
router.get("/:id", COAController.getAccountById);
router.put("/:id", accountantOrDirector, COAController.updateAccount);
router.delete("/:id", accountantOrDirector, COAController.deleteAccount);

// Get account balance
router.get("/:id/balance", COAController.getAccountBalance);

module.exports = router;
