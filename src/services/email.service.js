import logger from '../config/logger.js';

/**
 * Send Get a Quote email notification via Brevo HTTPS REST API
 * @param {Object} quoteData - Quote enquiry object
 */
export const sendQuoteNotificationEmail = async (quoteData) => {
  const brevoApiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'info@mitsafe.com';
  const senderName = process.env.BREVO_SENDER_NAME || 'Mitsafe Website';

  // Process recipient email(s) supporting single or multiple comma-separated addresses
  const rawRecipients = process.env.QUOTE_NOTIFICATION_EMAIL || 'hr@mitsafe.com';
  const recipientEmailsList = rawRecipients
    .split(',')
    .map((email) => email.trim())
    .filter((email) => email.length > 0);

  const recipientList = recipientEmailsList.length > 0
    ? recipientEmailsList.map((email) => ({ email, name: 'Mitsafe Admin' }))
    : [{ email: 'hr@mitsafe.com', name: 'Mitsafe Admin' }];

  if (!brevoApiKey || brevoApiKey.includes('placeholder') || brevoApiKey.includes('your_brevo')) {
    logger.warn('Brevo API key is not configured or is a placeholder. Skipping email dispatch.');
    logger.info(`[Quote Notification Simulated] Name: ${quoteData.fullName}, Email: ${quoteData.email}, Service: ${quoteData.service}`);
    return { success: false, reason: 'Brevo API key not configured' };
  }

  const submissionDate = new Date(quoteData.createdAt || Date.now()).toLocaleString('en-US', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'full',
    timeStyle: 'medium',
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8"/>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; }
          .header { background-color: #305EFF; color: #ffffff; padding: 15px 20px; border-radius: 6px 6px 0 0; }
          .header h2 { margin: 0; font-size: 20px; }
          .content { padding: 20px; background-color: #f9fbfd; }
          .table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          .table td { padding: 10px; border-bottom: 1px solid #e0e0e0; font-size: 14px; }
          .table td.label { font-weight: bold; width: 35%; color: #555; }
          .message-box { background-color: #ffffff; border-left: 4px solid #305EFF; padding: 12px; margin-top: 15px; font-style: italic; }
          .footer { font-size: 12px; color: #888; text-align: center; padding-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>New Quote Enquiry Received</h2>
          </div>
          <div class="content">
            <p>You have received a new Get a Quote submission from the Mitsafe website.</p>
            <table class="table">
              <tr><td class="label">Full Name:</td><td>${quoteData.fullName}</td></tr>
              <tr><td class="label">Email:</td><td><a href="mailto:${quoteData.email}">${quoteData.email}</a></td></tr>
              <tr><td class="label">Phone:</td><td>${quoteData.phone || 'N/A'}</td></tr>
              <tr><td class="label">Company:</td><td>${quoteData.companyName || 'N/A'}</td></tr>
              <tr><td class="label">Service Selected:</td><td><strong>${quoteData.service}</strong></td></tr>
              <tr><td class="label">Estimated Budget:</td><td>${quoteData.budget || 'N/A'}</td></tr>
              <tr><td class="label">Estimated Timeline:</td><td>${quoteData.timeline || 'N/A'}</td></tr>
              <tr><td class="label">Source Page:</td><td>${quoteData.sourcePage || '/'}</td></tr>
              <tr><td class="label">Submission Date:</td><td>${submissionDate}</td></tr>
            </table>
            
            <p style="margin-top: 20px; font-weight: bold;">Project Details / Message:</p>
            <div class="message-box">
              ${quoteData.message.replace(/\n/g, '<br/>')}
            </div>
          </div>
          <div class="footer">
            <p>This is an automated notification sent from Mitsafe Backend Service.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const textContent = `
New Get a Quote Enquiry - Mitsafe

- Full Name: ${quoteData.fullName}
- Email: ${quoteData.email}
- Phone: ${quoteData.phone || 'N/A'}
- Company: ${quoteData.companyName || 'N/A'}
- Service: ${quoteData.service}
- Budget: ${quoteData.budget || 'N/A'}
- Timeline: ${quoteData.timeline || 'N/A'}
- Source Page: ${quoteData.sourcePage || '/'}
- Submission Date: ${submissionDate}

Message:
${quoteData.message}
  `;

  const payload = {
    sender: { name: senderName, email: senderEmail },
    to: recipientList,
    subject: 'New Get a Quote Enquiry - Mitsafe',
    htmlContent,
    textContent,
  };

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': brevoApiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logger.error('Failed to send Brevo notification email:', errorData);
      return { success: false, error: errorData };
    }

    const data = await response.json();
    logger.info(`Quote notification email sent successfully via Brevo. Message ID: ${data.messageId || 'OK'}`);
    return { success: true, messageId: data.messageId };
  } catch (error) {
    logger.error('Error triggering Brevo email API:', error.message);
    return { success: false, error: error.message };
  }
};
