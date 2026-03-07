const express = require('express');
const EmployeeController = require('./employee.controller');
const auth = require('../../middleware/auth');
const { accountantOrDirector } = require('../../middleware/roleCheck');

const router = express.Router();

router.use(auth);

router.post('/', accountantOrDirector, EmployeeController.createEmployee);
router.get('/', EmployeeController.getAllEmployees);
router.get('/:id', EmployeeController.getEmployeeById);
router.put('/:id', accountantOrDirector, EmployeeController.updateEmployee);
router.delete('/:id', accountantOrDirector, EmployeeController.deleteEmployee);
router.put('/:id/status', accountantOrDirector, EmployeeController.updateEmployeeStatus);
router.get('/report/total-employees', EmployeeController.getTotalEmployees);

module.exports = router;
