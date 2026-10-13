const nodemailer = require('nodemailer');

let transporter;

// Lazy initialization of SMTP transporter
const getTransporter = async () => {
  if (transporter) return transporter;

  try {
    // Check if custom SMTP configurations are set in environment variables
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      console.log(`✅ Custom SMTP Transporter Initialized: ${process.env.SMTP_HOST}`);
    } else {
      // Fallback: Generate test SMTP credentials from ethereal.email
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user, 
          pass: testAccount.pass, 
        },
      });
      console.log('\n=============================================');
      console.log('✅ Nodemailer Ethereal Sandbox SMTP Initialized');
      console.log(`Username: ${testAccount.user}`);
      console.log('=============================================\n');
    }
    return transporter;
  } catch (error) {
    console.error('❌ Failed to configure SMTP transporter:', error.message);
    throw error;
  }
};

const sendReminderEmail = async (email, username, questionTitle, leetcodeUrl, notes, difficulty) => {
  try {
    const t = await getTransporter();

    // Use EMAIL_FROM env variable or default back if missing
    const sender = process.env.EMAIL_FROM || '"LeetCode Reminder" <noreply@leetcode-reminder.com>';

    const info = await t.sendMail({
      from: sender,
      to: email,
      subject: `🔔 Reminder: Solve "${questionTitle}" today!`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #334155; border-radius: 12px; background-color: #0b0f19; color: #f8fafc;">
          <div style="text-align: center; border-bottom: 1px solid #1e293b; padding-bottom: 15px; margin-bottom: 20px;">
            <h1 style="color: #10b981; font-size: 24px; margin: 0;">LeetCode Re-Solve Reminder</h1>
          </div>
          <p style="font-size: 16px; line-height: 1.5;">Hey <strong>${username}</strong>,</p>
          <p style="font-size: 15px; line-height: 1.5; color: #cbd5e1;">It's time to reinforce your learning! Re-solve this question to lock in your coding skills:</p>
          
          <div style="background-color: #111827; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 5px solid ${
            difficulty === 'Easy' ? '#10b981' : difficulty === 'Medium' ? '#f59e0b' : '#f43f5e'
          };">
            <h3 style="margin: 0 0 10px 0; color: #f8fafc; font-size: 18px;">${questionTitle}</h3>
            <p style="margin: 5px 0; font-size: 14px; color: #9ca3af;">
              <strong>Difficulty:</strong> 
              <span style="color: ${
                difficulty === 'Easy' ? '#10b981' : difficulty === 'Medium' ? '#f59e0b' : '#f43f5e'
              }; font-weight: bold;">${difficulty}</span>
            </p>
            ${notes ? `<p style="margin: 15px 0 0 0; padding-top: 10px; border-top: 1px dashed #1f2937; font-style: italic; color: #9ca3af; font-size: 14px;"><strong>Your Notes:</strong> "${notes}"</p>` : ''}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${leetcodeUrl}" target="_blank" style="background-color: #10b981; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2);">Solve on LeetCode</a>
          </div>
          
          <p style="font-size: 13px; color: #64748b; text-align: center; border-top: 1px solid #1e293b; padding-top: 20px; margin-top: 25px;">
            Happy Coding!<br/>
            <strong>LeetCode Reminder Team</strong>
          </p>
        </div>
      `,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`\n📬 [Email Sent] to ${email} for "${questionTitle}"`);
    if (previewUrl) {
      console.log(`🔗 Preview Email at: ${previewUrl}\n`);
    }
    return { info, previewUrl };
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    return null;
  }
};

module.exports = { sendReminderEmail };
