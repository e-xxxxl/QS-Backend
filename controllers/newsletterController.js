const Newsletter = require("../models/Newsletter");

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

    res.status(201).json({ msg: "Successfully subscribed to newsletter!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error. Please try again later." });
  }
};

module.exports = { subscribeNewsletter };