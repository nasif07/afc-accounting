const express = require('express');
const StudentController = require('./student.controller');
const auth = require('../../middleware/auth');
const { accountantOrDirector } = require('../../middleware/roleCheck');
const validate = require('../../validation/validate');
const {
  createStudentBody,
  updateStudentBody,
  getAllStudentsQuery,
  bulkImportStudentsBody,
  idParam,
} = require('../../validation/student.validation');

const router = express.Router();

// All routes require authentication
router.use(auth);

/**
 * @routes /api/students
 */

// 1. Create Student
router.post(
  '/',
  accountantOrDirector,
  validate({ body: createStudentBody }),
  StudentController.createStudent,
);

// 2. Get All (with filters/pagination)
router.get(
  '/',
  validate({ query: getAllStudentsQuery }),
  StudentController.getAllStudents,
);

// 3. Get Single Student by ID
// Note: Ensure you add getStudentById to your StudentController!
router.get(
  '/:id',
  validate({ params: idParam }),
  StudentController.getStudentById,
);

// 4. Update Student
// Changed to PATCH because your controller strips rollNumber (partial update)
router.patch(
  '/:id',
  accountantOrDirector,
  validate({ params: idParam, body: updateStudentBody }),
  StudentController.updateStudent,
);

// 5. Delete Student
router.delete(
  '/:id',
  accountantOrDirector,
  validate({ params: idParam }),
  StudentController.deleteStudent,
);

// 6. Bulk Import
router.post(
  '/bulk-import',
  accountantOrDirector,
  validate({ body: bulkImportStudentsBody }),
  StudentController.bulkImportStudents,
);

module.exports = router;
