const express = require('express');
const StudentController = require('./student.controller');
const auth = require('../../middleware/auth');
const { accountantOrDirector } = require('../../middleware/roleCheck');

const router = express.Router();

// All routes require authentication
router.use(auth);

// CRUD operations
router.post('/', accountantOrDirector, StudentController.createStudent);
router.get('/', StudentController.getAllStudents);
router.get('/:id', StudentController.getStudentById);
router.put('/:id', accountantOrDirector, StudentController.updateStudent);
router.delete('/:id', accountantOrDirector, StudentController.deleteStudent);

// Bulk import
router.post('/bulk/import', accountantOrDirector, StudentController.bulkImportStudents);

module.exports = router;
