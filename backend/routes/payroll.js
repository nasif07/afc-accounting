import express from 'express';
import Payroll from '../models/Payroll.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Get all payroll records
router.get('/', protect, async (req, res) => {
  try {
    const payrolls = await Payroll.find()
      .populate('employeeId', 'employeeId firstName lastName')
      .populate('processedBy', 'name email')
      .populate('approvedBy', 'name email');
    res.json({ success: true, payrolls });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single payroll record
router.get('/:id', protect, async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id)
      .populate('employeeId', 'employeeId firstName lastName')
      .populate('processedBy', 'name email')
      .populate('approvedBy', 'name email');
    if (!payroll) {
      return res.status(404).json({ message: 'Payroll record not found' });
    }
    res.json({ success: true, payroll });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create payroll record
router.post('/', protect, async (req, res) => {
  try {
    const { employeeId, periodStartDate, periodEndDate, grossSalary, netSalary, deductions, bonuses } = req.body;

    if (!employeeId || !periodStartDate || !periodEndDate || !grossSalary || !netSalary) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    let totalDeductions = 0;
    if (deductions && deductions.length > 0) {
      totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
    }

    let totalBonuses = 0;
    if (bonuses && bonuses.length > 0) {
      totalBonuses = bonuses.reduce((sum, b) => sum + b.amount, 0);
    }

    const payroll = new Payroll({
      employeeId,
      periodStartDate,
      periodEndDate,
      grossSalary,
      deductions: deductions || [],
      totalDeductions,
      bonuses: bonuses || [],
      totalBonuses,
      netSalary,
      processedBy: req.userId,
    });

    await payroll.save();
    await payroll.populate('employeeId', 'employeeId firstName lastName');
    
    res.status(201).json({ success: true, payroll });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Process payroll
router.put('/:id/process', protect, async (req, res) => {
  try {
    const { paymentDate, paymentMode, referenceNumber } = req.body;

    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) {
      return res.status(404).json({ message: 'Payroll record not found' });
    }

    payroll.status = 'Processed';
    payroll.paymentDate = paymentDate || new Date();
    payroll.paymentMode = paymentMode;
    payroll.referenceNumber = referenceNumber;
    payroll.approvedBy = req.userId;
    await payroll.save();

    res.json({ success: true, payroll });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark as paid
router.put('/:id/mark-paid', protect, async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) {
      return res.status(404).json({ message: 'Payroll record not found' });
    }

    payroll.status = 'Paid';
    await payroll.save();

    res.json({ success: true, payroll });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
