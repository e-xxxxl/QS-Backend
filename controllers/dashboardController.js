const mongoose = require('mongoose');
const Shipment = require('../models/Shipment');
const User = require('../models/User');

// @desc    Get dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private
exports.getDashboardStats = async (req, res) => {
  try {
    const userId = req.user._id;
    
    console.log('📊 Fetching dashboard stats for user:', userId);

    // Get all shipment statistics in one aggregation
    const stats = await Shipment.aggregate([
      { $match: { user: userId } },
      {
        $facet: {
          // Basic counts
          statusCounts: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                delivered: { 
                  $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
                },
                inTransit: { 
                  $sum: { $cond: [{ $eq: ['$status', 'in_transit'] }, 1, 0] }
                },
                pending: { 
                  $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
                },
                cancelled: { 
                  $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
                },
                draft: { 
                  $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] }
                }
              }
            }
          ],
          
          // Payment statistics
          paymentStats: [
            {
              $group: {
                _id: null,
                totalSpent: { $sum: '$shipping.amount' },
                paidCount: { 
                  $sum: { $cond: [{ $eq: ['$payment.status', 'paid'] }, 1, 0] }
                },
                pendingPayment: { 
                  $sum: { $cond: [{ $eq: ['$payment.status', 'pending'] }, 1, 0] }
                }
              }
            }
          ],
          
          // Monthly breakdown (last 6 months)
          monthlyStats: [
            {
              $group: {
                _id: {
                  year: { $year: '$createdAt' },
                  month: { $month: '$createdAt' }
                },
                count: { $sum: 1 },
                amount: { $sum: '$shipping.amount' }
              }
            },
            { $sort: { '_id.year': -1, '_id.month': -1 } },
            { $limit: 6 }
          ],
          
          // Carrier breakdown
          carrierStats: [
            {
              $group: {
                _id: '$shipping.carrier_name',
                count: { $sum: 1 },
                totalAmount: { $sum: '$shipping.amount' }
              }
            },
            { $sort: { count: -1 } },
            { $limit: 5 }
          ],
          
          // Recent activity (last 30 days)
          recentActivity: [
            {
              $match: {
                createdAt: { 
                  $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
                }
              }
            },
            {
              $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                count: { $sum: 1 }
              }
            },
            { $sort: { _id: -1 } },
            { $limit: 7 }
          ]
        }
      }
    ]);

    // Get user info
    const user = await User.findById(userId).select('firstName lastName email phoneNumber createdAt');

    // Format the response
    const statusData = stats[0]?.statusCounts[0] || {
      total: 0,
      delivered: 0,
      inTransit: 0,
      pending: 0,
      cancelled: 0,
      draft: 0
    };

    const paymentData = stats[0]?.paymentStats[0] || {
      totalSpent: 0,
      paidCount: 0,
      pendingPayment: 0
    };

    // Calculate success rate
    const successRate = statusData.total > 0 
      ? Math.round((statusData.delivered / statusData.total) * 100)
      : 0;

    // Calculate average shipment value
    const avgShipmentValue = statusData.total > 0
      ? paymentData.totalSpent / statusData.total
      : 0;

    res.status(200).json({
      success: true,
      message: 'Dashboard statistics retrieved successfully',
      data: {
        overview: {
          totalShipments: statusData.total,
          delivered: statusData.delivered,
          inTransit: statusData.inTransit,
          pending: statusData.pending,
          cancelled: statusData.cancelled,
          draft: statusData.draft,
          successRate: successRate,
          avgDeliveryTime: '3-5 days' // You can calculate this from actual data
        },
        financial: {
          totalSpent: paymentData.totalSpent,
          paidShipments: paymentData.paidCount,
          pendingPayments: paymentData.pendingPayment,
          avgShipmentValue: avgShipmentValue.toFixed(2)
        },
        monthlyData: stats[0]?.monthlyStats?.map(item => ({
          month: `${item._id.year}-${item._id.month.toString().padStart(2, '0')}`,
          count: item.count,
          amount: item.amount
        })) || [],
        carriers: stats[0]?.carrierStats?.map(item => ({
          name: item._id || 'Unknown',
          count: item.count,
          percentage: Math.round((item.count / statusData.total) * 100) || 0
        })) || [],
        recentActivity: stats[0]?.recentActivity || [],
        user: {
          name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'User',
          email: user?.email,
          phone: user?.phoneNumber,
          memberSince: user?.createdAt
        },
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error fetching dashboard stats:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get recent shipments with pagination
// @route   GET /api/shipments/recent
// @access  Private
exports.getRecentShipments = async (req, res) => {
  try {
    const userId = req.user._id;
    const { 
      page = 1, 
      limit = 10, 
      status, 
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    console.log('📦 Fetching recent shipments for user:', userId);

    // Build query
    const query = { user: userId };
    
    // Filter by status if provided
    if (status && status !== 'all') {
      query.status = status;
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Calculate skip for pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get shipments with pagination
    const shipments = await Shipment.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .select('trackingNumber status createdAt updatedAt shipping.carrier_name shipping.service shipping.amount shipping.currency shipping.estimated_delivery sender.name sender.city receiver.name receiver.city payment.status')
      .lean();

    // Get total count for pagination
    const total = await Shipment.countDocuments(query);

    // Format shipments for frontend
    const formattedShipments = shipments.map(shipment => {
      // Determine status color and icon
      let statusColor = 'gray';
      let statusIcon = '📦';
      
      switch (shipment.status) {
        case 'delivered':
          statusColor = 'green';
          statusIcon = '✅';
          break;
        case 'in_transit':
          statusColor = 'blue';
          statusIcon = '🚚';
          break;
        case 'pending':
          statusColor = 'yellow';
          statusIcon = '⏳';
          break;
        case 'cancelled':
          statusColor = 'red';
          statusIcon = '❌';
          break;
      }

      // Format dates
      const createdAt = new Date(shipment.createdAt);
      const formattedDate = createdAt.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      const formattedTime = createdAt.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });

      return {
        id: shipment._id.toString(),
        trackingNumber: shipment.trackingNumber || `SHIP-${shipment._id.toString().substring(0, 8).toUpperCase()}`,
        status: shipment.status,
        statusText: shipment.status.replace('_', ' ').toUpperCase(),
        statusColor,
        statusIcon,
        createdAt: shipment.createdAt,
        formattedDate: `${formattedDate} at ${formattedTime}`,
        carrier: shipment.shipping?.carrier_name || 'Unknown Carrier',
        service: shipment.shipping?.service || 'Standard',
        amount: shipment.shipping?.amount || 0,
        currency: shipment.shipping?.currency || 'NGN',
        estimatedDelivery: shipment.shipping?.estimated_delivery 
          ? new Date(shipment.shipping.estimated_delivery).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric'
            })
          : 'Pending',
        paymentStatus: shipment.payment?.status || 'pending',
        sender: {
          name: shipment.sender?.name || 'Unknown',
          city: shipment.sender?.city || 'Unknown'
        },
        receiver: {
          name: shipment.receiver?.name || 'Unknown',
          city: shipment.receiver?.city || 'Unknown'
        },
        route: `${shipment.sender?.city || 'Unknown'} → ${shipment.receiver?.city || 'Unknown'}`
      };
    });

    res.status(200).json({
      success: true,
      message: 'Recent shipments retrieved successfully',
      data: {
        shipments: formattedShipments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
          hasNextPage: (parseInt(page) * parseInt(limit)) < total,
          hasPrevPage: parseInt(page) > 1
        },
        filters: {
          status: status || 'all',
          sortBy,
          sortOrder
        },
        summary: {
          total,
          delivered: await Shipment.countDocuments({ ...query, status: 'delivered' }),
          inTransit: await Shipment.countDocuments({ ...query, status: 'in_transit' }),
          pending: await Shipment.countDocuments({ ...query, status: 'pending' })
        }
      }
    });

  } catch (error) {
    console.error('❌ Error fetching recent shipments:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent shipments',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get quick stats (lightweight version for dashboard)
// @route   GET /api/dashboard/quick-stats
// @access  Private
exports.getQuickStats = async (req, res) => {
  try {
    const userId = req.user._id;
    
    console.log('⚡ Fetching quick stats for user:', userId);

    // Get counts in parallel for better performance
    const [total, delivered, inTransit, pending, totalSpent] = await Promise.all([
      Shipment.countDocuments({ user: userId }),
      Shipment.countDocuments({ user: userId, status: 'delivered' }),
      Shipment.countDocuments({ user: userId, status: 'in_transit' }),
      Shipment.countDocuments({ user: userId, status: 'pending' }),
      Shipment.aggregate([
        { $match: { user: userId } },
        { $group: { _id: null, total: { $sum: '$shipping.amount' } } }
      ])
    ]);

    // Get today's shipments
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todaysShipments = await Shipment.countDocuments({
      user: userId,
      createdAt: { $gte: today }
    });

    // Get this month's shipments
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const thisMonthsShipments = await Shipment.countDocuments({
      user: userId,
      createdAt: { $gte: firstDayOfMonth }
    });

    // Get top carrier
    const topCarrier = await Shipment.aggregate([
      { $match: { user: userId } },
      { $group: { _id: '$shipping.carrier_name', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 }
    ]);

    res.status(200).json({
      success: true,
      message: 'Quick stats retrieved successfully',
      data: {
        total,
        delivered,
        inTransit,
        pending,
        totalSpent: totalSpent[0]?.total || 0,
        todaysShipments,
        thisMonthsShipments,
        topCarrier: topCarrier[0]?._id || 'None',
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error fetching quick stats:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quick stats',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get shipment activity timeline
// @route   GET /api/dashboard/activity
// @access  Private
exports.getShipmentActivity = async (req, res) => {
  try {
    const userId = req.user._id;
    const { days = 7 } = req.query;

    console.log('📈 Fetching shipment activity for user:', userId);

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const activity = await Shipment.aggregate([
      {
        $match: {
          user: userId,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          count: { $sum: 1 },
          totalAmount: { $sum: "$shipping.amount" },
          statuses: {
            $push: "$status"
          }
        }
      },
      {
        $project: {
          date: "$_id",
          count: 1,
          totalAmount: 1,
          delivered: {
            $size: {
              $filter: {
                input: "$statuses",
                as: "status",
                cond: { $eq: ["$$status", "delivered"] }
              }
            }
          },
          inTransit: {
            $size: {
              $filter: {
                input: "$statuses",
                as: "status",
                cond: { $eq: ["$$status", "in_transit"] }
              }
            }
          },
          pending: {
            $size: {
              $filter: {
                input: "$statuses",
                as: "status",
                cond: { $eq: ["$$status", "pending"] }
              }
            }
          }
        }
      },
      { $sort: { date: 1 } }
    ]);

    // Fill missing dates
    const filledActivity = [];
    const currentDate = new Date(startDate);
    const today = new Date();
    
    while (currentDate <= today) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const existing = activity.find(item => item.date === dateStr);
      
      filledActivity.push({
        date: dateStr,
        count: existing?.count || 0,
        totalAmount: existing?.totalAmount || 0,
        delivered: existing?.delivered || 0,
        inTransit: existing?.inTransit || 0,
        pending: existing?.pending || 0
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    res.status(200).json({
      success: true,
      message: 'Shipment activity retrieved successfully',
      data: {
        activity: filledActivity,
        period: `${days} days`,
        totalInPeriod: filledActivity.reduce((sum, day) => sum + day.count, 0),
        amountInPeriod: filledActivity.reduce((sum, day) => sum + day.totalAmount, 0)
      }
    });

  } catch (error) {
    console.error('❌ Error fetching shipment activity:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch shipment activity',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};