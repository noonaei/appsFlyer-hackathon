const crypto = require('crypto')
const mongoose = require('mongoose')
const Device = require('../models/Device')
const Parent = require('../models/Parent')
const EventSignal = require('../models/EventSignal')

const getDevices = async (req, res) => {
    const parentId = req.parent._id

    try {
      
        const devices = await Device.find({ parentId }).select('name deviceToken createdAt') 
            .sort({ createdAt: -1 })

        return res.status(200).json(devices)
    } catch (error) {
        return res.status(400).json({ error: error.message })
    }
}

function generateDeviceToken() {
    return crypto.randomBytes(6).toString('hex').toUpperCase()
}

const createDevice = async (req, res) => {
    const { name } = req.body
    const parentId = req.parent._id
    if (!mongoose.Types.ObjectId.isValid(parentId)) {
        return res.status(404).json({ error: 'Parent ID is invalid' })
    }
    const deviceToken = generateDeviceToken()
    try {
        const existingDevice = await Device.findOne({ name: name, parentId: parentId })
        if (existingDevice) {
            return res.status(400).json({ error: `You already have a device named "${name}"` })
        }
        // Create the new device
        const newDevice = await Device.create({ name, parentId, deviceToken })

        // Add the device to the parent's devices array
        const parent = await Parent.findByIdAndUpdate(parentId,{$push: { devices: newDevice._id } }, { runValidators: true })
        

        if (!parent) {
            return res.status(404).json({ error: 'No such parent found' })
        }
        return res.status(201).json({ name: newDevice.name, deviceToken: newDevice.deviceToken, deviceId: newDevice._id })

    } catch (error) {

        if (error.code === 11000) {
            return res.status(400).json({ error: 'Token already exists, try again' })
        }
        return res.status(400).json({ error: error.message })
    }
}

const deleteDevice = async (req, res) => {
    const { deviceId } = req.params
    const parentId = req.parent._id
    if (!mongoose.Types.ObjectId.isValid(deviceId)) {
        return res.status(404).json({ error: 'No such device' })
    }
    try {
        // Find and delete the device
        const device = await Device.findOneAndDelete({_id: deviceId, parentId: parentId})
        if (!device) {
            return res.status(404).json({ error: 'No such device for this parent' })
        }
        // Remove the device from the parent's devices array
        const parent = await Parent.findByIdAndUpdate(parentId,{$pull:{ devices: deviceId } })
    
        // Delete event singals if there are any
        await EventSignal.deleteMany({ deviceId: deviceId})

        return res.status(200).json({ message: 'Device deleted successfully' })
    } catch (error) {
        return res.status(400).json({ error: error.message })
    }
}
//לבדוק עם נוגה אם היא עושה בדיקה שהחיבור הצליח בפעם הראשונה
const validateDeviceToken = async (req, res) => {
    const { token } = req.params;

    try {
        const device = await Device.findOne({ deviceToken: token })

        if (!device) {
            return res.status(404).json({ error: "Token not found" })
        }

        return res.status(200).json({ deviceName: device.name, deviceId: device._id })
    } catch (error) {
        return res.status(500).json({ error: error.message })
    }
}

module.exports = { getDevices, createDevice, deleteDevice, validateDeviceToken }