const express = require("express");
const COAController = require("./coa.controller");
const auth = require("../../middleware/auth");
const { accountantOrDirector } = require("../../middleware/roleCheck");

const router = express.Router();

router.use(auth);

// Static utility
router.get("/leaf-nodes", COAController.getLeafNodes);

// CRUD
router.post("/", accountantOrDirector, COAController.createAccount);
router.get("/", COAController.getAllAccounts);
router.get("/:id/balance", COAController.getAccountBalance);
router.get("/:id", COAController.getAccountById);
router.patch("/:id", accountantOrDirector, COAController.updateAccount);

// Archive
router.patch("/:id/archive", accountantOrDirector, COAController.archiveAccount);

module.exports = router;
