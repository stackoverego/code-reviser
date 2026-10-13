const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    leetcodeUrl: {
      type: String,
      required: [true, 'Please add a LeetCode URL'],
      trim: true,
    },
    questionTitle: {
      type: String,
      required: [true, 'Please add the question title'],
      trim: true,
    },
    difficulty: {
      type: String,
      required: [true, 'Please specify the difficulty'],
      enum: ['Easy', 'Medium', 'Hard'],
      default: 'Medium',
    },
    notes: {
      type: String,
      trim: true,
    },
    intervalDays: {
      type: Number,
      required: [true, 'Please specify the reminder interval in days'],
      default: 1, // default 1 day
    },
    dueAt: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'notified', 'completed'],
      default: 'pending',
    },
    practiceSuggestion: {
      title: { type: String, trim: true },
      leetcodeUrl: { type: String, trim: true },
      difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'] },
      whyRelated: { type: String, trim: true },
      generatedAt: { type: Date },
    },
  },
  {
    timestamps: true,
  }
);

// Optimize query speed for scheduler sweeps
reminderSchema.index({ status: 1, dueAt: 1 });

module.exports = mongoose.model('Reminder', reminderSchema);
