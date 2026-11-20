const express = require("express");
const router = express.Router();

const {
    getUserAnalytics,
    getUsersWithStats
} = require("../controllers/analyticsController");

router.get("/users/:id/getUserAnalytics", getUserAnalytics);
router.get("/users/getUsersWithStats", getUsersWithStats);

module.exports = router;