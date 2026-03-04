import express from 'express';
import Employee from '../models/Employee.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Get all employees
router.get('/', protect, async (req, res) => {
  try {
    const employees = await Employee.find();
    res.json({ success: true, employees });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single employee
router.get('/:id', protect, async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    res.json({ success: true, employee });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create employee
router.post('/', protect, async (req, res) => {
  try {
    const { employeeId, firstName, lastName, email, phone, designation, department, salaryStructure, baseSalary, hourlyRate, perClassRate, joinDate, bankAccount, bankName } = req.body;

    if (!employeeId || !firstName || !lastName || !joinDate) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const employee = new Employee({
      employeeId,
      firstName,
      lastName,
      email,
      phone,
      designation,
      department,
      salaryStructure: salaryStructure || 'Fixed',
      baseSalary: baseSalary || 0,
      hourlyRate: hourlyRate || 0,
      perClassRate: perClassRate || 0,
      joinDate,
      bankAccount,
      bankName,
    });

    await employee.save();
    res.status(201).json({ success: true, employee });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update employee
router.put('/:id', protect, async (req, res) => {
  try {
    const { firstName, lastName, email, phone, designation, department, salaryStructure, baseSalary, hourlyRate, perClassRate, bankAccount, bankName, status } = req.body;

    let employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    if (firstName) employee.firstName = firstName;
    if (lastName) employee.lastName = lastName;
    if (email) employee.email = email;
    if (phone) employee.phone = phone;
    if (designation) employee.designation = designation;
    if (department) employee.department = department;
    if (salaryStructure) employee.salaryStructure = salaryStructure;
    if (baseSalary !== undefined) employee.baseSalary = baseSalary;
    if (hourlyRate !== undefined) employee.hourlyRate = hourlyRate;
    if (perClassRate !== undefined) employee.perClassRate = perClassRate;
    if (bankAccount) employee.bankAccount = bankAccount;
    if (bankName) employee.bankName = bankName;
    if (status) employee.status = status;
    employee.updatedAt = new Date();

    await employee.save();
    res.json({ success: true, employee });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete employee
router.delete('/:id', protect, async (req, res) => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    res.json({ success: true, message: 'Employee deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
