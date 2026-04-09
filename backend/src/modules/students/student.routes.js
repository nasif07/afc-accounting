const express = require('express');
const StudentController = require('./student.controller');
const auth = require('../../middleware/auth');
const { accountantOrDirector } = require('../../middleware/roleCheck');

const router = express.Router();

// All routes require authentication
router.use(auth);

/**
 * @routes /api/students
 */

// 1. Create Student
router.post('/', accountantOrDirector, StudentController.createStudent);

// 2. Get All (with filters/pagination)
router.get('/', StudentController.getAllStudents);

// 3. Get Single Student by ID
// Note: Ensure you add getStudentById to your StudentController!
router.get('/:id', StudentController.getStudentById);

// 4. Update Student
// Changed to PATCH because your controller strips rollNumber (partial update)
router.patch('/:id', accountantOrDirector, StudentController.updateStudent);

// 5. Delete Student
router.delete('/:id', accountantOrDirector, StudentController.deleteStudent);

// 6. Bulk Import
router.post('/bulk-import', accountantOrDirector, StudentController.bulkImportStudents);

module.exports = router;