const express = require('express');
const router = express.Router();
const {
  getReminders,
  createReminder,
  updateReminder,
  getPracticeSuggestion,
  deleteReminder,
} = require('../controllers/reminderController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getReminders)
  .post(protect, createReminder);

router.get('/:id/practice-suggestion', protect, getPracticeSuggestion);

router.route('/:id')
  .put(protect, updateReminder)
  .delete(protect, deleteReminder);

module.exports = router;
