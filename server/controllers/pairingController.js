const crypto = require("crypto");
const PairingCode = require("../models/PairingCode");
const Device = require("../models/Device");
const Parent = require("../models/Parent");

function generatePairingCode() {
  //6 digits is easy to type; you can do 8 if you prefer
  return String(Math.floor(100000 + Math.random() * 900000));
}

function generateDeviceToken() {
  //10 hex uppercase 
  return crypto.randomBytes(5).toString("hex").toUpperCase();
}

//parent-only: create a new pairing code (TTL)
async function createPairingCode(req, res) {
  const parentId = req.parent._id;
  const { deviceName = "" } = req.body || {};

  try {
    //TTL: 10 minutes (adjust)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    //ensure code uniqueness
    let code;
    for (let i = 0; i < 5; i++) {
      code = generatePairingCode();
      const exists = await PairingCode.findOne({ code });
      if (!exists) break;
      code = null;
    }
    if (!code) return res.status(500).json({ error: "Failed to generate unique pairing code" });

    const doc = await PairingCode.create({ code, parentId, deviceName, expiresAt });

    return res.status(201).json({
      code: doc.code,
      expiresAt: doc.expiresAt,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

//extension: exchange code -> create/link device -> return deviceToken/deviceId
async function pairDevice(req, res) {
  const { code, deviceName = "" } = req.body || {};
  if (!code) return res.status(400).json({ error: "Missing pairing code" });

  try {
    const pairing = await PairingCode.findOne({ code });

    if (!pairing) return res.status(404).json({ error: "Invalid pairing code" });
    if (pairing.usedAt) return res.status(409).json({ error: "Pairing code already used" });
    if (pairing.expiresAt < new Date()) return res.status(410).json({ error: "Pairing code expired" });

    //create device under the parent
    const deviceToken = generateDeviceToken();
    const nameToUse = deviceName || pairing.deviceName || "Child device";

    const device = await Device.create({
      name: nameToUse,
      parentId: pairing.parentId,
      deviceToken,
      lastSeenAt: new Date()
    });

    //parent.devices.push(device._id);
    await Parent.findByIdAndUpdate(pairing.parentId, { $push: { devices: device._id } });

    pairing.usedAt = new Date();
    pairing.usedByDeviceId = device._id;
    await pairing.save();

    return res.status(200).json({
      deviceId: device._id,
      deviceToken: device.deviceToken,
      name: device.name
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = { createPairingCode, pairDevice };
