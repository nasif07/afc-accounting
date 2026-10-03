const express = require('express');
const EmployeeController = require('./employee.controller');
const auth = require('../../middleware/auth');
const { accountantOrDirector } = require('../../middleware/roleCheck');
const validate = require('../../validation/validate');
const {
  createEmployeeBody,
  updateEmployeeBody,
  getAllEmployeesQuery,
  idParam,
} = require('../../validation/employee.validation');

const router = express.Router();

router.use(auth);

router.post(
  '/',
  accountantOrDirector,
  validate({ body: createEmployeeBody }),
  EmployeeController.createEmployee,
);
router.get(
  '/',
  validate({ query: getAllEmployeesQuery }),
  EmployeeController.getAllEmployees,
);
router.get(
  '/:id',
  validate({ params: idParam }),
  EmployeeController.getEmployeeById,
);
router.put(
  '/:id',
  accountantOrDirector,
  validate({ params: idParam, body: updateEmployeeBody }),
  EmployeeController.updateEmployee,
);
router.delete(
  '/:id',
  accountantOrDirector,
  validate({ params: idParam }),
  EmployeeController.deleteEmployee,
);

module.exports = router;
