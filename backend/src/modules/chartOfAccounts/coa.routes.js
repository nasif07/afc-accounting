const express = require("express");
const COAController = require("./coa.controller");
const auth = require("../../middleware/auth");
const { accountantOrDirector } = require("../../middleware/roleCheck");

const router = express.Router();

// All routes require authentication
router.use(auth);

// Static routes must come before dynamic :id routes
router.get("/tree", COAController.getAccountTree);
router.get("/leaf-nodes", COAController.getLeafNodes);

// CRUD operations
router.post("/", accountantOrDirector, COAController.createAccount);
router.get("/", COAController.getAllAccounts);
router.get("/:id/balance", COAController.getAccountBalance);
router.get("/:id", COAController.getAccountById);
router.put("/:id", accountantOrDirector, COAController.updateAccount);
router.delete("/:id", accountantOrDirector, COAController.deleteAccount);

// Optional restore route if you are using restore in service/controller
router.patch("/:id/restore", accountantOrDirector, COAController.restoreAccount);

module.exports = router;