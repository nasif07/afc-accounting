import express from 'express';
import JournalEntry from '../models/JournalEntry.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Get all journal entries
router.get('/', protect, async (req, res) => {
  try {
    const entries = await JournalEntry.find()
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('entries.accountId', 'code name');
    res.json({ success: true, entries });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single journal entry
router.get('/:id', protect, async (req, res) => {
  try {
    const entry = await JournalEntry.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('entries.accountId', 'code name');
    if (!entry) {
      return res.status(404).json({ message: 'Journal entry not found' });
    }
    res.json({ success: true, entry });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create journal entry
router.post('/', protect, async (req, res) => {
  try {
    const { date, description, referenceNumber, transactionType, entries } = req.body;

    if (!description || !entries || entries.length < 2) {
      return res.status(400).json({ message: 'Please provide description and at least 2 entries' });
    }

    const journalEntry = new JournalEntry({
      date: date || new Date(),
      description,
      referenceNumber,
      transactionType: transactionType || 'Other',
      entries,
      createdBy: req.userId,
    });

    await journalEntry.save();
    await journalEntry.populate('entries.accountId', 'code name');
    
    res.status(201).json({ success: true, entry: journalEntry });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Approve journal entry
router.put('/:id/approve', protect, async (req, res) => {
  try {
    const entry = await JournalEntry.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ message: 'Journal entry not found' });
    }

    entry.status = 'Approved';
    entry.approvedBy = req.userId;
    entry.approvedAt = new Date();
    await entry.save();

    res.json({ success: true, entry });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Reject journal entry
router.put('/:id/reject', protect, async (req, res) => {
  try {
    const entry = await JournalEntry.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ message: 'Journal entry not found' });
    }

    entry.status = 'Rejected';
    entry.approvedBy = req.userId;
    entry.approvedAt = new Date();
    await entry.save();

    res.json({ success: true, entry });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
