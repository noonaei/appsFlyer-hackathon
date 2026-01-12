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
    const device = await Device.findOne({ _id: deviceId, parentId })
    if (!device) {
      return res.status(403).json({ error: 'Unauthorized access to this device' })
    }

    const history = await EventSignal.aggregate([
      // Match by device and timestamp on top-level documents
      {
        $match: {
          deviceId: new mongoose.Types.ObjectId(deviceId),
          timestamp: { $gte: fiveDaysAgo }
        }
      },
      // Unwind labels array so we can aggregate per label
      { $unwind: '$labels' },
      // Group by label/platform/kind and count occurrences
      {
        $group: {
          _id: { label: '$labels', platform: '$platform', kind: '$kind' },
          occurrenceCount: { $sum: 1 }
        }
      },
      // Project a nicer shape
      {
        $project: {
          _id: 0,
          label: '$_id.label',
          platform: '$_id.platform',
          kind: '$_id.kind',
          occurrenceCount: 1
        }
      },
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
    return res.status(404).json({ error: 'Invalid device ID format' })
  }
  
  const oneDayAgo = new Date()
  oneDayAgo.setHours(oneDayAgo.getHours() - 24)

  try {
    console.log("Checking device:", deviceId, "for parent:", parentId);
    
    // First check if device exists at all
    const deviceExists = await Device.findById(deviceId)
    console.log("Device exists:", !!deviceExists);
    
    if (!deviceExists) {
      return res.status(404).json({ error: 'Device not found' })
    }
    
    // Then check ownership
    const device = await Device.findOne({ _id: deviceId, parentId })
    console.log("Device belongs to parent:", !!device);
    console.log("Device parentId:", deviceExists.parentId, "Request parentId:", parentId);
    
    if (!device) {
      return res.status(403).json({ error: 'Unauthorized access to this device' })
    }

    const history = await EventSignal.aggregate([
      {
        $match: {
          deviceId: new mongoose.Types.ObjectId(deviceId),
          timestamp: { $gte: oneDayAgo }
        }
      },
      { $unwind: '$labels' },
      {
        $group: {
          _id: { label: '$labels', platform: '$platform', kind: '$kind' },
          occurrenceCount: { $sum: 1 }
        }
      },
      {
        $project: { _id: 0, label: '$_id.label', platform: '$_id.platform', kind: '$_id.kind', occurrenceCount: 1 }
      },
      { $sort: { occurrenceCount: -1 } }
    ])

    return res.status(200).json(history)
  } catch (error) {
    console.error("Error in getSignalsToday:", error);
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
    return res.status(400).json({ error: 'Invalid date format' })
  }
  if (start > end) {
    return res.status(400).json({ error: 'Start date cannot be later than end date' })
  }
  try {
    const device = await Device.findOne({ _id: deviceId, parentId })
    if (!device) {
      return res.status(403).json({ error: 'Unauthorized access to this device' })
    }

    // Delete top-level EventSignal documents that fall within the timestamp range
    const result = await EventSignal.deleteMany({ deviceId: new mongoose.Types.ObjectId(deviceId), timestamp: { $gte: start, $lte: end } }) //fixed to convert deviceId to ObjectId

    return res.status(200).json({ deletedCount: result.deletedCount, message: `${result.deletedCount} signals deleted successfully.` })
  } catch (error) {
    return res.status(400).json({ error: error.message })
  }
}

const saveSignals = async (req, res) => {
  //const { platform, signals } = req.body
  const deviceId = req.device._id

  try {
     const { signals } = req.body || {};

    
    if (!Array.isArray(signals) || signals.length === 0) {
      return res.status(400).json({
        error: "Invalid input. Expected { deviceToken, signals: [...] }"
      });
    }

    //batch size limit 
    const MAX_BATCH = 100;
    if (signals.length > MAX_BATCH) {
      return res.status(413).json({
        error: `Batch too large. Max ${MAX_BATCH} signals per request.`
      });
    }

    const docs = signals.map((s) => {
      const labels = Array.isArray(s?.labels)
        ? s.labels
        : (s?.label ? [s.label] : []);

      //basic sanitization (prevents huge payloads / junk)
      const safeLabels = labels
        .filter(Boolean)
        .map(x => String(x).slice(0, 200)) //cap each label length
        .slice(0, 50);                    //cap number of labels per signal group

      return {
        deviceId,
        platform: s?.platform,
        kind: s?.kind,
        labels: safeLabels,
        timestamp: s?.timestamp ? new Date(s.timestamp) : new Date(),
      };
    });

    //reject if any doc is missing required fields
    for (const d of docs) {
      if (!d.platform || !d.kind || !Array.isArray(d.labels) || d.labels.length === 0) {
        return res.status(400).json({
          error: "Invalid signal item. Each must include platform, kind, and labels[]"
        });
      }
    }

    const inserted = await EventSignal.insertMany(docs, { ordered: false });

    return res.status(201).json({
      insertedCount: inserted.length,
      serverTime: new Date().toISOString()
    });

  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}
module.exports = {
  getSignalsLast5Days,
  getSignalsToday,
  deleteSignals,
  saveSignals
}