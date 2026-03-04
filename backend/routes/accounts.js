import express from 'express';
import Account from '../models/Account.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Get all accounts
router.get('/', protect, async (req, res) => {
  try {
    const accounts = await Account.find().populate('createdBy', 'name email');
    res.json({ success: true, accounts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single account
router.get('/:id', protect, async (req, res) => {
  try {
    const account = await Account.findById(req.params.id).populate('createdBy', 'name email');
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }
    res.json({ success: true, account });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create account
router.post('/', protect, async (req, res) => {
  try {
    const { code, name, type, subType, description, openingBalance } = req.body;

    if (!code || !name || !type) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const account = new Account({
      code,
      name,
      type,
      subType,
      description,
      openingBalance: openingBalance || 0,
      currentBalance: openingBalance || 0,
      createdBy: req.userId,
    });

    await account.save();
    res.status(201).json({ success: true, account });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update account
router.put('/:id', protect, async (req, res) => {
  try {
    const { name, description, status } = req.body;

    let account = await Account.findById(req.params.id);
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    if (name) account.name = name;
    if (description) account.description = description;
    if (status) account.status = status;
    account.updatedAt = new Date();

    await account.save();
    res.json({ success: true, account });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete account
router.delete('/:id', protect, async (req, res) => {
  try {
    const account = await Account.findByIdAndDelete(req.params.id);
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }
    res.json({ success: true, message: 'Account deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
