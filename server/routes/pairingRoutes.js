const express = require("express");
const router = express.Router();

const requireAuth = require("../middleware/requireAuth");
const { createPairingCode, pairDevice } = require("../controllers/pairingController");

//parent generates pairing code (protected)
router.post("/code", requireAuth, createPairingCode);

//extension exchanges code for token/deviceId (public)
router.post("/pair", pairDevice);

module.exports = router;
