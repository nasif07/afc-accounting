const express = require("express");
const COAController = require("./coa.controller");
const auth = require("../../middleware/auth");
const { accountantOrDirector } = require("../../middleware/roleCheck");

const router = express.Router();

router.use(auth);

// Tree / utility
router.get("/tree", COAController.getAccountTree);
router.get("/leaf-nodes", COAController.getLeafNodes);

// CRUD
router.post("/", accountantOrDirector, COAController.createAccount);
router.get("/", COAController.getAllAccounts);
router.get("/:id/balance", COAController.getAccountBalance);
router.get("/:id/transactions", COAController.getAccountTransactions);
router.get("/:id", COAController.getAccountById);
router.patch("/:id", accountantOrDirector, COAController.updateAccount);

// Status / archive
router.patch("/:id/status", accountantOrDirector, COAController.updateAccountStatus);
router.patch("/:id/archive", accountantOrDirector, COAController.archiveAccount);
router.patch("/:id/restore", accountantOrDirector, COAController.restoreAccount);

module.exports = router;