const express = require("express");
const COAController = require("./coa.controller");
const auth = require("../../middleware/auth");
const { accountantOrDirector } = require("../../middleware/roleCheck");
const validate = require("../../validation/validate");
const {
  createAccountBody,
  updateAccountBody,
  getAllAccountsQuery,
  getLeafNodesQuery,
  getAccountTreeQuery,
  updateAccountStatusBody,
  idParam,
} = require("../../validation/coa.validation");

const router = express.Router();

router.use(auth);

// Static utility (must precede /:id routes below)
router.get(
  "/leaf-nodes",
  validate({ query: getLeafNodesQuery }),
  COAController.getLeafNodes,
);
router.get(
  "/tree",
  validate({ query: getAccountTreeQuery }),
  COAController.getAccountTree,
);

// CRUD
router.post(
  "/",
  accountantOrDirector,
  validate({ body: createAccountBody }),
  COAController.createAccount,
);
router.get(
  "/",
  validate({ query: getAllAccountsQuery }),
  COAController.getAllAccounts,
);
router.get(
  "/:id/balance",
  validate({ params: idParam }),
  COAController.getAccountBalance,
);
router.get(
  "/:id",
  validate({ params: idParam }),
  COAController.getAccountById,
);
router.patch(
  "/:id",
  accountantOrDirector,
  validate({ params: idParam, body: updateAccountBody }),
  COAController.updateAccount,
);

// Status
router.patch(
  "/:id/status",
  accountantOrDirector,
  validate({ params: idParam, body: updateAccountStatusBody }),
  COAController.updateAccountStatus,
);

// Archive
router.patch(
  "/:id/archive",
  accountantOrDirector,
  validate({ params: idParam }),
  COAController.archiveAccount,
);

// Restore
router.patch(
  "/:id/restore",
  accountantOrDirector,
  validate({ params: idParam }),
  COAController.restoreAccount,
);

module.exports = router;
