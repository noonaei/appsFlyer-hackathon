const Device = require('../models/Device')
const EventSignal = require('../models/EventSignal')
const mongoose = require('mongoose')

const getSignalsLast5Days = async (req, res) => {

  const { deviceId } = req.params
  const parentId = req.parent._id

  if (!mongoose.Types.ObjectId.isValid(deviceId)) {
    return res.status(404).json({ error: 'No such device' })
  }

  const fiveDaysAgo = new Date()
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5)
  try {
    // Verify that the device belongs to the authenticated parent
    const device = await Device.findOne({ _id: deviceId, parentId })
    if (!device) {
      return res.status(403).json({ error: 'Unauthorized access to this device' })
    }
    const history = await EventSignal.aggregate([
      // Stage 1: Filter documents by deviceId
      {
        $match: {
          deviceId: new mongoose.Types.ObjectId(deviceId)
        }
      },
      // Stage 2: Deconstruct the 'signals' array into individual documents for processing
      { $unwind: "$signals" },
      // Stage 3: Filter individual signals based on the custom timestamp field
      {
        $match: {
          "signals.timestamp": { $gte: fiveDaysAgo }
        }
      },
      // Stage 4: Grouping logic to merge identical activities and count occurrences
      {
        $group: {
          _id: {
            label: "$signals.label",
            platform: "$platform",
            kind: "$signals.kind"
          },
          // Count total occurrences within the time frame
          occurrenceCount: { $sum: 1 },
          // List unique creators for this specific label/platform combo
          creators: { $addToSet: "$signals.creator" }
        }
      },
      // Stage 5: Formatting the output for AI readability (JSON)
      {
        $project: {
          _id: 0,
          label: "$_id.label",
          platform: "$_id.platform",
          kind: "$_id.kind",
          creators: 1,
          occurrenceCount: 1
        }
      },

      // Stage 6: Sort by most frequent events first
      { $sort: { occurrenceCount: -1 } }

    ])
    

    return res.status(200).json(history)

  } catch (error) {
    return res.status(400).json({ error: error.message })
  }
}
const getSignalsToday = async (req, res) => {

  const { deviceId } = req.params
  const parentId = req.parent._id

  if (!mongoose.Types.ObjectId.isValid(deviceId)) {
    return res.status(404).json({ error: 'No such device' })
  }
  const oneDayAgo = new Date()
  oneDayAgo.setHours(oneDayAgo.getHours() - 24)

  try {
    const device = await Device.findOne({ _id: deviceId, parentId })
    if (!device) {
      return res.status(403).json({ error: 'Unauthorized access to this device' })
    }

    const history = await EventSignal.aggregate([
      { $match: { deviceId: new mongoose.Types.ObjectId(deviceId) } },
      { $unwind: "$signals" },
      { $match: { "signals.timestamp": { $gte: oneDayAgo } } },
      {
        $group: {
          _id:
            { label: "$signals.label", platform: "$platform", kind: "$signals.kind" },
          occurrenceCount: { $sum: 1 }, creators: { $addToSet: "$signals.creator" }
        }
      },
      { $project: { _id: 0, label: "$_id.label", platform: "$_id.platform", kind: "$_id.kind", creators: 1, occurrenceCount: 1 } },
      { $sort: { occurrenceCount: -1 } }
    ])
    
    return res.status(200).json(history)
  } catch (error) {
    return res.status(400).json({ error: error.message })
  }


}
const deleteSignals = async (req, res) => {
  const { deviceId } = req.params
  const { startDate, endDate } = req.body
  const parentId = req.parent._id
  if (!mongoose.Types.ObjectId.isValid(deviceId)) {
    return res.status(404).json({ error: 'No such device' })
  }
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return res.status(400).json({ error: 'Invalid date format' });
  }
  if (start > end) {
    return res.status(400).json({ error: 'Start date cannot be later than end date' });
  }
  try {
    const device = await Device.findOne({ _id: deviceId, parentId })
    if (!device) {
      return res.status(403).json({ error: 'Unauthorized access to this device' })
    }
    const result = await EventSignal.updateMany({ deviceId: deviceId }, { $pull: { signals: { timestamp: { $gte: start, $lte: end } } } })
    //After pulling signals, some documents might have an empty signals array.
    await EventSignal.deleteMany({ deviceId: deviceId, signals: { $size: 0 } })

    return res.status(200).json({ message: `${result.modifiedCount} documents updated, matching signals removed successfully.` })
  } catch (error) {
    return res.status(400).json({ error: error.message })
  }
}

const saveSignals = async (req, res) => {

  const { platform, signals } = req.body
  const deviceId = req.device._id

  console.log('[SAVE_SIGNALS] Received request:', { platform, signalsCount: signals?.length, deviceId })

  try {

    const newSignalBatch = await EventSignal.create({
      deviceId,
      platform,
      signals
    })

    console.log('[SAVE_SIGNALS] Successfully saved:', newSignalBatch._id)
    return res.status(201).json(newSignalBatch)

  } catch (error) {
    console.error('[SAVE_SIGNALS] Error:', error.message)
    console.error('[SAVE_SIGNALS] Full error:', error)
    return res.status(400).json({ error: error.message })
  }
}

module.exports = {
  getSignalsLast5Days,
  getSignalsToday,
  deleteSignals,
  saveSignals
}