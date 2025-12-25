const Device = require('../models/Device')
const EventSignal = require('../models/EventSignal')
const mongoose = require('mongoose')

const getSignalsByDevice = async (req, res) => {
    
  const { deviceId } = req.params

  if (!mongoose.Types.ObjectId.isValid(deviceId)) {
    return res.status(404).json({ error: 'No such device' })
  }

  try {
    const history = await EventSignal.find({ deviceId: deviceId }).sort({ createdAt: -1 })
    res.status(200).json(history)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}

const saveSignals = async (req, res) => {
  const { deviceToken, platform, signals } = req.body

  try {
    const device = await Device.findOne({ deviceToken: deviceToken })

    if (!device) {
      return res.status(404).json({ error: 'Device token is invalid' })
    }

    const newSignalBatch = await EventSignal.create({
      deviceId: device._id,
      platform,
      signals
    })

    res.status(200).json(newSignalBatch)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}

module.exports = {
  getSignalsByDevice,
  saveSignals
}