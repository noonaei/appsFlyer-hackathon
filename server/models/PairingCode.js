const mongoose = require("mongoose");

const pairingCodeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: "Parent", required: true, index: true },
    deviceName: { type: String, default: "" },

    usedAt: { type: Date, default: null },
    usedByDeviceId: { type: mongoose.Schema.Types.ObjectId, ref: "Device", default: null },

    expiresAt: { type: Date, required: true, index: true }
  },
  { timestamps: true }
);

//TTL index (Mongo will auto-delete expired docs)
pairingCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("PairingCode", pairingCodeSchema);
