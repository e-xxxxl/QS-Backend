const { Resend } = require('resend');

// Initialize Resend with your API key
const resend = new Resend(process.env.RESEND_API_KEY);

// @desc    Send contact form email
// @route   POST /api/contact
// @access  Public
const sendContactEmail = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject) {
      return res.status(400).json({ 
        success: false,
        error: 'Name, email, and subject are required' 
      });
    }
    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: 'QuickShip Contact <info@quickship.africa>', // Use this for testing, change to info@quickship.africa after domain verification
      to: ['info@quickship.africa'],
      subject: `New Contact Form Submission: ${subject}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Contact Form Submission</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(to right, #f97316, #fb923c); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">📬 New Contact Form Submission</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
            <div style="margin-bottom: 25px; padding-bottom: 20px; border-bottom: 2px solid #f97316;">
              <h2 style="color: #f97316; margin: 0 0 5px 0;">👤 Sender Information</h2>
            </div>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 12px 0; width: 120px; color: #666; font-weight: bold;">Name:</td>
                <td style="padding: 12px 0; color: #333;">${name}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; width: 120px; color: #666; font-weight: bold;">Email:</td>
                <td style="padding: 12px 0; color: #333;">
                  <a href="mailto:${email}" style="color: #f97316; text-decoration: none;">${email}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 12px 0; width: 120px; color: #666; font-weight: bold;">Subject:</td>
                <td style="padding: 12px 0; color: #333;">${subject}</td>
              </tr>
            </table>
            
            <div style="margin-top: 25px; padding-top: 20px; border-top: 2px solid #f97316;">
              <h3 style="color: #f97316; margin: 0 0 15px 0;">📝 Message:</h3>
              <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb;">
                <p style="margin: 0; color: #555; line-height: 1.8; white-space: pre-wrap;">${message}</p>
              </div>
            </div>
            
            <div style="margin-top: 30px; padding: 20px; background: #fff3e0; border-radius: 8px; text-align: center;">
              <p style="margin: 0; color: #f97316; font-size: 14px;">
                ⚡ This message was sent from the QuickShip contact form
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        New Contact Form Submission
        ==========================
        
        Name: ${name}
        Email: ${email}
        Subject: ${subject}
        
        Message:
        ${message}
        
        -------------------------
        This message was sent from the QuickShip contact form
      `
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to send email. Please try again.' 
      });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Message sent successfully!',
      data 
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      success: false,
      error: 'An error occurred. Please try again.' 
    });
  }
};

module.exports = {
  sendContactEmail
};