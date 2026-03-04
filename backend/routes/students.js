import express from 'express';
import Student from '../models/Student.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Get all students
router.get('/', protect, async (req, res) => {
  try {
    const students = await Student.find();
    res.json({ success: true, students });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single student
router.get('/:id', protect, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.json({ success: true, student });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create student
router.post('/', protect, async (req, res) => {
  try {
    const { studentId, firstName, lastName, email, phone, address, class: studentClass, section, parentName, parentPhone } = req.body;

    if (!studentId || !firstName || !lastName) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const student = new Student({
      studentId,
      firstName,
      lastName,
      email,
      phone,
      address,
      class: studentClass,
      section,
      parentName,
      parentPhone,
    });

    await student.save();
    res.status(201).json({ success: true, student });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update student
router.put('/:id', protect, async (req, res) => {
  try {
    const { firstName, lastName, email, phone, address, class: studentClass, section, parentName, parentPhone, status } = req.body;

    let student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (firstName) student.firstName = firstName;
    if (lastName) student.lastName = lastName;
    if (email) student.email = email;
    if (phone) student.phone = phone;
    if (address) student.address = address;
    if (studentClass) student.class = studentClass;
    if (section) student.section = section;
    if (parentName) student.parentName = parentName;
    if (parentPhone) student.parentPhone = parentPhone;
    if (status) student.status = status;
    student.updatedAt = new Date();

    await student.save();
    res.json({ success: true, student });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete student
router.delete('/:id', protect, async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.json({ success: true, message: 'Student deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
