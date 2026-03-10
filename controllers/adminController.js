const User = require('../models/User');
const Shipment = require('../models/Shipment');
const { Resend } = require('resend');
const axios = require("axios");

// Initialize Resend with your API key
const resend = new Resend(process.env.RESEND_API_KEY);


// Email template function
const getStatusEmailTemplate = (shipment, status, recipientType) => {
  const statusMessages = {
    draft: 'Your shipment draft has been created',
    pending: 'Your shipment is pending confirmation',
    processing: 'Your shipment is being processed',
    in_transit: 'Your shipment is on its way',
    delivered: 'Your shipment has been delivered',
    cancelled: 'Your shipment has been cancelled',
    exception: 'An exception occurred with your shipment'
  };

  const statusDescriptions = {
    draft: 'Your shipment has been created as a draft and is not yet active.',
    pending: 'Your shipment is pending confirmation and will be processed soon.',
    processing: 'We are currently processing your shipment and preparing it for transit.',
    in_transit: 'Your shipment is now in transit and on its way to the destination.',
    delivered: 'Your shipment has been successfully delivered to the destination.',
    cancelled: 'Your shipment has been cancelled as requested.',
    exception: 'There has been an unexpected issue with your shipment. Please contact support.'
  };

  // Orange theme colors
  const theme = {
    primary: '#F97316', // Bright orange
    primaryDark: '#EA580C', // Darker orange for hover
    primaryLight: '#FFEDD5', // Light orange for backgrounds
    secondary: '#FEF3C7', // Warm amber light
    accent: '#FB923C', // Soft orange
    text: {
      dark: '#1F2937',
      medium: '#4B5563',
      light: '#9CA3AF',
      white: '#FFFFFF'
    },
    border: '#E5E7EB',
    background: {
      light: '#F9FAFB',
      white: '#FFFFFF',
      accent: '#FFF7ED' // Very light orange
    }
  };

  // Status badge color mapping with orange accents
  const statusColors = {
    draft: '#9CA3AF', // Gray
    pending: '#F97316', // Orange
    processing: '#FB923C', // Light orange
    in_transit: '#EA580C', // Dark orange
    delivered: '#10B981', // Green (kept for positive confirmation)
    cancelled: '#EF4444', // Red (kept for alert)
    exception: '#F97316' // Orange
  };

  const greeting = recipientType === 'sender' 
    ? `Hello ${shipment.user?.firstName || 'Valued Customer'},`
    : `Hello ${shipment.receiver?.name || 'Valued Customer'},`;

  // Get status-specific next steps
  const getNextSteps = (status) => {
    switch(status) {
      case 'in_transit':
        return 'Your shipment is in transit. You can track its real-time progress using the button below.';
      case 'delivered':
        return 'Your shipment has been delivered. We hope you\'re satisfied with our service.';
      case 'exception':
        return 'Our support team has been notified and will contact you shortly to resolve this issue.';
      case 'pending':
        return 'Your shipment is pending confirmation. You will be notified once processing begins.';
      case 'processing':
        return 'Your shipment is being prepared. We\'ll notify you when it\'s on its way.';
      case 'cancelled':
        return 'This shipment has been cancelled. If this was a mistake, please contact support.';
      default:
        return 'You will receive another notification when the status updates.';
    }
  };

  return {
    subject: `Shipment Status Update: ${shipment.trackingNumber} - ${status.replace('_', ' ').toUpperCase()}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>QuickShipAfrica - Shipment Status Update</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: ${theme.text.dark};
            background-color: ${theme.background.light};
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .card {
            background-color: ${theme.background.white};
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1);
          }
          .header {
            background-color: ${theme.background.white};
            padding: 32px 24px 16px;
            text-align: center;
            border-bottom: 2px solid ${theme.border};
          }
          .logo-container {
            margin-bottom: 16px;
          }
          .logo {
            max-width: 180px;
            height: auto;
            display: inline-block;
          }
          /* Logo placeholder - replace src with your actual logo URL */
          .logo-placeholder {
            width: 160px;
            height: 60px;
            margin: 0 auto;
            background-color: ${theme.primary};
            color: ${theme.text.white};
            font-size: 24px;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
            letter-spacing: 1px;
          }
          .tracking-badge {
            display: inline-block;
            background-color: ${theme.background.accent};
            color: ${theme.primary};
            font-size: 14px;
            font-weight: 600;
            padding: 6px 16px;
            border-radius: 20px;
            margin-top: 8px;
          }
          .content {
            padding: 32px 24px;
          }
          .greeting {
            font-size: 18px;
            margin-bottom: 24px;
            color: ${theme.text.dark};
            font-weight: 500;
          }
          .status-section {
            text-align: center;
            margin: 24px 0;
          }
          .status-badge {
            display: inline-block;
            padding: 10px 24px;
            background-color: ${statusColors[status] || theme.primary};
            color: ${theme.text.white};
            border-radius: 30px;
            font-weight: 600;
            font-size: 15px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            box-shadow: 0 2px 4px rgba(249, 115, 22, 0.2);
          }
          .message-card {
            font-size: 16px;
            color: ${theme.text.medium};
            margin: 24px 0;
            padding: 20px;
            background-color: ${theme.background.accent};
            border-radius: 10px;
            border-left: 4px solid ${theme.primary};
          }
          .tracking-number-container {
            text-align: center;
            margin: 16px 0 24px;
          }
          .tracking-label {
            font-size: 13px;
            color: ${theme.text.light};
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 4px;
          }
          .tracking-number {
            font-size: 24px;
            font-weight: 700;
            color: ${theme.primary};
            letter-spacing: 2px;
            font-family: 'Courier New', monospace;
            background-color: ${theme.background.accent};
            padding: 12px 20px;
            border-radius: 8px;
            display: inline-block;
          }
          .details-card {
            background-color: ${theme.background.light};
            padding: 24px;
            border-radius: 10px;
            margin: 24px 0;
            border: 1px solid ${theme.border};
          }
          .details-card h3 {
            color: ${theme.text.dark};
            font-size: 18px;
            margin-bottom: 20px;
            padding-bottom: 12px;
            border-bottom: 1px solid ${theme.border};
            font-weight: 600;
            display: flex;
            align-items: center;
          }
          .details-card h3:before {
            content: '';
            width: 4px;
            height: 20px;
            background-color: ${theme.primary};
            margin-right: 10px;
            border-radius: 2px;
          }
          .detail-grid {
            display: grid;
            grid-template-columns: 1fr 2fr;
            gap: 12px 8px;
          }
          .detail-label {
            font-weight: 600;
            color: ${theme.text.medium};
            font-size: 14px;
          }
          .detail-value {
            color: ${theme.text.dark};
            font-size: 14px;
            font-weight: 500;
          }
          .info-box {
            background-color: ${theme.background.accent};
            border-radius: 10px;
            padding: 20px;
            margin: 24px 0;
            border: 1px solid ${theme.primaryLight};
          }
          .info-box p {
            color: ${theme.text.medium};
            margin-bottom: 8px;
            font-size: 14px;
          }
          .info-box strong {
            color: ${theme.primary};
            font-size: 15px;
            display: block;
            margin-bottom: 8px;
          }
          .button-container {
            text-align: center;
            margin: 32px 0 24px;
          }
          .button {
            display: inline-block;
            padding: 14px 36px;
            background-color: ${theme.primary};
            color: ${theme.text.white};
            text-decoration: none;
            border-radius: 30px;
            font-weight: 600;
            font-size: 15px;
            letter-spacing: 0.5px;
            border: none;
            box-shadow: 0 4px 6px rgba(249, 115, 22, 0.25);
            transition: all 0.2s ease;
          }
          .button:hover {
            background-color: ${theme.primaryDark};
            transform: translateY(-1px);
            box-shadow: 0 6px 8px rgba(249, 115, 22, 0.3);
          }
          .divider {
            border: none;
            border-top: 1px solid ${theme.border};
            margin: 24px 0;
          }
          .contact-section {
            text-align: center;
            background-color: ${theme.background.accent};
            padding: 20px;
            border-radius: 10px;
            margin-top: 24px;
          }
          .contact-section p {
            color: ${theme.text.medium};
            font-size: 14px;
            margin-bottom: 8px;
          }
          .contact-link {
            color: ${theme.primary};
            text-decoration: none;
            font-weight: 600;
            border-bottom: 1px dotted ${theme.primary};
          }
          .contact-link:hover {
            color: ${theme.primaryDark};
          }
          .footer {
            text-align: center;
            padding: 24px;
            background-color: ${theme.background.light};
            border-top: 1px solid ${theme.border};
          }
          .footer .company-name {
            font-weight: 700;
            color: ${theme.primary};
            font-size: 16px;
            margin-bottom: 12px;
          }
          .footer .address {
            color: ${theme.text.medium};
            font-size: 13px;
            line-height: 1.6;
            max-width: 400px;
            margin: 0 auto 12px;
          }
          .footer .contact-info {
            color: ${theme.text.light};
            font-size: 12px;
            margin-bottom: 4px;
          }
          .footer .note {
            color: ${theme.text.light};
            font-size: 11px;
            font-style: italic;
            margin-top: 20px;
            padding-top: 16px;
            border-top: 1px solid ${theme.border};
          }
          .social-links {
            margin: 16px 0;
          }
          .social-link {
            display: inline-block;
            margin: 0 8px;
            color: ${theme.primary};
            text-decoration: none;
            font-size: 13px;
          }
          .social-link:hover {
            text-decoration: underline;
          }
          @media only screen and (max-width: 600px) {
            .container { padding: 10px; }
            .content { padding: 24px 16px; }
            .detail-grid { 
              grid-template-columns: 1fr;
              gap: 8px;
            }
            .detail-label { 
              margin-bottom: 2px;
            }
            .tracking-number {
              font-size: 20px;
              letter-spacing: 1px;
            }
            .header {
              padding: 24px 16px 12px;
            }
            .logo-placeholder {
              width: 140px;
              height: 50px;
              font-size: 20px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            
            <div class="header">
              <div class="logo-container">
               
                <img src="https://quickship.africa/src/assets/images/favicon.png" alt="QuickShipAfrica" class="logo" style="display: none;" />
                
                
                <div class="logo-placeholder">
                  QuickShip
                </div>
                
              </div>
              <div class="tracking-badge">
                Tracking #: ${shipment.trackingNumber}
              </div>
            </div>
            
            <div class="content">
              <div class="greeting">
                ${greeting}
              </div>
              
              <!-- Status Badge -->
              <div class="status-section">
                <span class="status-badge">
                  ${status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              
              <!-- Status Message -->
              <div class="message-card">
                <strong>${statusMessages[status] || 'Your shipment status has been updated'}</strong>
              </div>
              
              <!-- Tracking Number Highlight -->
              <div class="tracking-number-container">
                <div class="tracking-label">Tracking Number</div>
                <div class="tracking-number">
                  ${shipment.trackingNumber}
                </div>
              </div>
              
              <!-- Shipment Details -->
              <div class="details-card">
                <h3>Shipment Details</h3>
                <div class="detail-grid">
                  <span class="detail-label">Current Status:</span>
                  <span class="detail-value"><strong>${status.replace('_', ' ').toUpperCase()}</strong></span>
                  
                  <span class="detail-label">Status Details:</span>
                  <span class="detail-value">${statusDescriptions[status] || 'Your shipment status has been updated.'}</span>
                  
                  <span class="detail-label">Last Updated:</span>
                  <span class="detail-value">${new Date().toLocaleString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true
                  })}</span>
                  
                  ${shipment.origin?.address ? `
                  <span class="detail-label">Origin:</span>
                  <span class="detail-value">${shipment.origin.address}</span>
                  ` : ''}
                  
                  ${shipment.destination?.address ? `
                  <span class="detail-label">Destination:</span>
                  <span class="detail-value">${shipment.destination.address}</span>
                  ` : ''}
                  
                  ${shipment.estimatedDelivery ? `
                  <span class="detail-label">Est. Delivery:</span>
                  <span class="detail-value">${new Date(shipment.estimatedDelivery).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</span>
                  ` : ''}
                  
                  ${shipment.weight ? `
                  <span class="detail-label">Weight:</span>
                  <span class="detail-value">${shipment.weight} kg</span>
                  ` : ''}
                </div>
              </div>
              
              <!-- Next Steps -->
              <div class="info-box">
                <strong>Next Steps</strong>
                <p>${getNextSteps(status)}</p>
              </div>
              
              <!-- Call to Action Button -->
              <div class="button-container">
                <a href="${process.env.FRONTEND_URL}/track" class="button">
                  Track Your Shipment
                </a>
              </div>
              
              <!-- Contact Section -->
              <div class="contact-section">
                <p>Need assistance with your shipment?</p>
                <p>
                  <a href="mailto:support@quickship.africa" class="contact-link">support@quickship.africa</a> 
                  <span style="color: ${theme.primary};"> | </span>
                  <a href="tel:+2349129601397" class="contact-link">+234-91-2960-1397</a>
                </p>
                <p style="font-size: 13px; margin-top: 8px;">
                  Mon-Fri: 8am - 6pm | Sat: 9am - 2pm
                </p>
              </div>
            </div>
            
          
            <div class="footer">
              <div class="company-name">QuickShipAfrica</div>
              <div class="address">
                Suits 11, No 20 African church street,<br>
                College road, Ogba, Lagos, Nigeria
              </div>
              <div class="contact-info">📞 +234-91-2960-1397</div>
              <div class="contact-info">✉️ info@quickship.africa</div>
              <div class="contact-info">🌐 www.quickship.africa</div>
              
              
              
              <div class="note">
                This is an automated message from QuickShipAfrica. Please do not reply to this email.<br>
                For inquiries, please contact our customer support team.
              </div>
              
              <p style="margin-top: 16px; color: ${theme.text.light}; font-size: 11px;">
                © ${new Date().getFullYear()} QuickShipAfrica . All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  };
};

// Function to send email using Resend
// Function to send email using Resend
const sendStatusEmail = async (recipientEmail, recipientName, shipment, status, recipientType) => {
  try {
    const emailTemplate = getStatusEmailTemplate(shipment, status, recipientType);
    
    // Ensure the from address is properly formatted
    const fromAddress = process.env.EMAIL_FROM.includes('<') 
      ? process.env.EMAIL_FROM  // Already in "Name <email>" format
      : `"Quickship Africa" <${process.env.EMAIL_FROM}>`; // Add name if not present
    
    console.log('Sending email with from address:', fromAddress); // Debug log
    
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: [recipientEmail],
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      replyTo: process.env.EMAIL_REPLY_TO || 'info@quickship.africa',
      tags: [
        {
          name: 'shipment-status',
          value: status
        },
        {
          name: 'tracking-number',
          value: shipment.trackingNumber
        },
        {
          name: 'recipient-type',
          value: recipientType
        }
      ]
    });

    if (error) {
      console.error('Resend API error:', error);
      return false;
    }

    console.log(`Email sent successfully to ${recipientEmail}. Email ID: ${data?.id}`);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

// Updated updateShipmentStatus function
exports.updateShipmentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    // Validate status
    const validStatuses = [
      'draft', 'pending', 'processing', 
      'in_transit', 'delivered', 'cancelled', 'exception'
    ];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }
    
    // Get the current shipment to compare status
    const currentShipment = await Shipment.findById(req.params.id)
      .populate('user', 'firstName lastName email')
      .populate('receiver', 'name email');
    
    if (!currentShipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found'
      });
    }

    // Store old status for comparison
    const oldStatus = currentShipment.status;
    
    // Update shipment status
    const shipment = await Shipment.findByIdAndUpdate(
      req.params.id,
      { 
        status,
        // If marking as delivered, update payment if not already paid
        ...(status === 'delivered' && { 
          'payment.status': 'paid',
          'payment.paidAt': new Date()
        })
      },
      { new: true, runValidators: true }
    ).populate('user', 'firstName lastName email phone')
     .populate('receiver', 'name email phone address');
    
    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found'
      });
    }
    
    // Send emails only if status actually changed
    const emailResults = {
      sender: { attempted: false, success: false, email: null },
      receiver: { attempted: false, success: false, email: null }
    };

    if (oldStatus !== status) {
      const emailPromises = [];

      // Send email to sender (user)
      if (shipment.user && shipment.user.email) {
        emailResults.sender.attempted = true;
        emailResults.sender.email = shipment.user.email;
        
        const senderName = `${shipment.user.firstName || ''} ${shipment.user.lastName || ''}`.trim() || 'Valued Customer';
        
        emailPromises.push(
          sendStatusEmail(
            shipment.user.email, 
            senderName, 
            shipment, 
            status,
            'sender'
          ).then(result => {
            emailResults.sender.success = result;
          })
        );
      }

      // Send email to receiver
      if (shipment.receiver && shipment.receiver.email) {
        emailResults.receiver.attempted = true;
        emailResults.receiver.email = shipment.receiver.email;
        
        emailPromises.push(
          sendStatusEmail(
            shipment.receiver.email, 
            shipment.receiver.name || 'Valued Customer', 
            shipment, 
            status,
            'receiver'
          ).then(result => {
            emailResults.receiver.success = result;
          })
        );
      }

      // Wait for all emails to be sent (you can remove await if you don't want to delay response)
      if (emailPromises.length > 0) {
        await Promise.all(emailPromises);
      }

      // Log email results
      console.log('Email notification results:', JSON.stringify(emailResults, null, 2));
    }
    
    // Prepare response message
    let notificationMessage = '';
    if (oldStatus !== status) {
      const notified = [];
      if (emailResults.sender.success) notified.push('sender');
      if (emailResults.receiver.success) notified.push('receiver');
      
      if (notified.length > 0) {
        notificationMessage = ` Notification emails sent to: ${notified.join(' and ')}.`;
      } else if (emailResults.sender.attempted || emailResults.receiver.attempted) {
        notificationMessage = ' Failed to send some notification emails.';
      }
    }
    
    res.status(200).json({
      success: true,
      message: `Shipment status updated to ${status}.${notificationMessage}`,
      data: { 
        shipment,
        ...(oldStatus !== status && {
          notifications: {
            sender: {
              notified: emailResults.sender.success,
              email: emailResults.sender.email
            },
            receiver: {
              notified: emailResults.receiver.success,
              email: emailResults.receiver.email
            }
          }
        })
      }
    });
  } catch (error) {
    console.error('Error updating shipment status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};


// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard/stats
// @access  Private/Admin
exports.getDashboardStats = async (req, res) => {
  try {
    // Total users count
    const totalUsers = await User.countDocuments();
    
    // Total shipments count
    const totalShipments = await Shipment.countDocuments();
    
    // Total revenue from paid shipments
    const revenueResult = await Shipment.aggregate([
      { 
        $match: { 
          'payment.status': 'paid',
          'payment.amount': { $exists: true, $gt: 0 }
        } 
      },
      { 
        $group: { 
          _id: null, 
          total: { $sum: '$payment.amount' }
        } 
      }
    ]);
    
    // Shipment status counts
    const statusCounts = await Shipment.aggregate([
      { 
        $group: { 
          _id: '$status', 
          count: { $sum: 1 } 
        } 
      }
    ]);
    
    // Convert status counts to object
    const statusStats = {};
    statusCounts.forEach(item => {
      statusStats[item._id] = item.count;
    });
    
    // Recent users (last 7 days)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const recentUsers = await User.countDocuments({
      createdAt: { $gte: oneWeekAgo }
    });
    
    // Recent shipments (last 7 days)
    const recentShipments = await Shipment.countDocuments({
      createdAt: { $gte: oneWeekAgo }
    });
    
    // Revenue this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const monthRevenueResult = await Shipment.aggregate([
      { 
        $match: { 
          'payment.status': 'paid',
          'payment.amount': { $exists: true, $gt: 0 },
          createdAt: { $gte: startOfMonth }
        } 
      },
      { 
        $group: { 
          _id: null, 
          total: { $sum: '$payment.amount' }
        } 
      }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalShipments,
          totalRevenue: revenueResult[0]?.total || 0,
          monthlyRevenue: monthRevenueResult[0]?.total || 0,
          recentUsers,
          recentShipments,
          successRate: totalShipments > 0 
            ? Math.round((statusStats.delivered || 0) / totalShipments * 100)
            : 0
        },
        shipments: {
          pending: statusStats.pending || 0,
          processing: statusStats.processing || 0,
          in_transit: statusStats.in_transit || 0,
          delivered: statusStats.delivered || 0,
          cancelled: statusStats.cancelled || 0,
          draft: statusStats.draft || 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '' } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Build search query
    const searchQuery = search ? {
      $or: [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } }
      ]
    } : {};
    
    // Get users with shipment count
    const users = await User.find(searchQuery)
      .select('-password -otp -resetPasswordToken -resetPasswordExpires')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);
    
    // Get shipment counts for each user
    const usersWithCounts = await Promise.all(
      users.map(async (user) => {
        const shipmentCount = await Shipment.countDocuments({ user: user._id });
        const userObj = user.toObject();
        return {
          ...userObj,
          shipmentCount
        };
      })
    );
    
    // Total count for pagination
    const total = await User.countDocuments(searchQuery);
    
    res.status(200).json({
      success: true,
      data: {
        users: usersWithCounts,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get user details
// @route   GET /api/admin/users/:id
// @access  Private/Admin
exports.getUserDetails = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -otp -resetPasswordToken -resetPasswordExpires');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Get user's shipment stats
    const shipmentStats = await Shipment.aggregate([
      { $match: { user: user._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    // Get total spent
    const totalSpentResult = await Shipment.aggregate([
      { 
        $match: { 
          user: user._id,
          'payment.status': 'paid',
          'payment.amount': { $exists: true, $gt: 0 }
        } 
      },
      { $group: { _id: null, total: { $sum: '$payment.amount' } } }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        user,
        stats: {
          totalShipments: await Shipment.countDocuments({ user: user._id }),
          totalSpent: totalSpentResult[0]?.total || 0,
          shipmentStats: shipmentStats.reduce((acc, curr) => {
            acc[curr._id] = curr.count;
            return acc;
          }, {})
        }
      }
    });
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get user's shipments
// @route   GET /api/admin/users/:id/shipments
// @access  Private/Admin
exports.getUserShipments = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    const shipments = await Shipment.find({ user: req.params.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);
    
    const total = await Shipment.countDocuments({ user: req.params.id });
    
    res.status(200).json({
      success: true,
      data: {
        shipments,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching user shipments:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update user status
// @route   PATCH /api/admin/users/:id/status
// @access  Private/Admin
exports.updateUserStatus = async (req, res) => {
  try {
    const { accountStatus } = req.body;
    
    // Validate status
    const validStatuses = ['active', 'suspended', 'inactive'];
    if (!validStatuses.includes(accountStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: active, suspended, inactive'
      });
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { accountStatus },
      { new: true, runValidators: true }
    ).select('-password -otp');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: `User status updated to ${accountStatus}`,
      data: { user }
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get all shipments
// @route   GET /api/admin/shipments
// @access  Private/Admin
exports.getAllShipments = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      status, 
      search = '',
      startDate,
      endDate 
    } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Build filter query
    const filterQuery = {};
    
    // Status filter
    if (status && status !== 'all') {
      filterQuery.status = status;
    }
    
    // Date range filter
    if (startDate || endDate) {
      filterQuery.createdAt = {};
      if (startDate) {
        filterQuery.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filterQuery.createdAt.$lte = new Date(endDate);
      }
    }
    
    // Search filter
    if (search) {
      filterQuery.$or = [
        { trackingNumber: { $regex: search, $options: 'i' } },
        { reference: { $regex: search, $options: 'i' } },
        { terminalShipmentId: { $regex: search, $options: 'i' } },
        { 'receiver.name': { $regex: search, $options: 'i' } },
        { 'receiver.email': { $regex: search, $options: 'i' } },
        { 'sender.name': { $regex: search, $options: 'i' } },
        { 'sender.email': { $regex: search, $options: 'i' } }
      ];
    }
    
    // Get shipments with user data
    const shipments = await Shipment.find(filterQuery)
      .populate('user', 'firstName lastName email phoneNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);
    
    // Total count for pagination
    const total = await Shipment.countDocuments(filterQuery);
    
    res.status(200).json({
      success: true,
      data: {
        shipments,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching shipments:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get shipment details
// @route   GET /api/admin/shipments/:id
// @access  Private/Admin
exports.getShipmentDetails = async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id)
      .populate('user', 'firstName lastName email phoneNumber');
    
    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found'
      });
    }
    
    // Get tracking history if available
    const trackingHistory = [
      {
        status: 'created',
        date: shipment.createdAt,
        description: 'Shipment created'
      },
      ...(shipment.status === 'pending' ? [{
        status: 'pending',
        date: shipment.updatedAt,
        description: 'Awaiting pickup'
      }] : []),
      ...(shipment.status === 'in_transit' ? [{
        status: 'in_transit',
        date: shipment.updatedAt,
        description: 'In transit to destination'
      }] : []),
      ...(shipment.status === 'delivered' ? [{
        status: 'delivered',
        date: shipment.updatedAt,
        description: 'Successfully delivered'
      }] : [])
    ];
    
    res.status(200).json({
      success: true,
      data: {
        shipment,
        trackingHistory
      }
    });
  } catch (error) {
    console.error('Error fetching shipment details:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update shipment status
// @route   PATCH /api/admin/shipments/:id/status
// @access  Private/Admin
// exports.updateShipmentStatus = async (req, res) => {
//   try {
//     const { status } = req.body;
    
//     // Validate status
//     const validStatuses = [
//       'draft', 'pending', 'processing', 
//       'in_transit', 'delivered', 'cancelled', 'exception'
//     ];
    
//     if (!validStatuses.includes(status)) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid status'
//       });
//     }
    
//     const shipment = await Shipment.findByIdAndUpdate(
//       req.params.id,
//       { 
//         status,
//         // If marking as delivered, update payment if not already paid
//         ...(status === 'delivered' && { 
//           'payment.status': 'paid',
//           'payment.paidAt': new Date()
//         })
//       },
//       { new: true, runValidators: true }
//     ).populate('user', 'firstName lastName email');
    
//     if (!shipment) {
//       return res.status(404).json({
//         success: false,
//         message: 'Shipment not found'
//       });
//     }
    
//     // Here you could add notification logic (email, SMS, etc.)
    
//     res.status(200).json({
//       success: true,
//       message: `Shipment status updated to ${status}`,
//       data: { shipment }
//     });
//   } catch (error) {
//     console.error('Error updating shipment status:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Server error',
//       error: error.message
//     });
//   }
// };


// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Delete user's shipments first
    await Shipment.deleteMany({ user: user._id });
    
    // Delete the user
    await User.findByIdAndDelete(req.params.id);
    
    res.status(200).json({
      success: true,
      message: 'User and all associated shipments deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Delete shipment
// @route   DELETE /api/admin/shipments/:id
// @access  Private/Admin
exports.deleteShipment = async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id);
    
    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found'
      });
    }
    
    await Shipment.findByIdAndDelete(req.params.id);
    
    res.status(200).json({
      success: true,
      message: 'Shipment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting shipment:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};


// @desc    Update shipment details (basic)
// @route   PUT /api/admin/shipments/:id
// @access  Private/Admin
exports.updateShipment = async (req, res) => {
  try {
    const {
      status,
      weight,
      packageType,
      'payment.amount': paymentAmount,
      'payment.status': paymentStatus
    } = req.body;

    // Build update object
    const updateData = {};
    
    if (status) updateData.status = status;
    if (weight !== undefined) updateData.weight = weight;
    if (packageType) updateData.packageType = packageType;
    
    // Update payment info if provided
    if (paymentAmount !== undefined || paymentStatus) {
      updateData.payment = updateData.payment || {};
      if (paymentAmount !== undefined) updateData.payment.amount = parseFloat(paymentAmount);
      if (paymentStatus) updateData.payment.status = paymentStatus;
      
      // If marking as paid, set paidAt
      if (paymentStatus === 'paid' && !updateData.payment.paidAt) {
        updateData.payment.paidAt = new Date();
      }
    }

    // Find and update shipment
    const shipment = await Shipment.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('user', 'firstName lastName email');

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Shipment updated successfully',
      data: { shipment }
    });
  } catch (error) {
    console.error('Error updating shipment:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update user details
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res) => {
  try {
    const { firstName, lastName, email, phoneNumber, accountStatus } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, and email are required'
      });
    }

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await User.findOne({ 
        email, 
        _id: { $ne: req.params.id } 
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already taken by another user'
        });
      }
    }

    const updateData = {
      firstName,
      lastName,
      email,
      ...(phoneNumber && { phoneNumber }),
      ...(accountStatus && { accountStatus })
    };

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -otp -resetPasswordToken -resetPasswordExpires');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: { user }
    });
  } catch (error) {
    console.error('Error updating user:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};


// controllers/adminController.js - Add this method

// @desc    Admin create shipment without payment (bypass)
// @route   POST /api/admin/shipments/create-bypass
// @access  Private (Admin only)
// controllers/adminController.js - Update adminCreateShipmentBypass

exports.adminCreateShipmentBypass = async (req, res) => {
  try {
    const adminId = req.admin._id;
    const {
      address_from_id,
      address_to_id,
      parcel_id,
      rate_id,
      metadata = {},
      admin_info,
      proofOfWeightUrl,
      proofOfOwnershipUrl
    } = req.body;

    console.log('🚚 Admin creating shipment without payment:', {
      adminId,
      adminEmail: admin_info?.email,
    });

    // Validate required fields
    if (!address_from_id || !address_to_id || !parcel_id || !rate_id) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    // Create shipment on Terminal Africa
    const terminalAfricaService = require('../utils/terminalAfricaService');
    
    const terminalResponse = await terminalAfricaService.createShipmentWithAdminBypass({
      address_from_id,
      address_to_id,
      parcel_id,
      rate_id,
      metadata: {
        ...metadata,
        admin_created: true,
        admin_id: adminId,
        admin_email: admin_info?.email,
        bypass_payment: true
      }
    }, admin_info);

    console.log('✅ Terminal Africa shipment created:', terminalResponse.shipment_id);

    // Parse estimated delivery
    let estimatedDelivery = metadata.estimated_delivery;
    if (estimatedDelivery) {
      try {
        if (typeof estimatedDelivery === 'string' && estimatedDelivery.includes('Within')) {
          estimatedDelivery = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        } else {
          const parsedDate = new Date(estimatedDelivery);
          if (isNaN(parsedDate.getTime())) {
            estimatedDelivery = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
          } else {
            estimatedDelivery = parsedDate;
          }
        }
      } catch (dateError) {
        estimatedDelivery = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      }
    } else {
      estimatedDelivery = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    }

    // Find the user
    const User = require('../models/User');
    let userId = null;
    let user = null;
    
    if (metadata.user_id) {
      userId = metadata.user_id;
      user = await User.findById(userId);
    } else if (metadata.user_email) {
      user = await User.findOne({ email: metadata.user_email });
      if (user) {
        userId = user._id;
      }
    }

    // Create shipment in database - LOOKS LIKE A NORMAL SHIPMENT
    const Shipment = require('../models/Shipment');
    const shipment = new Shipment({
      user: userId,
      terminalShipmentId: terminalResponse.shipment_id,
      trackingNumber: terminalResponse.shipment_id,
      status: 'pending',
      proofOfWeightUrl: proofOfWeightUrl || null,
      proofOfOwnershipUrl: proofOfOwnershipUrl || null,
      sender: {
        name: metadata.sender_name || "Sender",
        email: metadata.user_email || metadata.sender_email,
        phone: metadata.sender_phone || "",
        address: metadata.sender_address || "",
        address2: metadata.sender_address2 || "",
        city: metadata.sender_city || "",
        state: metadata.sender_state || "",
        country: metadata.sender_country || "NG",
        zip: metadata.sender_zip || "",
      },
      receiver: {
        name: metadata.receiver_name || "Receiver",
        email: metadata.receiver_email || "",
        phone: metadata.receiver_phone || "",
        address: metadata.receiver_address || "",
        address2: metadata.receiver_address2 || "",
        city: metadata.receiver_city || "",
        state: metadata.receiver_state || "",
        country: metadata.receiver_country || "NG",
        zip: metadata.receiver_zip || "",
      },
      parcel: {
        weight: parseFloat(metadata.parcel_weight || 1),
        length: parseFloat(metadata.parcel_length || 10),
        width: parseFloat(metadata.parcel_width || 10),
        height: parseFloat(metadata.parcel_height || 10),
        items: metadata.items || [{
          description: metadata.parcel_description || "Package",
          quantity: 1,
          value: parseFloat(metadata.total_amount || 0),
          currency: "NGN",
          weight: parseFloat(metadata.parcel_weight || 1)
        }],
      },
      shipping: {
        carrier: terminalResponse.carrier || metadata.carrier || "QuickShip",
        carrier_name: terminalResponse.carrier_name || metadata.carrier_name || "QuickShip Carrier",
        service: metadata.service || "Standard",
        rate_id: rate_id,
        amount: terminalResponse.amount || parseFloat(metadata.total_amount || 0),
        currency: "NGN",
        estimated_delivery: estimatedDelivery,
      },
      payment: {
        // LOOKS LIKE A NORMAL PAID SHIPMENT
        status: "paid", // Use 'paid' to appear normal
        amount: terminalResponse.amount || parseFloat(metadata.total_amount || 0), // Keep the amount
        currency: "NGN",
        method: "admin_bypass", // This will show as payment method but users might not see it
        transactionId: `admin-${Date.now()}`,
        paidAt: new Date(),
        metadata: {
          // Hide admin info in metadata (users won't see this unless we expose it)
          admin_bypass: true,
          admin_id: adminId,
          admin_email: admin_info?.email,
        }
      },
      // Admin bypass tracking - hidden from regular queries
      adminBypass: {
        isBypass: true,
        adminId: adminId,
        adminEmail: admin_info?.email,
        bypassDate: new Date(),
        reason: "Admin created shipment without payment"
      }
    });

    await shipment.save();

    console.log('✅ Admin bypass shipment saved to database:', shipment._id);

    // Send normal-looking emails (optional)
    try {
      const emailController = require('./emailController');
      
      // Send to sender
      if (shipment.sender?.email) {
        await emailController.sendShipmentConfirmation(
          shipment.sender.email,
          shipment,
          user || { email: shipment.sender.email }
        );
      }
      
      // Send to receiver
      if (shipment.receiver?.email) {
        await emailController.sendReceiverShipmentNotification(
          shipment.receiver.email,
          shipment,
          user
        );
      }
      
      // Send admin notification (internal only)
      await emailController.sendAdminShipmentNotification(
        shipment,
        user || { email: shipment.sender.email },
        { reference: shipment.payment.transactionId }
      );
      
    } catch (emailError) {
      console.error('❌ Error sending emails:', emailError.message);
      // Don't fail the request
    }

    res.status(201).json({
      success: true,
      message: "Shipment created successfully",
      data: {
        shipment: {
          id: shipment._id,
          terminalShipmentId: shipment.terminalShipmentId,
          trackingNumber: shipment.trackingNumber,
          status: shipment.status,
          shipping: shipment.shipping,
          createdAt: shipment.createdAt,
        },
        terminal_africa: {
          shipment_id: terminalResponse.shipment_id,
          label_url: terminalResponse.label_url,
        }
      }
    });

  } catch (error) {
    console.error('❌ Error in admin create shipment bypass:', error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create shipment",
    });
  }
};

// @desc    Verify admin passcode
// @route   POST /api/admin/verify-passcode
// @access  Private (Admin only)
exports.verifyAdminPasscode = async (req, res) => {
  try {
    const { passcode } = req.body;
    
    // In production, store this in environment variables or database
    const ADMIN_PASSCODE = process.env.ADMIN_BYPASS_PASSCODE || '123456'; // Change this!
    
    if (passcode === ADMIN_PASSCODE) {
      return res.status(200).json({
        success: true,
        valid: true,
        message: "Passcode verified"
      });
    } else {
      return res.status(401).json({
        success: false,
        valid: false,
        message: "Invalid admin passcode"
      });
    }
  } catch (error) {
    console.error('❌ Error verifying admin passcode:', error);
    res.status(500).json({
      success: false,
      message: "Failed to verify passcode"
    });
  }
};



// @desc    Admin create address on Terminal Africa
// @route   POST /api/admin/shipments/address
// @access  Private (Admin only)
exports.adminCreateAddress = async (req, res) => {
  try {
    const addressData = req.body;
    console.log("📍 Admin creating address on Terminal Africa...");

    // Import the Terminal Africa service
    const terminalAfricaAPI = axios.create({
      baseURL: process.env.TERMINAL_AFRICA_BASE_URL || "https://api.terminal.africa/v1",
      headers: {
        Authorization: `Bearer ${process.env.TSHIP_SECRET_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      timeout: 60000,
    });

    const addressPayload = {
      name: addressData.name,
      email: addressData.email,
      phone: addressData.phone,
      address: addressData.address,
      address2: addressData.address2 || "",
      city: addressData.city,
      state: addressData.state,
      country: addressData.country || "NG",
      zip: addressData.zip || "",
      is_residential: addressData.is_residential !== false,
    };

    const response = await terminalAfricaAPI.post("/addresses", addressPayload);
    const terminalAddress = response.data.data;

    console.log("✅ Admin address created:", terminalAddress.address_id);

    res.status(201).json({
      success: true,
      message: "Address created successfully",
      data: {
        id: terminalAddress.address_id || terminalAddress.id,
        address_id: terminalAddress.address_id,
        name: terminalAddress.name || addressData.name,
      },
    });
  } catch (error) {
    console.error("❌ Error creating address:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Server error while creating address",
    });
  }
};

