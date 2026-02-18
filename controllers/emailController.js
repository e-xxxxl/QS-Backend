const { Resend } = require('resend');
const User = require('../models/User');
const Shipment = require('../models/Shipment');

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Test Resend setup on startup
(async () => {
  try {
    console.log('🔧 Initializing Resend for Email Controller...');
    
    if (!process.env.RESEND_API_KEY) {
      console.warn('⚠️ RESEND_API_KEY is not set. Email notifications will not work.');
      return;
    }
    
    console.log('✅ Resend initialized for email controller');
    console.log('📧 From email will be:', process.env.EMAIL_FROM || 'QuickShipAfrica <onboarding@resend.dev>');
    
  } catch (error) {
    console.error('❌ Resend initialization error:', error.message);
  }
})();


// Add this function to your emailController.js file
const sendAdminShipmentNotification = async (shipment, user, paymentData, retryCount = 0) => {
  const maxRetries = 2;
  
  try {
    console.log(`📧 Sending admin notification to: info@quickship.africa`);
    
    // Admin email address
    const adminEmail = 'info@quickship.africa';
    
    // Check if we have Resend API key
    if (!process.env.RESEND_API_KEY) {
      console.warn(`⚠️ RESEND_API_KEY not set. Logging admin notification instead`);
      console.log('🔔 ADMIN NOTIFICATION - New Shipment Created:', {
        shipmentId: shipment._id,
        trackingNumber: shipment.terminalShipmentId,
        user: user?.email || 'Unknown user',
        amount: shipment.shipping?.amount,
        paymentReference: paymentData.reference,
        createdAt: new Date().toISOString()
      });
      return { id: 'dev-mode', message: 'Admin notification logged (no API key)' };
    }
    
    const fromEmail = process.env.EMAIL_FROM || 'QuickShipAfrica <sales@quickship.africa>';
    
    // Format currency
    const formatCurrency = (amount, currency = 'NGN') => {
      try {
        return new Intl.NumberFormat('en-NG', {
          style: 'currency',
          currency: currency
        }).format(amount);
      } catch (error) {
        return `${currency} ${amount?.toFixed(2) || '0.00'}`;
      }
    };
    
    // Format date
    const formatDateTime = (date) => {
      return new Date(date).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      });
    };
    
    const emailData = await resend.emails.send({
      from: fromEmail,
      to: adminEmail,
      cc: process.env.ADMIN_CC_EMAILS ? process.env.ADMIN_CC_EMAILS.split(',') : [],
      subject: `🔔 NEW SHIPMENT: ${shipment.terminalShipmentId || shipment._id}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Shipment Notification</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f9fafb; }
            .container { max-width: 700px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #1e40af, #1d4ed8); padding: 30px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 24px; font-weight: bold; }
            .content { padding: 30px; }
            .alert-badge { background-color: #fef3c7; color: #92400e; padding: 10px 20px; border-radius: 6px; font-weight: bold; margin-bottom: 20px; display: inline-block; }
            .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 25px; }
            .section { background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 20px; border: 1px solid #e5e7eb; }
            .section-title { color: #1e40af; font-size: 16px; font-weight: bold; margin-bottom: 15px; border-bottom: 2px solid #dbeafe; padding-bottom: 8px; }
            .data-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
            .data-label { color: #64748b; font-weight: 500; }
            .data-value { font-weight: 600; color: #1e293b; text-align: right; }
            .amount-highlight { color: #059669; font-weight: bold; font-size: 18px; }
            .dashboard-link { display: inline-block; background: linear-gradient(135deg, #1e40af, #1d4ed8); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }
            .footer { background-color: #1f2937; padding: 25px; text-align: center; color: #9ca3af; font-size: 14px; }
            @media (max-width: 600px) {
              .content { padding: 20px; }
              .info-grid { grid-template-columns: 1fr; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔔 New Shipment Created</h1>
            </div>
            
            <div class="content">
              <div class="alert-badge">📦 New shipment requires attention</div>
              
              <div class="section">
                <div class="section-title">Shipment Summary</div>
                <div class="info-grid">
                  <div>
                    <div class="data-row">
                      <span class="data-label">Shipment ID:</span>
                      <span class="data-value">${shipment._id}</span>
                    </div>
                    <div class="data-row">
                      <span class="data-label">Tracking #:</span>
                      <span class="data-value" style="font-family: monospace;">${shipment.terminalShipmentId || 'Pending'}</span>
                    </div>
                    <div class="data-row">
                      <span class="data-label">Status:</span>
                      <span class="data-value" style="color: #f59e0b;">${shipment.status}</span>
                    </div>
                  </div>
                  <div>
                    <div class="data-row">
                      <span class="data-label">Created:</span>
                      <span class="data-value">${formatDateTime(shipment.createdAt)}</span>
                    </div>
                    <div class="data-row">
                      <span class="data-label">Carrier:</span>
                      <span class="data-value">${shipment.shipping?.carrier_name || 'N/A'}</span>
                    </div>
                    <div class="data-row">
                      <span class="data-label">Service:</span>
                      <span class="data-value">${shipment.shipping?.service || 'Standard'}</span>
                    </div>
                  </div>
                </div>
                
                <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 2px solid #dbeafe;">
                  <div class="amount-highlight">${formatCurrency(shipment.shipping?.amount || 0, shipment.shipping?.currency || 'NGN')}</div>
                  <div style="color: #64748b; font-size: 14px; margin-top: 5px;">Total Amount</div>
                </div>
              </div>
              
              <div class="section">
                <div class="section-title">Customer Information</div>
                <div class="info-grid">
                  <div>
                    <div class="data-row">
                      <span class="data-label">Customer:</span>
                      <span class="data-value">${user?.firstName || ''} ${user?.lastName || ''}</span>
                    </div>
                    <div class="data-row">
                      <span class="data-label">Email:</span>
                      <span class="data-value">${user?.email || 'N/A'}</span>
                    </div>
                    <div class="data-row">
                      <span class="data-label">Phone:</span>
                      <span class="data-value">${user?.phone || shipment.sender?.phone || 'N/A'}</span>
                    </div>
                  </div>
                  <div>
                    <div class="data-row">
                      <span class="data-label">User ID:</span>
                      <span class="data-value" style="font-family: monospace; font-size: 12px;">${user?._id || 'N/A'}</span>
                    </div>
                    <div class="data-row">
                      <span class="data-label">Total Shipments:</span>
                      <span class="data-value">${await Shipment.countDocuments({ user: user?._id }) || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div style="text-align: center; margin-top: 30px;">
                <a href="${process.env.ADMIN_DASHBOARD_URL || process.env.FRONTEND_URL || 'https://quickship.africa'}/admin/shipments/${shipment._id}" 
                   class="dashboard-link">
                   👁️ View in Admin Dashboard
                </a>
                <p style="color: #64748b; font-size: 13px; margin-top: 15px;">
                  Shipment ID: ${shipment._id} | Terminal Africa ID: ${shipment.terminalShipmentId || 'N/A'}
                </p>
              </div>
            </div>
            
            <div class="footer">
              <p>© ${new Date().getFullYear()} QuickShipAfrica - Admin Notification System</p>
              <p>This is an automated notification. You're receiving this email because you're an admin.</p>
              <p>Generated at: ${new Date().toLocaleString()}</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
🔔 NEW SHIPMENT CREATED - ADMIN NOTIFICATION

SHIPMENT SUMMARY:
================
📦 Shipment ID: ${shipment._id}
📋 Tracking Number: ${shipment.terminalShipmentId || 'Pending'}
🔄 Status: ${shipment.status}
💰 Amount: ${formatCurrency(shipment.shipping?.amount || 0, shipment.shipping?.currency || 'NGN')}
📅 Created: ${formatDateTime(shipment.createdAt)}
🚚 Carrier: ${shipment.shipping?.carrier_name || 'N/A'}
📦 Service: ${shipment.shipping?.service || 'Standard'}

CUSTOMER INFORMATION:
====================
👤 Customer: ${user?.firstName || ''} ${user?.lastName || ''}
📧 Email: ${user?.email || 'N/A'}
📞 Phone: ${user?.phone || shipment.sender?.phone || 'N/A'}
🆔 User ID: ${user?._id || 'N/A'}
📊 Total Shipments: ${await Shipment.countDocuments({ user: user?._id }) || 0}

ADMIN ACTIONS:
==============
🔗 View in Dashboard: ${process.env.ADMIN_DASHBOARD_URL  || 'https://quickship.africa'}/admin/shipments/${shipment._id}

---
⚠️ This is an automated admin notification.
📧 Sent to: info@quickship.africa
⏰ Generated: ${new Date().toLocaleString()}
© ${new Date().getFullYear()} QuickShipAfrica
      `
    });
    
    console.log(`✅ Admin notification email sent to ${adminEmail}`);
    return emailData;
    
  } catch (error) {
    console.error(`❌ Failed to send admin notification email:`, error.message);
    
    // Retry logic for transient errors
    const isRetryable = retryCount < maxRetries && 
      !error.message?.includes('validation_error') &&
      !error.message?.includes('rate_limit') &&
      !error.message?.includes('invalid_parameter');
    
    if (isRetryable) {
      const delay = Math.pow(2, retryCount) * 1000;
      console.log(`Retrying in ${delay/1000}s... (${retryCount + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return sendAdminShipmentNotification(shipment, user, paymentData, retryCount + 1);
    }
    
    console.log('🔔 ADMIN NOTIFICATION ERROR - New Shipment Created:', {
      shipmentId: shipment._id,
      user: user?.email,
      error: error.message
    });
    
    return { error: error.message };
  }
};

// Export the admin notification function
exports.sendAdminShipmentNotification = sendAdminShipmentNotification;

// Send Shipment Confirmation Email
const sendShipmentConfirmation = async (to, shipment, user, retryCount = 0) => {
  const maxRetries = 2;
  
  try {
    console.log(`📧 Sending shipment confirmation to: ${to}`);
    
    // Check if we have Resend API key
    if (!process.env.RESEND_API_KEY) {
      console.warn(`⚠️ RESEND_API_KEY not set. Logging shipment details instead for ${to}`);
      console.log('Shipment Details:', {
        trackingNumber: shipment.terminalShipmentId,
        amount: shipment.shipping?.amount,
        carrier: shipment.shipping?.carrier_name,
        status: shipment.status
      });
      return { id: 'dev-mode', message: 'Shipment logged (no API key)' };
    }
    
    // Determine sender email
    const fromEmail = process.env.EMAIL_FROM || 'QuickShipAfrica <onboarding@resend.dev>';
    
    // Format currency
    const formatCurrency = (amount, currency = 'NGN') => {
      try {
        return new Intl.NumberFormat('en-NG', {
          style: 'currency',
          currency: currency
        }).format(amount);
      } catch (error) {
        return `${currency} ${amount?.toFixed(2) || '0.00'}`;
      }
    };
    
    // Format date
    const formatDate = (date) => {
      return new Date(date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };
    
    // Get status badge
    const getStatusBadge = (status) => {
      const statusMap = {
        'pending': { color: '#f59e0b', text: 'Pending Pickup', bg: '#fef3c7' },
        'processing': { color: '#3b82f6', text: 'Processing', bg: '#dbeafe' },
        'in_transit': { color: '#8b5cf6', text: 'In Transit', bg: '#ede9fe' },
        'delivered': { color: '#10b981', text: 'Delivered', bg: '#d1fae5' },
        'cancelled': { color: '#ef4444', text: 'Cancelled', bg: '#fee2e2' }
      };
      
      return statusMap[status] || { color: '#6b7280', text: 'Processing', bg: '#f3f4f6' };
    };
    
    const statusInfo = getStatusBadge(shipment.status);
    const amount = shipment.shipping?.amount || 0;
    const currency = shipment.shipping?.currency || 'NGN';
    
    const emailData = await resend.emails.send({
      from: fromEmail,
      to: to,
      reply_to: process.env.EMAIL_REPLY_TO || 'contact@quickship.africa',
      subject: `🚚 Shipment Created: ${shipment.terminalShipmentId || 'Your QuickShip Order'}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Shipment Created - QuickShipAfrica</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f9fafb; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #f97316, #ea580c); padding: 40px 30px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 28px; font-weight: bold; }
            .header p { color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px; }
            .content { padding: 40px 30px; }
            .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; margin-bottom: 20px; }
            .info-card { background: #f8fafc; border-radius: 8px; padding: 25px; margin-bottom: 25px; border: 1px solid #e5e7eb; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
            .details-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
            .tracking-number { font-size: 20px; font-weight: bold; color: #1f2937; letter-spacing: 1px; background: #fef3c7; padding: 10px 15px; border-radius: 8px; display: inline-block; }
            .amount-display { font-size: 28px; font-weight: bold; color: #059669; margin: 10px 0; }
            .footer { background-color: #1f2937; padding: 30px; text-align: center; }
            .footer p { color: #9ca3af; font-size: 14px; margin: 5px 0; }
            .button { display: inline-block; background: linear-gradient(135deg, #f97316, #ea580c); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 20px 0; }
            .section-title { color: #1f2937; font-size: 18px; font-weight: 600; margin-bottom: 15px; border-bottom: 2px solid #f3f4f6; padding-bottom: 10px; }
            .step-card { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 10px 0; }
            .step-number { display: inline-block; width: 30px; height: 30px; background: #f97316; color: white; border-radius: 50%; text-align: center; line-height: 30px; margin-right: 10px; font-weight: bold; }
            @media (max-width: 600px) {
              .content { padding: 20px 15px; }
              .info-grid { grid-template-columns: 1fr; }
              .details-grid { grid-template-columns: 1fr; }
              .tracking-number { font-size: 16px; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <!-- Header -->
            <div class="header">
              <h1>🎉 Shipment Created Successfully!</h1>
              <p>Your QuickShip order is now being processed</p>
            </div>
            
            <!-- Content -->
            <div class="content">
              <!-- Status Badge -->
              <div class="status-badge" style="background-color: ${statusInfo.bg}; color: ${statusInfo.color};">
                ${statusInfo.text}
              </div>
              
              <!-- Tracking Number -->
              <div style="text-align: center; margin: 25px 0;">
                <p style="color: #6b7280; margin-bottom: 10px;">Tracking Number</p>
                <div class="tracking-number">${shipment.terminalShipmentId || 'Pending Assignment'}</div>
              </div>
              
              <!-- Summary Card -->
              <div class="info-card">
                <div class="section-title">Order Summary</div>
                <div class="info-grid">
                  <div>
                    <p style="color: #6b7280; margin-bottom: 5px; font-size: 14px;">Order Date</p>
                    <p style="font-weight: 600; margin: 0;">${formatDate(shipment.createdAt || new Date())}</p>
                  </div>
                  <div>
                    <p style="color: #6b7280; margin-bottom: 5px; font-size: 14px;">Order ID</p>
                    <p style="font-weight: 600; margin: 0; font-family: monospace;">${shipment._id?.toString().substring(0, 8).toUpperCase() || 'N/A'}</p>
                  </div>
                  <div>
                    <p style="color: #6b7280; margin-bottom: 5px; font-size: 14px;">Total Amount</p>
                    <p class="amount-display">${formatCurrency(amount, currency)}</p>
                  </div>
                  <div>
                    <p style="color: #6b7280; margin-bottom: 5px; font-size: 14px;">Payment Status</p>
                    <p style="font-weight: 600; color: #059669; margin: 0;">✅ Paid</p>
                  </div>
                </div>
              </div>
              
              <!-- Shipping Details -->
              <div class="info-card">
                <div class="section-title">Shipping Details</div>
                <div class="details-grid">
                  <div>
                    <p style="color: #6b7280; margin-bottom: 5px; font-size: 14px;">Carrier</p>
                    <p style="font-weight: 600; margin: 0;">${shipment.shipping?.carrier_name || 'QuickShip Partner'}</p>
                  </div>
                  <div>
                    <p style="color: #6b7280; margin-bottom: 5px; font-size: 14px;">Service</p>
                    <p style="font-weight: 600; margin: 0;">${shipment.shipping?.service || 'Standard Delivery'}</p>
                  </div>
                  <div>
                    <p style="color: #6b7280; margin-bottom: 5px; font-size: 14px;">Est. Delivery</p>
                    <p style="font-weight: 600; margin: 0;">${shipment.shipping?.estimated_delivery ? formatDate(shipment.shipping.estimated_delivery) : '3-5 Business Days'}</p>
                  </div>
                </div>
              </div>
              
              <!-- Route Details -->
              <div class="info-card">
                <div class="section-title">Route Information</div>
                <div class="info-grid">
                  <div>
                    <p style="color: #6b7280; margin-bottom: 5px; font-size: 14px;">From</p>
                    <p style="font-weight: 600; margin: 0 0 5px;">${shipment.sender?.name || 'Sender'}</p>
                    <p style="color: #6b7280; font-size: 13px; margin: 0;">
                      ${shipment.sender?.city || ''}, ${shipment.sender?.state || ''}
                    </p>
                  </div>
                  <div>
                    <p style="color: #6b7280; margin-bottom: 5px; font-size: 14px;">To</p>
                    <p style="font-weight: 600; margin: 0 0 5px;">${shipment.receiver?.name || 'Receiver'}</p>
                    <p style="color: #6b7280; font-size: 13px; margin: 0;">
                      ${shipment.receiver?.city || ''}, ${shipment.receiver?.state || ''}
                    </p>
                  </div>
                </div>
              </div>
              
              <!-- Next Steps -->
              <div style="margin-top: 30px;">
                <div class="section-title">Next Steps</div>
                
                <div class="step-card">
                  <div>
                    <span class="step-number">1</span>
                    <span style="font-weight: 600; color: #1f2937;">Package Your Items</span>
                  </div>
                  <p style="color: #6b7280; margin: 10px 0 0 40px; font-size: 14px;">
                    Securely pack your items in appropriate packaging. Make sure they're well-protected for shipping.
                  </p>
                </div>
                
                <div class="step-card">
                  <div>
                    <span class="step-number">2</span>
                    <span style="font-weight: 600; color: #1f2937;">Prepare for Pickup</span>
                  </div>
                  <p style="color: #6b7280; margin: 10px 0 0 40px; font-size: 14px;">
                    The carrier will contact you to schedule pickup. Have your package ready and ensure someone is available.
                  </p>
                </div>
                
                <div class="step-card">
                  <div>
                    <span class="step-number">3</span>
                    <span style="font-weight: 600; color: #1f2937;">Track Your Shipment</span>
                  </div>
                  <p style="color: #6b7280; margin: 10px 0 0 40px; font-size: 14px;">
                    Use your tracking number to monitor your package's journey in real-time.
                  </p>
                </div>
              </div>
              
              <!-- Action Button -->
              <div style="text-align: center; margin: 40px 0 20px;">
                <a href="${process.env.FRONTEND_URL || 'https://quickship.africa'}/dashboard" class="button">
                  📦 View in Dashboard
                </a>
                <p style="color: #6b7280; font-size: 14px; margin-top: 10px;">
                  You can also track this shipment in your QuickShip dashboard
                </p>
              </div>
              
              <!-- Help Section -->
              <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin-top: 30px;">
                <p style="color: #92400e; margin: 0; font-size: 14px;">
                  <strong>📞 Need Help?</strong> Contact our support team at 
                  <a href="mailto:contact@quickship.africa" style="color: #f97316; font-weight: 600;">contact@quickship.africa</a>
                  or call +234 901 234 5678
                </p>
              </div>
            </div>
            
            <!-- Footer -->
            <div class="footer">
              <p>© ${new Date().getFullYear()} QuickShipAfrica. All rights reserved.</p>
              <p>This is an automated message. Please do not reply to this email.</p>
              <p>This email was sent to ${to}</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
SHIPMENT CREATED SUCCESSFULLY

Hello ${user?.firstName || 'Valued Customer'},

🎉 Your QuickShip order has been created successfully!

Order Details:
-------------
📦 Tracking Number: ${shipment.terminalShipmentId|| 'Will be assigned shortly'}
📅 Order Date: ${formatDate(shipment.createdAt || new Date())}
💰 Total Amount: ${formatCurrency(amount, currency)}
✅ Payment Status: Paid
🚚 Carrier: ${shipment.shipping?.carrier_name || 'QuickShip Partner'}
📦 Service: ${shipment.shipping?.service || 'Standard Delivery'}
📆 Est. Delivery: ${shipment.shipping?.estimated_delivery ? formatDate(shipment.shipping.estimated_delivery) : '3-5 Business Days'}

Route Information:
-----------------
📍 From: ${shipment.sender?.name || 'Sender'}
   ${shipment.sender?.city || ''}, ${shipment.sender?.state || ''}

📍 To: ${shipment.receiver?.name || 'Receiver'}
   ${shipment.receiver?.city || ''}, ${shipment.receiver?.state || ''}

Next Steps:
----------
1. 📦 Package Your Items
   Securely pack your items in appropriate packaging.

2. 🚚 Prepare for Pickup
   The carrier will contact you to schedule pickup.

3. 🔍 Track Your Shipment
   Use your tracking number to monitor your package's journey.

📱 Track Your Shipment:
${process.env.FRONTEND_URL || 'https://quickship.africa'}/dashboard

Need Help?
----------
📧 Email: contact@quickship.africa
📞 Phone: +234 901 234 5678

Thank you for choosing QuickShipAfrica!

Best regards,
The QuickShipAfrica Team

© ${new Date().getFullYear()} QuickShipAfrica. All rights reserved.
This email was sent to ${to}
`
    });
    
    console.log(`✅ Shipment confirmation email sent to ${to}`);
    console.log(`   Email ID: ${emailData.id}`);
    
    return emailData;
    
  } catch (error) {
    console.error(`❌ Failed to send shipment confirmation to ${to}:`, error.message);
    
    // Log the full error for debugging
    console.error('Resend error details:', {
      name: error.name,
      message: error.message,
      statusCode: error.statusCode,
      code: error.code
    });
    
    // For development/fallback, log shipment details to console
    if (process.env.NODE_ENV !== 'production') {
      console.log(`🔐 [DEV FALLBACK] Shipment created for ${to}:`, {
        trackingNumber: shipment.terminalShipmentId,
        amount: shipment.shipping?.amount,
        carrier: shipment.shipping?.carrier_name,
        status: shipment.status,
        userId: user?._id
      });
    }
    
    // Retry logic for transient errors
    const isRetryable = retryCount < maxRetries && 
      !error.message?.includes('validation_error') &&
      !error.message?.includes('rate_limit') &&
      !error.message?.includes('invalid_parameter');
    
    if (isRetryable) {
      const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
      console.log(`Retrying in ${delay/1000}s... (${retryCount + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return sendShipmentConfirmation(to, shipment, user, retryCount + 1);
    }
    
    throw new Error(`Failed to send shipment confirmation: ${error.message}`);
  }
};

// Send Payment Confirmation Email
const sendPaymentConfirmation = async (to, payment, shipment, user, retryCount = 0) => {
  const maxRetries = 2;
  
  try {
    console.log(`📧 Sending payment confirmation to: ${to}`);
    
    // Check if we have Resend API key
    if (!process.env.RESEND_API_KEY) {
      console.warn(`⚠️ RESEND_API_KEY not set. Logging payment details instead for ${to}`);
      console.log('Payment Details:', {
        amount: payment.amount,
        currency: payment.currency,
        reference: payment.reference,
        status: payment.status
      });
      return { id: 'dev-mode', message: 'Payment logged (no API key)' };
    }
    
    const fromEmail = process.env.EMAIL_FROM || 'QuickShipAfrica <onboarding@resend.dev>';
    
    // Format currency
    const formatCurrency = (amount, currency = 'NGN') => {
      try {
        return new Intl.NumberFormat('en-NG', {
          style: 'currency',
          currency: currency
        }).format(amount);
      } catch (error) {
        return `${currency} ${amount?.toFixed(2) || '0.00'}`;
      }
    };
    
    const emailData = await resend.emails.send({
      from: fromEmail,
      to: to,
      reply_to: process.env.EMAIL_REPLY_TO || 'contact@quickship.africa',
      subject: '✅ Payment Successful - QuickShipAfrica',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Successful - QuickShipAfrica</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f9fafb; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #10b981, #059669); padding: 40px 30px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 28px; font-weight: bold; }
            .content { padding: 40px 30px; }
            .success-icon { font-size: 48px; margin-bottom: 20px; }
            .amount { font-size: 36px; font-weight: bold; color: #059669; margin: 20px 0; }
            .info-card { background: #f8fafc; border-radius: 8px; padding: 25px; margin: 20px 0; border: 1px solid #e5e7eb; }
            .footer { background-color: #1f2937; padding: 30px; text-align: center; }
            .footer p { color: #9ca3af; font-size: 14px; margin: 5px 0; }
            @media (max-width: 600px) {
              .content { padding: 20px 15px; }
              .amount { font-size: 28px; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Payment Successful!</h1>
            </div>
            <div class="content" style="text-align: center;">
              <div class="success-icon">💰</div>
              <h2 style="color: #1f2937;">Thank you for your payment!</h2>
              <div class="amount">${formatCurrency(payment.amount, payment.currency)}</div>
              
              <div class="info-card">
                <p style="color: #6b7280; margin-bottom: 10px; font-size: 14px;">Transaction Reference</p>
                <p style="font-family: monospace; font-weight: 600; color: #1f2937; margin: 0;">${payment.reference}</p>
              </div>
              
              <div class="info-card">
                <p style="color: #6b7280; margin-bottom: 10px; font-size: 14px;">Payment Method</p>
                <p style="font-weight: 600; color: #1f2937; margin: 0;">${payment.channel || 'Card Payment'}</p>
              </div>
              
              ${shipment ? `
              <div class="info-card">
                <p style="color: #6b7280; margin-bottom: 10px; font-size: 14px;">Shipment Status</p>
                <p style="font-weight: 600; color: #f97316; margin: 0;">Shipment is being created...</p>
                ${shipment.terminalShipmentId ? `<p style="color: #6b7280; font-size: 13px; margin: 5px 0 0;">Tracking: ${shipment.terminalShipmentId}</p>` : ''}
              </div>
              ` : ''}
              
              <p style="color: #6b7280; margin-top: 30px; font-size: 15px;">
                A confirmation email with shipment details will be sent to you shortly.
              </p>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                Need help? Contact us at 
                <a href="mailto:contact@quickship.africa" style="color: #f97316; font-weight: 600;">contact@quickship.africa</a>
              </p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} QuickShipAfrica. All rights reserved.</p>
              <p>This email was sent to ${to}</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
PAYMENT SUCCESSFUL

✅ Your payment has been processed successfully!

Payment Details:
---------------
💰 Amount: ${formatCurrency(payment.amount, payment.currency)}
📝 Reference: ${payment.reference}
💳 Method: ${payment.channel || 'Card Payment'}
📅 Date: ${new Date(payment.paidAt || new Date()).toLocaleString()}

${shipment ? `
Shipment Details:
----------------
🚚 Status: Shipment is being created...
${shipment.terminalShipmentId ? `📦 Tracking: ${shipment.terminalShipmentId}` : ''}
` : ''}

A confirmation email with shipment details will be sent to you shortly.

Need help? Contact us at contact@quickship.africa

Thank you for choosing QuickShipAfrica!

© ${new Date().getFullYear()} QuickShipAfrica. All rights reserved.
This email was sent to ${to}
`
    });
    
    console.log(`✅ Payment confirmation email sent to ${to}`);
    
    return emailData;
    
  } catch (error) {
    console.error(`❌ Failed to send payment confirmation to ${to}:`, error.message);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`🔐 [DEV FALLBACK] Payment successful for ${to}:`, {
        amount: payment.amount,
        reference: payment.reference,
        status: payment.status
      });
    }
    
    // Retry logic
    const isRetryable = retryCount < maxRetries && 
      !error.message?.includes('validation_error') &&
      !error.message?.includes('rate_limit');
    
    if (isRetryable) {
      const delay = Math.pow(2, retryCount) * 1000;
      console.log(`Retrying in ${delay/1000}s... (${retryCount + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return sendPaymentConfirmation(to, payment, shipment, user, retryCount + 1);
    }
    
    throw new Error(`Failed to send payment confirmation: ${error.message}`);
  }
};

// Send Shipment Status Update Email
const sendShipmentStatusUpdate = async (to, shipment, oldStatus, newStatus, user) => {
  try {
    console.log(`📧 Sending status update to: ${to}`);
    
    if (!process.env.RESEND_API_KEY) {
      console.warn(`⚠️ RESEND_API_KEY not set. Status update for ${to}: ${oldStatus} → ${newStatus}`);
      return { id: 'dev-mode', message: 'Status update logged (no API key)' };
    }
    
    const fromEmail = process.env.EMAIL_FROM || 'QuickShipAfrica <onboarding@resend.dev>';
    
    const statusMessages = {
      'in_transit': 'Your package is now in transit!',
      'delivered': 'Your package has been delivered!',
      'exception': 'There is an update on your shipment',
      'cancelled': 'Your shipment has been cancelled'
    };
    
    const subject = statusMessages[newStatus] || `Shipment Update: ${newStatus}`;
    
    await resend.emails.send({
      from: fromEmail,
      to: to,
      subject: `📦 ${subject} - ${shipment.terminalShipmentId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0;">Shipment Status Updated</h1>
          </div>
          <div style="padding: 30px; background: #f9fafb;">
            <div style="background: white; border-radius: 10px; padding: 25px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
              <h3 style="color: #374151; margin-top: 0;">Status Change</h3>
              <div style="display: flex; align-items: center; justify-content: center; gap: 20px; margin: 30px 0;">
                <div style="text-align: center;">
                  <div style="color: #9ca3af; font-size: 14px;">Previous</div>
                  <div style="padding: 8px 16px; background: #f3f4f6; border-radius: 6px; font-weight: 600; text-transform: capitalize;">${oldStatus}</div>
                </div>
                <div style="font-size: 24px;">→</div>
                <div style="text-align: center;">
                  <div style="color: #9ca3af; font-size: 14px;">Current</div>
                  <div style="padding: 8px 16px; background: ${newStatus === 'delivered' ? '#d1fae5' : '#dbeafe'}; color: ${newStatus === 'delivered' ? '#065f46' : '#1e40af'}; border-radius: 6px; font-weight: 600; text-transform: capitalize;">${newStatus}</div>
                </div>
              </div>
              
              <div style="border-top: 2px solid #f3f4f6; padding-top: 20px;">
                <p style="color: #6b7280; margin-bottom: 10px;">Tracking Number</p>
                <p style="font-weight: bold; font-size: 18px; color: #1f2937; margin: 0;">${shipment.terminalShipmentId}</p>
              </div>
            </div>
            
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'https://quickship.africa'}/track/${shipment.terminalShipmentId}" 
                 style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #1d4ed8); 
                        color: white; padding: 12px 30px; text-decoration: none; 
                        border-radius: 8px; font-weight: bold;">
                Track Shipment
              </a>
            </div>
          </div>
        </div>
      `
    });
    
    console.log(`✅ Status update email sent to ${to}`);
    
  } catch (error) {
    console.error(`❌ Failed to send status update to ${to}:`, error.message);
  }
};

// @desc    Send shipment confirmation email
// @route   POST /api/email/shipment-confirmation
// @access  Private
exports.sendShipmentConfirmation = async (req, res) => {
  try {
    const { to, shipment, user } = req.body;

    console.log('📧 API: Sending shipment confirmation...');

    if (!to || !shipment) {
      return res.status(400).json({
        success: false,
        message: 'Recipient email and shipment data are required'
      });
    }

    const result = await sendShipmentConfirmation(to, shipment, user);

    res.status(200).json({
      success: true,
      message: 'Shipment confirmation email sent successfully',
      data: result
    });

  } catch (error) {
    console.error('❌ API: Error sending shipment confirmation:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to send shipment confirmation email',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Send payment confirmation email
// @route   POST /api/email/payment-confirmation
// @access  Private
exports.sendPaymentConfirmation = async (req, res) => {
  try {
    const { to, payment, shipment, user } = req.body;

    console.log('📧 API: Sending payment confirmation...');

    if (!to || !payment) {
      return res.status(400).json({
        success: false,
        message: 'Recipient email and payment data are required'
      });
    }

    const result = await sendPaymentConfirmation(to, payment, shipment, user);

    res.status(200).json({
      success: true,
      message: 'Payment confirmation email sent successfully',
      data: result
    });

  } catch (error) {
    console.error('❌ API: Error sending payment confirmation:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to send payment confirmation email',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Send shipment status update email
// @route   POST /api/email/status-update
// @access  Private
exports.sendShipmentStatusUpdate = async (req, res) => {
  try {
    const { to, shipment, oldStatus, newStatus, user } = req.body;

    console.log(`📧 API: Sending status update ${oldStatus} → ${newStatus}...`);

    if (!to || !shipment || !oldStatus || !newStatus) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    await sendShipmentStatusUpdate(to, shipment, oldStatus, newStatus, user);

    res.status(200).json({
      success: true,
      message: 'Status update email sent successfully'
    });

  } catch (error) {
    console.error('❌ API: Error sending status update:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to send status update email',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Helper function to send email after successful payment and shipment creation
// exports.sendPaymentAndShipmentEmails = async (userId, paymentData, shipmentData) => {
//   try {
//     // Get user
//     const user = await User.findById(userId);
//     if (!user) {
//       console.warn(`⚠️ User ${userId} not found for email sending`);
//       return;
//     }

//     // Send payment confirmation first
//     try {
//       await sendPaymentConfirmation(user.email, paymentData, shipmentData, user);
//       console.log('✅ Payment confirmation email queued');
//     } catch (paymentEmailError) {
//       console.error('❌ Failed to send payment confirmation email:', paymentEmailError.message);
//     }

//     // Send shipment confirmation
//     try {
//       await sendShipmentConfirmation(user.email, shipmentData, user);
//       console.log('✅ Shipment confirmation email queued');
//     } catch (shipmentEmailError) {
//       console.error('❌ Failed to send shipment confirmation email:', shipmentEmailError.message);
//     }

//   } catch (error) {
//     console.error('❌ Error in sendPaymentAndShipmentEmails:', error.message);
//   }
// };
// In emailController.js - Update the sendPaymentAndShipmentEmails function
exports.sendPaymentAndShipmentEmails = async (userEmail, paymentData, shipmentData) => {
  try {
    console.log('📧 Starting email sending process...');
    console.log('📧 User email:', userEmail);
    console.log('📧 Payment reference:', paymentData.reference);
    console.log('📧 Shipment ID:', shipmentData._id);
    
    // Get user by email instead of ID to ensure we have the email
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      console.warn(`⚠️ User with email ${userEmail} not found`);
      // Try to get user from shipment
      if (shipmentData.user) {
        const userById = await User.findById(shipmentData.user);
        if (userById) {
          return exports.sendPaymentAndShipmentEmails(userById.email, paymentData, shipmentData);
        }
      }
      throw new Error(`User not found for email: ${userEmail}`);
    }

    // Send payment confirmation first
    try {
      console.log('📤 Sending payment confirmation...');
      const paymentResult = await sendPaymentConfirmation(user.email, paymentData, shipmentData, user);
      console.log('✅ Payment confirmation result:', paymentResult?.id || 'unknown');
    } catch (paymentEmailError) {
      console.error('❌ Failed to send payment confirmation email:', paymentEmailError.message);
      // Don't throw here, try to continue with shipment email
    }

    // Send shipment confirmation
    try {
      console.log('📤 Sending shipment confirmation...');
      const shipmentResult = await sendShipmentConfirmation(user.email, shipmentData, user);
      console.log('✅ Shipment confirmation result:', shipmentResult?.id || 'unknown');
    } catch (shipmentEmailError) {
      console.error('❌ Failed to send shipment confirmation email:', shipmentEmailError.message);
    }

    // NEW: Send admin notification
    try {
      console.log('📤 Sending admin notification...');
      const adminResult = await sendAdminShipmentNotification(shipmentData, user, paymentData);
      console.log('✅ Admin notification result:', adminResult?.id || 'unknown');
    } catch (adminEmailError) {
      console.error('❌ Failed to send admin notification email:', adminEmailError.message);
    }

    return {
      success: true,
      message: 'Emails queued successfully',
      userId: user._id,
      email: user.email
    };

  } catch (error) {
    console.error('❌ Error in sendPaymentAndShipmentEmails:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  }
};

// For webhook or background job processing
exports.processShipmentEmailQueue = async (shipmentId) => {
  try {
    const shipment = await Shipment.findById(shipmentId).populate('user');
    
    if (!shipment || !shipment.user) {
      console.warn(`⚠️ Shipment ${shipmentId} or user not found for email processing`);
      return;
    }

    // Check if email was already sent
    if (shipment.notifications?.emailSent) {
      console.log(`📧 Email already sent for shipment ${shipmentId}`);
      return;
    }

    // Send confirmation email
    await sendShipmentConfirmation(shipment.user.email, shipment, shipment.user);
    
    // Mark as sent
    shipment.notifications = {
      emailSent: true,
      emailSentAt: new Date()
    };
    
    await shipment.save();
    
    console.log(`✅ Shipment email processed for ${shipmentId}`);

  } catch (error) {
    console.error(`❌ Error processing shipment email for ${shipmentId}:`, error);
  }
};

module.exports = exports;