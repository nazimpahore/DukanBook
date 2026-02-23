// Email Service using Nodemailer
const nodemailer = require('nodemailer');

/**
 * Creates a nodemailer transporter from .env config.
 * Supports Gmail, Outlook, or any SMTP provider.
 * Falls back to Ethereal (test) mode if no credentials set.
 */
let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;

  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_SECURE } = process.env;

  // If no credentials configured → use Ethereal for testing
  if (!EMAIL_USER || EMAIL_USER === 'your_email@gmail.com') {
    console.warn('⚠️  No real EMAIL_USER set. Using Ethereal test account for emails.');
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass }
    });
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(EMAIL_PORT || '587'),
    secure: EMAIL_SECURE === 'true',
    auth: { user: EMAIL_USER, pass: EMAIL_PASS }
  });

  return transporter;
}

/**
 * Send a payment due-date reminder email to a customer.
 * @param {Object} options
 * @param {string} options.to       - Customer email address
 * @param {string} options.name     - Customer name
 * @param {string} options.amount   - Outstanding amount (Rs.)
 * @param {string} options.dueDate  - Due date string
 * @param {string} options.shopName - Shopkeeper's shop name
 * @param {string} options.type     - 'DueToday' | 'Overdue'
 */
async function sendDueReminderEmail({ to, name, amount, dueDate, shopName, type }) {
  if (!to) return; // No email → skip silently

  try {
    const transport = await getTransporter();
    const isOverdue = type === 'Overdue';
    const subjectEmoji = isOverdue ? '🔴' : '⚠️';
    const statusWord   = isOverdue ? 'OVERDUE' : 'DUE TODAY';
    const dueDateStr   = new Date(dueDate).toLocaleDateString('en-PK', { day: '2-digit', month: 'long', year: 'numeric' });

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Payment Reminder</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:30px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 32px 24px;text-align:center;">
            <div style="font-size:2.5rem;margin-bottom:8px;">🏪</div>
            <h1 style="color:#fff;margin:0;font-size:1.4rem;font-weight:800;">${escapeHtml(shopName)}</h1>
            <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:0.88rem;">Payment Reminder</p>
          </td>
        </tr>

        <!-- Alert Banner -->
        <tr>
          <td style="background:${isOverdue ? '#fef2f2' : '#fffbeb'};padding:16px 32px;text-align:center;border-bottom:1px solid ${isOverdue ? '#fecaca' : '#fde68a'};">
            <p style="margin:0;font-weight:700;font-size:1rem;color:${isOverdue ? '#dc2626' : '#92400e'};">
              ${subjectEmoji} Payment ${statusWord}
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:28px 32px;">
            <p style="color:#334155;font-size:0.95rem;margin:0 0 20px;">Dear <strong>${escapeHtml(name)}</strong>,</p>
            <p style="color:#64748b;font-size:0.9rem;margin:0 0 24px;line-height:1.6;">
              This is a friendly reminder that your credit payment at <strong>${escapeHtml(shopName)}</strong> is 
              <strong style="color:${isOverdue ? '#dc2626' : '#d97706'};">${statusWord}</strong>.
            </p>

            <!-- Amount Box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ff;border-radius:12px;border:1px solid #ddd6fe;margin-bottom:24px;">
              <tr>
                <td style="padding:20px 24px;">
                  <div style="display:flex;justify-content:space-between;">
                    <table width="100%">
                      <tr>
                        <td style="color:#6b7280;font-size:0.78rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;padding-bottom:6px;">Outstanding Amount</td>
                        <td style="color:#6b7280;font-size:0.78rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;padding-bottom:6px;text-align:right;">Due Date</td>
                      </tr>
                      <tr>
                        <td style="font-size:1.6rem;font-weight:900;color:#4f46e5;">Rs. ${amount.toLocaleString('en-PK')}</td>
                        <td style="font-size:0.9rem;font-weight:600;color:${isOverdue ? '#dc2626' : '#d97706'};text-align:right;">${dueDateStr}</td>
                      </tr>
                    </table>
                  </div>
                </td>
              </tr>
            </table>

            <p style="color:#64748b;font-size:0.88rem;line-height:1.6;margin:0 0 24px;">
              Please visit our shop or contact us to settle this payment at your earliest convenience. 
              Prompt payment helps us continue to serve you better.
            </p>
            <p style="color:#64748b;font-size:0.88rem;margin:0;">
              If you have already made this payment, please disregard this reminder.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="color:#94a3b8;font-size:0.78rem;margin:0;">
              This is an automated reminder from <strong>${escapeHtml(shopName)}</strong><br/>
              Powered by DukanBook
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const info = await transport.sendMail({
      from: `"${shopName}" <${process.env.EMAIL_USER || 'noreply@shopudhar.com'}>`,
      to,
      subject: `${subjectEmoji} Payment ${statusWord} – Rs.${amount.toLocaleString('en-PK')} | ${shopName}`,
      html,
      text: `Dear ${name},\n\nYour payment of Rs.${amount} at ${shopName} is ${statusWord}.\nDue Date: ${dueDateStr}\n\nPlease visit us to settle this amount.\n\nThank you.`
    });

    // Log Ethereal preview URL for test accounts
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`📧 Test email preview: ${previewUrl}`);
    } else {
      console.log(`📧 Email sent to ${to}: ${info.messageId}`);
    }
  } catch (err) {
    console.error(`❌ Failed to send email to ${to}:`, err.message);
  }
}

// Simple HTML escape for email content
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = { sendDueReminderEmail };
