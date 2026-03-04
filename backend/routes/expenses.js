import express from 'express';
import Expense from '../models/Expense.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Get all expenses
router.get('/', protect, async (req, res) => {
  try {
    const expenses = await Expense.find()
      .populate('recordedBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('vendor', 'name');
    res.json({ success: true, expenses });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single expense
router.get('/:id', protect, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate('recordedBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('vendor', 'name');
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    res.json({ success: true, expense });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create expense
router.post('/', protect, async (req, res) => {
  try {
    const { date, description, category, amount, paymentMode, referenceNumber, vendor, invoiceNumber, billAttachment, notes } = req.body;

    if (!description || !category || !amount || !paymentMode) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const expense = new Expense({
      date: date || new Date(),
      description,
      category,
      amount,
      paymentMode,
      referenceNumber,
      vendor,
      invoiceNumber,
      billAttachment,
      notes,
      recordedBy: req.userId,
    });

    await expense.save();
    res.status(201).json({ success: true, expense });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Approve expense
router.put('/:id/approve', protect, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    expense.status = 'Approved';
    expense.approvedBy = req.userId;
    expense.approvedAt = new Date();
    await expense.save();

    res.json({ success: true, expense });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Reject expense
router.put('/:id/reject', protect, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    expense.status = 'Rejected';
    expense.approvedBy = req.userId;
    expense.approvedAt = new Date();
    await expense.save();

    res.json({ success: true, expense });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete expense
router.delete('/:id', protect, async (req, res) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    res.json({ success: true, message: 'Expense deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
