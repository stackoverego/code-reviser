const Reminder = require('../models/Reminder');
const { sendReminderEmail } = require('../services/emailService');

const checkReminders = async () => {
  try {
    const now = new Date();
    // Query reminders that are 'pending' and have dueAt less than or equal to now
    const dueReminders = await Reminder.find({
      status: 'pending',
      dueAt: { $lte: now },
    }).populate('userId', 'username email');

    if (dueReminders.length > 0) {
      console.log(`⏰ [Scheduler] Found ${dueReminders.length} due reminders to process.`);
    }

    for (const reminder of dueReminders) {
      if (reminder.userId) {
        const { email, username } = reminder.userId;
        
        // Dispatch email notification
        await sendReminderEmail(
          email,
          username,
          reminder.questionTitle,
          reminder.leetcodeUrl,
          reminder.notes,
          reminder.difficulty
        );
      } else {
        console.warn(`⚠️ [Scheduler] Reminder ID ${reminder._id} has no associated user in database.`);
      }

      // Mark the reminder status as 'notified' so it is not processed again
      reminder.status = 'notified';
      await reminder.save();
    }
  } catch (error) {
    console.error('❌ [Scheduler Error] error occurred during check:', error.message);
  }
};

const initScheduler = (intervalMs = 30000) => {
  console.log(`⏰ [Scheduler] Background check initialized (Interval: ${intervalMs / 1000}s).`);
  // Run an immediate check on startup
  checkReminders();
  // Schedule subsequent checks
  setInterval(checkReminders, intervalMs);
};

module.exports = { initScheduler };
