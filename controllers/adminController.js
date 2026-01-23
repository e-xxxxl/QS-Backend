const User = require('../models/User');
const Shipment = require('../models/Shipment');

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
    ).populate('user', 'firstName lastName email');
    
    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found'
      });
    }
    
    // Here you could add notification logic (email, SMS, etc.)
    
    res.status(200).json({
      success: true,
      message: `Shipment status updated to ${status}`,
      data: { shipment }
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