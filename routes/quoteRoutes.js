const express = require("express");
const router = express.Router();
const { getQuoteRates } = require("../controllers/quoteController");

router.post("/get", getQuoteRates);

module.exports = router;
