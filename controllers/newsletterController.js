// controllers/newsletterController.js
const Newsletter = require("../models/Newsletter");
const { Parser } = require('json2csv'); // You'll need to install: npm install json2csv

// Subscribe to newsletter
const subscribeNewsletter = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ msg: "Email is required" });
    }

    // Check if already subscribed
    const existing = await Newsletter.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ msg: "You are already subscribed!" });
    }

    const newSubscriber = new Newsletter({ email });
    await newSubscriber.save();

    res.status(201).json({ 
      success: true,
      msg: "Successfully subscribed to newsletter!" 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error. Please try again later." });
  }
};

// Get all newsletter subscribers
const getNewsletterSubscribers = async (req, res) => {
  try {
    const subscribers = await Newsletter.find({})
      .sort({ subscribedAt: -1 })
      .select('email subscribedAt');
    
    res.status(200).json({
      success: true,
      data: subscribers
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error. Please try again later." });
  }
};

// Download newsletter subscribers as CSV
const downloadNewsletterCSV = async (req, res) => {
  try {
    // Fetch all subscribers
    const subscribers = await Newsletter.find({})
      .sort({ subscribedAt: -1 })
      .select('email subscribedAt');

    if (!subscribers || subscribers.length === 0) {
      return res.status(404).json({ msg: "No subscribers found" });
    }

    // Format data for CSV
    const formattedData = subscribers.map(sub => ({
      Email: sub.email,
      'Subscribed Date': new Date(sub.subscribedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      'Subscribed Time': new Date(sub.subscribedAt).toLocaleTimeString('en-US'),
      ID: sub._id.toString()
    }));

    // Create CSV using json2csv
    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(formattedData);

    // Set headers for file download
    const filename = `newsletter-subscribers-${new Date().toISOString().split('T')[0]}.csv`;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', Buffer.byteLength(csv));
    
    res.status(200).send(csv);
  } catch (error) {
    console.error("Error downloading subscribers:", error);
    res.status(500).json({ msg: "Server error. Please try again later." });
  }
};

// Get newsletter statistics
const getNewsletterStats = async (req, res) => {
  try {
    const totalSubscribers = await Newsletter.countDocuments();
    
    // Get subscribers from this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const newThisMonth = await Newsletter.countDocuments({
      subscribedAt: { $gte: startOfMonth }
    });

    // Get subscribers from today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const newToday = await Newsletter.countDocuments({
      subscribedAt: { $gte: startOfDay }
    });

    // Get last 7 days growth
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const count = await Newsletter.countDocuments({
        subscribedAt: { $gte: date, $lt: nextDate }
      });
      
      last7Days.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        count
      });
    }

    // Calculate growth rate (compare last 30 days with previous 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    
    const last30Days = await Newsletter.countDocuments({
      subscribedAt: { $gte: thirtyDaysAgo }
    });
    
    const previous30Days = await Newsletter.countDocuments({
      subscribedAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }
    });
    
    const growthRate = previous30Days > 0 
      ? ((last30Days - previous30Days) / previous30Days * 100).toFixed(1)
      : 100;

    res.status(200).json({
      success: true,
      data: {
        totalSubscribers,
        newThisMonth,
        newToday,
        growthRate: parseFloat(growthRate),
        last7Days,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Error fetching newsletter stats:", error);
    res.status(500).json({ msg: "Server error. Please try again later." });
  }
};

// Delete subscriber (admin only)
const deleteSubscriber = async (req, res) => {
  try {
    const { id } = req.params;
    
    const subscriber = await Newsletter.findByIdAndDelete(id);
    
    if (!subscriber) {
      return res.status(404).json({ msg: "Subscriber not found" });
    }

    res.status(200).json({
      success: true,
      msg: "Subscriber deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting subscriber:", error);
    res.status(500).json({ msg: "Server error. Please try again later." });
  }
};

module.exports = {
  subscribeNewsletter,
  getNewsletterSubscribers,
  downloadNewsletterCSV,
  getNewsletterStats,
  deleteSubscriber
};