// @desc    Admin create parcel on Terminal Africa
// @route   POST /api/admin/shipments/parcel
// @access  Private (Admin only)
exports.adminCreateParcel = async (req, res) => {
  try {
    const parcelData = req.body;
    console.log("📦 Admin creating parcel on Terminal Africa...");

    const terminalAfricaAPI = axios.create({
      baseURL: process.env.TERMINAL_AFRICA_BASE_URL || "https://api.terminal.africa/v1",
      headers: {
        Authorization: `Bearer ${process.env.TSHIP_SECRET_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      timeout: 60000,
    });

    const items = parcelData.items.map((item) => ({
      description: item.description || item.name || "Item",
      name: item.name || item.description || "Item",
      currency: item.currency || "NGN",
      value: item.value || 0,
      weight: parseFloat(item.weight) || 0,
      quantity: parseInt(item.quantity) || 1,
    }));

    const parcelPayload = {
      description: parcelData.description || "Shipment parcel",
      weight: parseFloat(parcelData.weight) || 1.0,
      weight_unit: "kg",
      length: parseFloat(parcelData.length) || 10,
      width: parseFloat(parcelData.width) || 10,
      height: parseFloat(parcelData.height) || 10,
      dimension_unit: "cm",
      items: items,
    };

    const response = await terminalAfricaAPI.post("/parcels", parcelPayload);
    const terminalParcel = response.data.data;

    console.log("✅ Admin parcel created:", terminalParcel.parcel_id);

    res.status(201).json({
      success: true,
      message: "Parcel created successfully",
      data: {
        id: terminalParcel.parcel_id || terminalParcel.id,
        parcel_id: terminalParcel.parcel_id,
        weight: terminalParcel.weight,
      },
    });
  } catch (error) {
    console.error("❌ Error creating parcel:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Server error while creating parcel",
    });
  }
};

// @desc    Admin get shipping rates
// @route   POST /api/admin/shipments/rates
// @access  Private (Admin only)
// controllers/adminController.js - Fixed version

exports.adminGetShippingRates = async (req, res) => {
  try {
    const { address_from_id, address_to_id, parcel_id, weight } = req.body;
    const maxRetries = 4;
    let retryCount = 0;
    let rates = [];
    let lastError = null;
    let usedFallback = false;

    console.log("📊 Admin getting shipping rates for:", {
      address_from_id,
      address_to_id,
      parcel_id,
      weight: weight || 'not provided'
    });

    // Validate required fields
    if (!address_from_id || !address_to_id || !parcel_id) {
      return res.status(400).json({
        success: false,
        message: "Address from ID, address to ID, and parcel ID are required",
      });
    }

    const terminalAfricaAPI = axios.create({
      baseURL: process.env.TERMINAL_AFRICA_BASE_URL || "https://api.terminal.africa/v1",
      headers: {
        Authorization: `Bearer ${process.env.TSHIP_SECRET_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      timeout: 30000,
    });

    // First, verify that the addresses and parcel exist (optional but helpful)
    try {
      console.log("🔍 Verifying addresses and parcel exist...");
      
      const [addrFrom, addrTo, parcel] = await Promise.allSettled([
        terminalAfricaAPI.get(`/addresses/${address_from_id}`),
        terminalAfricaAPI.get(`/addresses/${address_to_id}`),
        terminalAfricaAPI.get(`/parcels/${parcel_id}`)
      ]);

      if (addrFrom.status === 'rejected') {
        console.warn("⚠️ Address FROM might be invalid:", addrFrom.reason?.message);
      } else {
        console.log("✅ Address FROM verified");
      }

      if (addrTo.status === 'rejected') {
        console.warn("⚠️ Address TO might be invalid:", addrTo.reason?.message);
      } else {
        console.log("✅ Address TO verified");
      }

      if (parcel.status === 'rejected') {
        console.warn("⚠️ Parcel might be invalid:", parcel.reason?.message);
      } else {
        console.log("✅ Parcel verified");
      }

    } catch (verifyError) {
      console.log("⚠️ Resource verification skipped:", verifyError.message);
      // Continue anyway, don't fail the request
    }

    // Retry logic for getting rates
    while (retryCount < maxRetries && rates.length === 0) {
      try {
        console.log(`🔄 Attempt ${retryCount + 1}/${maxRetries} to fetch rates...`);

        // Different strategies based on retry count
        let queryParams;
        
        if (retryCount === 0) {
          // First attempt: Standard parameters
          queryParams = {
            pickup_address: address_from_id,
            delivery_address: address_to_id,
            parcel_id: parcel_id,
            currency: "NGN",
            cash_on_delivery: false
          };
        } else if (retryCount === 1) {
          // Second attempt: Try without currency
          queryParams = {
            pickup_address: address_from_id,
            delivery_address: address_to_id,
            parcel_id: parcel_id,
            cash_on_delivery: false
          };
        } else if (retryCount === 2) {
          // Third attempt: Try with parcel as object (fallback)
          usedFallback = true;
          console.log("🔄 Attempt 3: Trying quotes endpoint...");
          
          try {
            const quotesResponse = await terminalAfricaAPI.post('/rates/shipment/quotes', {
              pickup_address: address_from_id,
              delivery_address: address_to_id,
              parcel: parcel_id,
              currency: "NGN"
            });
            rates = quotesResponse.data?.data || [];
            
            if (rates.length > 0) {
              console.log(`✅ Found ${rates.length} rates using quotes endpoint`);
              break;
            }
          } catch (quotesError) {
            console.log("⚠️ Quotes endpoint failed:", quotesError.message);
          }
          
          // If quotes endpoint failed, continue with regular params
          queryParams = {
            pickup_address: address_from_id,
            delivery_address: address_to_id,
            parcel_id: parcel_id,
          };
        } else {
          // Fourth attempt: Minimal parameters
          queryParams = {
            pickup_address: address_from_id,
            delivery_address: address_to_id,
            parcel_id: parcel_id,
          };
        }

        // Only make the request if we haven't already gotten rates from quotes
        if (!usedFallback || rates.length === 0) {
          const queryString = new URLSearchParams(queryParams).toString();
          console.log(`📡 Request URL: /rates/shipment?${queryString}`);
          
          const response = await terminalAfricaAPI.get(`/rates/shipment?${queryString}`);
          rates = response.data?.data || [];
        }

        if (rates.length > 0) {
          console.log(`✅ Found ${rates.length} rates on attempt ${retryCount + 1}`);
          break;
        } else {
          console.log(`⚠️ No rates found on attempt ${retryCount + 1}`);
          
          // Add delay before next retry (exponential backoff)
          if (retryCount < maxRetries - 1) {
            const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
            console.log(`⏳ Waiting ${delay/1000}s before next attempt...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }

        retryCount++;

      } catch (error) {
        lastError = error;
        console.error(`❌ Attempt ${retryCount + 1} failed:`, error.message);
        
        retryCount++;
        
        // Add delay before next retry if not last attempt
        if (retryCount < maxRetries) {
          const delay = Math.pow(2, retryCount) * 1000;
          console.log(`⏳ Waiting ${delay/1000}s before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // If still no rates, try one last approach - get available carriers
    if (rates.length === 0) {
      console.log("⚠️ No rates available after all retries");
      
      // Try to get available carriers for debugging
      try {
        console.log("🔍 Fetching available carriers for debugging...");
        const carriersResponse = await terminalAfricaAPI.get("/carriers");
        const carriers = carriersResponse.data?.data || [];
        console.log("📋 Available carriers:", carriers.map(c => c.name).join(', '));
        
      } catch (carrierError) {
        console.log("❌ Could not fetch carriers:", carrierError.message);
      }

      // Return empty array with helpful message
      return res.status(200).json({
        success: true,
        message: "No shipping rates available for this route at this time",
        data: [],
        metadata: {
          address_from_id,
          address_to_id,
          parcel_id,
          attempts: retryCount,
          max_retries: maxRetries,
          note: "No carriers available for this route. Try different addresses or contact support.",
          timestamp: new Date().toISOString()
        }
      });
    }

    // Format rates for frontend - FIXED: Removed shipmentFormData reference
    const formattedRates = rates.map((rate) => {
      // Calculate service fee using weight from request body
      const originalAmount = rate.amount || 0;
      const parcelWeight = parseFloat(weight) || 0;
      let serviceFeePercentage = 25;

      if (parcelWeight > 0 && parcelWeight < 1) serviceFeePercentage = 4.5;
      else if (parcelWeight >= 1 && parcelWeight <= 12) serviceFeePercentage = 6;
      else if (parcelWeight >= 13 && parcelWeight <= 24) serviceFeePercentage = 3.5;
      else if (parcelWeight >= 25 && parcelWeight <= 40) serviceFeePercentage = 3;
      else if (parcelWeight >= 41 && parcelWeight <= 50) serviceFeePercentage = 2.8;
      else if (parcelWeight >= 51 && parcelWeight <= 70) serviceFeePercentage = 2.5;
      else if (parcelWeight >= 71) serviceFeePercentage = 2.2;

      const serviceFeeAmount = (originalAmount * serviceFeePercentage) / 100;
      const totalAmount = originalAmount + serviceFeeAmount + 6200;

      return {
        rate_id: rate.rate_id || rate.id,
        id: rate.rate_id || rate.id,
        carrier_id: rate.carrier_id,
        carrier_name: rate.carrier_name,
        carrier_logo: rate.carrier_logo,
        service: rate.carrier_rate_description || rate.service_name || "Standard Delivery",
        amount: rate.amount || 0,
        original_amount: originalAmount,
        total_amount: totalAmount,
        service_fee_percentage: serviceFeePercentage,
        service_fee_amount: serviceFeeAmount,
        currency: rate.currency || "NGN",
        estimated_delivery: rate.delivery_time || "3-5 business days",
        delivery_time: rate.delivery_time,
        includes_insurance: rate.includes_insurance || false,
      };
    });

    // Sort by total amount (lowest first)
    formattedRates.sort((a, b) => a.total_amount - b.total_amount);

    console.log(`✅ Returning ${formattedRates.length} formatted rates after ${retryCount} attempts`);

    res.status(200).json({
      success: true,
      message: `Found ${formattedRates.length} shipping rates`,
      data: formattedRates,
      metadata: {
        attempts: retryCount,
        max_retries: maxRetries,
        used_fallback: usedFallback,
        total_rates: formattedRates.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("❌ Error in adminGetShippingRates:", {
      message: error.message,
      stack: error.stack,
      response: error.response?.data
    });

    // FIXED: retryCount is now in scope
    const attempts = typeof retryCount !== 'undefined' ? retryCount : 0;

    res.status(500).json({
      success: false,
      message: error.message || "Failed to get shipping rates",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      metadata: {
        attempts: attempts,
        max_retries: 4,
        timestamp: new Date().toISOString()
      }
    });
  }
};