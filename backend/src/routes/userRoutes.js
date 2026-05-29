const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const { getUsers } = require("../controllers/userController");

router.get("/", authMiddleware, getUsers);

module.exports = router;