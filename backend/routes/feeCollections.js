import express from 'express';
import FeeCollection from '../models/FeeCollection.js';
import Student from '../models/Student.js';
import { protect } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Get all fee collections
router.get('/', protect, async (req, res) => {
  try {
    const fees = await FeeCollection.find()
      .populate('studentId', 'studentId firstName lastName')
      .populate('collectedBy', 'name email')
      .populate('approvedBy', 'name email');
    res.json({ success: true, fees });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single fee collection
router.get('/:id', protect, async (req, res) => {
  try {
    const fee = await FeeCollection.findById(req.params.id)
      .populate('studentId', 'studentId firstName lastName')
      .populate('collectedBy', 'name email')
      .populate('approvedBy', 'name email');
    if (!fee) {
      return res.status(404).json({ message: 'Fee collection not found' });
    }
    res.json({ success: true, fee });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create fee collection
router.post('/', protect, async (req, res) => {
  try {
    const { studentId, feeType, amount, paymentMode, referenceNumber, chequeNumber, chequeDate } = req.body;

    if (!studentId || !feeType || !amount || !paymentMode) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const receiptNumber = `RCP-${Date.now()}-${uuidv4().slice(0, 8)}`;

    const fee = new FeeCollection({
      studentId,
      receiptNumber,
      feeType,
      amount,
      paymentMode,
      referenceNumber,
      chequeNumber,
      chequeDate,
      collectedBy: req.userId,
    });

    await fee.save();

    // Update student fees
    student.totalFeesPaid += amount;
    await student.save();

    await fee.populate('studentId', 'studentId firstName lastName');
    res.status(201).json({ success: true, fee });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Approve fee collection
router.put('/:id/approve', protect, async (req, res) => {
  try {
    const fee = await FeeCollection.findById(req.params.id);
    if (!fee) {
      return res.status(404).json({ message: 'Fee collection not found' });
    }

    fee.status = 'Cleared';
    fee.approvedBy = req.userId;
    await fee.save();

    res.json({ success: true, fee });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
