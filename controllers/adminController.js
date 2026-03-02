const User = require('../models/User');
const Shipment = require('../models/Shipment');
const { Resend } = require('resend');

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

  // Status badge color mapping
  const statusColors = {
    draft: '#6c757d',
    pending: '#ffc107',
    processing: '#17a2b8',
    in_transit: '#007bff',
    delivered: '#28a745',
    cancelled: '#dc3545',
    exception: '#fd7e14'
  };

  const greeting = recipientType === 'sender' 
    ? `Hello ${shipment.user?.firstName || 'Valued Customer'},`
    : `Hello ${shipment.receiver?.name || 'Valued Customer'},`;

  return {
    subject: `Shipment Status Update: ${shipment.trackingNumber} - ${status.replace('_', ' ').toUpperCase()}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Shipment Status Update</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #1a1a1a;
            background-color: #f5f5f5;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .card {
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          .header {
            background-color: #1a1a1a;
            padding: 32px 24px;
            text-align: center;
            border-bottom: 3px solid #e0e0e0;
          }
          .header h1 {
            color: #ffffff;
            font-size: 24px;
            margin-bottom: 8px;
            font-weight: 500;
            letter-spacing: 0.5px;
          }
          .header p {
            color: #cccccc;
            font-size: 14px;
          }
          .content {
            padding: 32px 24px;
          }
          .greeting {
            font-size: 16px;
            margin-bottom: 24px;
            color: #333333;
          }
          .status-section {
            text-align: center;
            margin: 24px 0;
          }
          .status-badge {
            display: inline-block;
            padding: 8px 20px;
            background-color: ${statusColors[status] || '#6c757d'};
            color: #ffffff;
            border-radius: 4px;
            font-weight: 600;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .message {
            font-size: 16px;
            color: #4a4a4a;
            margin: 24px 0;
            padding: 16px;
            background-color: #f8f9fa;
            border-radius: 4px;
            border-left: 3px solid ${statusColors[status] || '#6c757d'};
          }
          .tracking-number {
            font-size: 20px;
            font-weight: 600;
            color: #1a1a1a;
            letter-spacing: 1px;
            margin: 16px 0;
            text-align: center;
            padding: 12px;
            background-color: #f8f9fa;
            border-radius: 4px;
            font-family: monospace;
          }
          .shipment-details {
            background-color: #ffffff;
            padding: 24px;
            border-radius: 4px;
            margin: 24px 0;
            border: 1px solid #e0e0e0;
          }
          .shipment-details h3 {
            color: #1a1a1a;
            font-size: 18px;
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 1px solid #e0e0e0;
            font-weight: 500;
          }
          .detail-row {
            display: flex;
            margin-bottom: 12px;
            padding: 4px 0;
          }
          .detail-label {
            width: 120px;
            font-weight: 600;
            color: #666666;
            font-size: 14px;
          }
          .detail-value {
            flex: 1;
            color: #1a1a1a;
            font-size: 14px;
          }
          .info-box {
            background-color: #f8f9fa;
            border-radius: 4px;
            padding: 20px;
            margin: 24px 0;
            border: 1px solid #e0e0e0;
          }
          .info-box p {
            color: #4a4a4a;
            margin-bottom: 8px;
            font-size: 14px;
          }
          .info-box strong {
            color: #1a1a1a;
            font-weight: 600;
          }
          .button-container {
            text-align: center;
            margin: 32px 0 16px;
          }
          .button {
            display: inline-block;
            padding: 12px 32px;
            background-color: #1a1a1a;
            color: #ffffff;
            text-decoration: none;
            border-radius: 4px;
            font-weight: 500;
            font-size: 14px;
            letter-spacing: 0.5px;
            border: 1px solid #1a1a1a;
          }
          .button:hover {
            background-color: #333333;
          }
          .footer {
            text-align: center;
            padding: 24px;
            background-color: #f8f9fa;
            border-top: 1px solid #e0e0e0;
          }
          .footer p {
            color: #666666;
            font-size: 12px;
            margin-bottom: 4px;
            line-height: 1.5;
          }
          .footer .company-name {
            font-weight: 600;
            color: #1a1a1a;
            margin-bottom: 8px;
          }
          .footer .address {
            color: #666666;
            margin-bottom: 12px;
          }
          .footer .note {
            color: #999999;
            font-style: italic;
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid #e0e0e0;
          }
          hr {
            border: none;
            border-top: 1px solid #e0e0e0;
            margin: 24px 0;
          }
          @media only screen and (max-width: 600px) {
            .container { padding: 10px; }
            .content { padding: 24px 16px; }
            .detail-row { 
              flex-direction: column; 
              margin-bottom: 16px;
            }
            .detail-label { 
              width: 100%; 
              margin-bottom: 4px;
              font-size: 13px;
            }
            .detail-value {
              font-size: 15px;
            }
            .header {
              padding: 24px 16px;
            }
            .header h1 {
              font-size: 20px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="header">
              <h1>Shipment Status Update</h1>
              <p>Tracking Number: ${shipment.trackingNumber}</p>
            </div>
            
            <div class="content">
              <div class="greeting">
                ${greeting}
              </div>
              
              <div class="status-section">
                <span class="status-badge">
                  ${status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              
              <div class="message">
                <strong>${statusMessages[status] || 'Your shipment status has been updated'}</strong>
              </div>
              
              <div class="tracking-number">
                ${shipment.trackingNumber}
              </div>
              
              <div class="shipment-details">
                <h3>Shipment Details</h3>
                
                <div class="detail-row">
                  <span class="detail-label">Current Status:</span>
                  <span class="detail-value"><strong>${status.replace('_', ' ').toUpperCase()}</strong></span>
                </div>
                
                <div class="detail-row">
                  <span class="detail-label">Status Details:</span>
                  <span class="detail-value">${statusDescriptions[status] || 'Your shipment status has been updated.'}</span>
                </div>
                
                <div class="detail-row">
                  <span class="detail-label">Last Updated:</span>
                  <span class="detail-value">${new Date().toLocaleString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true
                  })}</span>
                </div>
                
                ${shipment.origin?.address ? `
                <div class="detail-row">
                  <span class="detail-label">Origin:</span>
                  <span class="detail-value">${shipment.origin.address}</span>
                </div>
                ` : ''}
                
                ${shipment.destination?.address ? `
                <div class="detail-row">
                  <span class="detail-label">Destination:</span>
                  <span class="detail-value">${shipment.destination.address}</span>
                </div>
                ` : ''}
                
                ${shipment.estimatedDelivery ? `
                <div class="detail-row">
                  <span class="detail-label">Est. Delivery:</span>
                  <span class="detail-value">${new Date(shipment.estimatedDelivery).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</span>
                </div>
                ` : ''}
              </div>
              
              <div class="info-box">
                <p><strong>What's Next?</strong></p>
                ${status === 'in_transit' ? 
                  '<p>Your shipment is in transit. You can track its progress in real-time using the tracking button below.</p>' : 
                  status === 'delivered' ?
                  '<p>Your shipment has been delivered. Thank you for choosing our services.</p>' :
                  status === 'exception' ?
                  '<p>Please contact our customer support team for assistance with this shipment.</p>' :
                  '<p>You will receive another notification when the status updates.</p>'
                }
              </div>
              
              <div class="button-container">
                <a href="${process.env.FRONTEND_URL}/track/${shipment.trackingNumber}" class="button">
                  Track Your Shipment
                </a>
              </div>
              
              <hr>
              
              <p style="text-align: center; margin: 16px 0 0; color: #666666; font-size: 13px;">
                Need assistance? Contact our support team at 
                <a href="mailto:info@quickship.africa" style="color: #1a1a1a; text-decoration: underline;">support@quickshipafrica.com</a>
              </p>
            </div>
            
            <div class="footer">
              <p class="company-name">QuickShipAfrica</p>
              <p class="address">Suits 11, No 20 African church street, College road, Ogba, Lagos, Nigeria</p>
              <p>Phone: +234-91-2960-1397</p>
              <p>Email: info@quickship.africa</p>
              <p>Website: www.quickship.africa</p>
              <p class="note">
                This is an automated message from QuickShipAfrica. Please do not reply to this email. 
                For inquiries, please contact our customer support team.
              </p>
              <p style="margin-top: 16px;">© ${new Date().getFullYear()} QuickShipAfrica. All rights reserved.</p>
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