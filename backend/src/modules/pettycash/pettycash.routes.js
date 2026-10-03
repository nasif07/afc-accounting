const express = require("express");
const PettyCashController = require("./pettycash.controller");
const auth = require("../../middleware/auth");
const { roleCheck } = require("../../middleware/roleCheck");
const { USER_ROLES } = require("../../config/constants");
const fileUploader = require("../../utils/fileUploader");
const validate = require("../../validation/validate");
const {
  createPettyCashBody,
  updatePettyCashBody,
  getAllPettyCashQuery,
  getPettyCashTransactionsQuery,
  getPettyCashReportQuery,
  idParam,
} = require("../../validation/pettycash.validation");

const router = express.Router();

// All routes require authentication
router.use(auth);

router.get(
  "/transactions",
  validate({ query: getPettyCashTransactionsQuery }),
  PettyCashController.getPettyCashTransactions,
);
router.get(
  "/report",
  validate({ query: getPettyCashReportQuery }),
  PettyCashController.getPettyCashReport,
);

// CRUD

// Create petty cash
router.post(
  "/",
  roleCheck([USER_ROLES.ACCOUNTANT, USER_ROLES.SUB_ACCOUNTANT, USER_ROLES.DIRECTOR]),
  validate({ body: createPettyCashBody }),
  fileUploader,
  PettyCashController.createPettyCash,
);

// Get all petty cash
router.get(
  "/",
  validate({ query: getAllPettyCashQuery }),
  PettyCashController.getAllPettyCash,
);

// Get petty cash by ID
router.get(
  "/:id",
  validate({ params: idParam }),
  PettyCashController.getPettyCashById,
);

// Update petty cash
router.put(
  "/:id",
  roleCheck([USER_ROLES.ACCOUNTANT, USER_ROLES.SUB_ACCOUNTANT, USER_ROLES.DIRECTOR]),
  validate({ params: idParam, body: updatePettyCashBody }),
  fileUploader,
  PettyCashController.updatePettyCash,
);

// Delete petty cash
router.delete(
  "/:id",
  roleCheck([USER_ROLES.ACCOUNTANT, USER_ROLES.SUB_ACCOUNTANT, USER_ROLES.DIRECTOR]),
  validate({ params: idParam }),
  PettyCashController.deletePettyCash,
);

module.exports = router;
