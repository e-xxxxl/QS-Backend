// routes/locationsRoutes.js
const express = require("express");
const router = express.Router();
const {
  getCountries,
  getStates,
  getCities,
} = require("../controllers/locationsController");

router.get("/countries", getCountries);
router.get("/states", getStates);
router.get("/cities", getCities);

module.exports = router;