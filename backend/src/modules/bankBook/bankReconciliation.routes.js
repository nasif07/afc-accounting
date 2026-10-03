const express = require("express");
const BankReconciliationController = require("./bankReconciliation.controller");
const auth = require("../../middleware/auth");
const { accountantOrDirector } = require("../../middleware/roleCheck");
const validate = require("../../validation/validate");
const {
  createReconciliationBody,
  addAdjustmentLineBody,
  removeAdjustmentLineParams,
  postAdjustmentLineParams,
  postAdjustmentLineBody,
  finalizeBody,
  updateBalancesBody,
  listReconciliationsQuery,
  idParam,
} = require("../../validation/bankReconciliation.validation");

const router = express.Router();

// Matches bankBook.routes.js: auth + accountant/director tier for the
// entire router, not per-route — this is a financial-mutation surface,
// same tier as the rest of the bank/bankBook modules.
router.use(auth);
router.use(accountantOrDirector);

router.post(
  "/",
  validate({ body: createReconciliationBody }),
  BankReconciliationController.create,
);

router.get(
  "/",
  validate({ query: listReconciliationsQuery }),
  BankReconciliationController.list,
);

router.get(
  "/:id",
  validate({ params: idParam }),
  BankReconciliationController.getById,
);

router.get(
  "/:id/export/pdf",
  validate({ params: idParam }),
  BankReconciliationController.exportPdf,
);

router.patch(
  "/:id/balances",
  validate({ params: idParam, body: updateBalancesBody }),
  BankReconciliationController.updateBalances,
);

router.post(
  "/:id/adjustment-lines",
  validate({ params: idParam, body: addAdjustmentLineBody }),
  BankReconciliationController.addAdjustmentLine,
);

router.delete(
  "/:id/adjustment-lines/:type/:lineId",
  validate({ params: removeAdjustmentLineParams }),
  BankReconciliationController.removeAdjustmentLine,
);

// Books one adjustment line into the ledger. Declared before /:id/finalize
// only for readability — the paths don't collide.
router.post(
  "/:id/adjustment-lines/:type/:lineId/post",
  validate({ params: postAdjustmentLineParams, body: postAdjustmentLineBody }),
  BankReconciliationController.postAdjustmentLine,
);

router.post(
  "/:id/finalize",
  validate({ params: idParam, body: finalizeBody }),
  BankReconciliationController.finalize,
);

router.delete(
  "/:id",
  validate({ params: idParam }),
  BankReconciliationController.remove,
);

module.exports = router;
