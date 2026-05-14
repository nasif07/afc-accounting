const express = require("express");
const PettyCashController = require("./pettycash.controller");
const auth = require("../../middleware/auth");
const { roleCheck } = require("../../middleware/roleCheck");
const { USER_ROLES } = require("../../config/constants");
const fileUploader = require("../../utils/fileUploader");

const router = express.Router();

// All routes require authentication
router.use(auth);

/**
 * Reports / Statistics
 */
router.get("/report/stats", PettyCashController.getPettyCashStats);

router.get("/report/detailed", PettyCashController.generatePettyCashReport);

/**
 * Get petty cash by expense account
 */
router.get(
  "/expense-account/:expenseAccountId",
  PettyCashController.getPettyCashByExpenseAccount,
);

/**
 * CRUD
 */

// Create petty cash
router.post(
  "/",
  roleCheck([USER_ROLES.ACCOUNTANT, USER_ROLES.SUB_ACCOUNTANT, USER_ROLES.DIRECTOR]),
  fileUploader,
  PettyCashController.createPettyCash,
);

// Get all petty cash
router.get("/", PettyCashController.getAllPettyCash);

// Get petty cash by ID
router.get("/:id", PettyCashController.getPettyCashById);

// Update petty cash
router.put(
  "/:id",
  roleCheck([USER_ROLES.ACCOUNTANT, USER_ROLES.SUB_ACCOUNTANT]),
  fileUploader,
  PettyCashController.updatePettyCash,
);

// Delete petty cash
router.delete(
  "/:id",
  roleCheck([USER_ROLES.ACCOUNTANT]),
  PettyCashController.deletePettyCash,
);

module.exports = router;
