const Reminder = require('../models/Reminder');
const { generatePracticeSuggestion } = require('../services/practiceSuggestionService');

// @desc    Get all reminders for the authenticated user
// @route   GET /api/reminders
// @access  Private
const getReminders = async (req, res) => {
  try {
    const reminders = await Reminder.find({ userId: req.user.id }).sort({ dueAt: 1 });
    return res.status(200).json(reminders);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new reminder
// @route   POST /api/reminders
// @access  Private
const createReminder = async (req, res) => {
  const { leetcodeUrl, questionTitle, difficulty, notes, intervalDays } = req.body;

  try {
    if (!leetcodeUrl || !questionTitle || !difficulty) {
      return res.status(400).json({ message: 'Please add all required fields: leetcodeUrl, questionTitle, difficulty' });
    }

    // Calculate dueAt date from current timestamp + interval (in days, supports float days)
    const delayMs = parseFloat(intervalDays) * 24 * 60 * 60 * 1000;
    const dueAt = new Date(Date.now() + delayMs);

    const reminder = await Reminder.create({
      userId: req.user.id,
      leetcodeUrl,
      questionTitle,
      difficulty,
      notes,
      intervalDays: parseFloat(intervalDays),
      dueAt,
      status: 'pending',
    });

    return res.status(201).json(reminder);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Update a reminder (mark as complete or reschedule)
// @route   PUT /api/reminders/:id
// @access  Private
const updateReminder = async (req, res) => {
  try {
    const reminder = await Reminder.findById(req.params.id);

    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }

    // Verify user owns the reminder
    if (reminder.userId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized to update this reminder' });
    }

    const { status, reschedule, intervalDays } = req.body;

    if (reschedule) {
      // Re-schedule pushing the due timestamp forward and resetting status to pending
      const newInterval = intervalDays ? parseFloat(intervalDays) : reminder.intervalDays;
      reminder.dueAt = new Date(Date.now() + newInterval * 24 * 60 * 60 * 1000);
      reminder.status = 'pending';
      reminder.intervalDays = newInterval;
    } else if (status) {
      reminder.status = status;
    }

    const updatedReminder = await reminder.save();
    return res.status(200).json(updatedReminder);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Get or generate a related practice question for a due reminder
// @route   GET /api/reminders/:id/practice-suggestion
// @access  Private
const getPracticeSuggestion = async (req, res) => {
  try {
    const reminder = await Reminder.findById(req.params.id);

    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }

    if (reminder.userId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized to access this reminder' });
    }

    if (reminder.status === 'completed') {
      return res.status(400).json({ message: 'Practice suggestions are only available for due reminders' });
    }

    if (reminder.dueAt > new Date()) {
      return res.status(400).json({ message: 'Practice suggestions are only available once a reminder is due' });
    }

    if (!reminder.practiceSuggestion?.title) {
      reminder.practiceSuggestion = await generatePracticeSuggestion(reminder);
      await reminder.save();
    }

    return res.status(200).json({ suggestion: reminder.practiceSuggestion });
  } catch (error) {
    console.error('Error generating practice suggestion:', error.message);
    return res.status(error.statusCode || 500).json({ message: error.message });
  }
};

// @desc    Delete a reminder
// @route   DELETE /api/reminders/:id
// @access  Private
const deleteReminder = async (req, res) => {
  try {
    const reminder = await Reminder.findById(req.params.id);

    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }

    // Verify user owns the reminder
    if (reminder.userId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized to delete this reminder' });
    }

    await reminder.deleteOne();
    return res.status(200).json({ id: req.params.id, message: 'Reminder successfully removed' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getReminders,
  createReminder,
  updateReminder,
  getPracticeSuggestion,
  deleteReminder,
};
