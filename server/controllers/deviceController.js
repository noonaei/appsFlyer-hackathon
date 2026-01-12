const crypto = require('crypto')
const mongoose = require('mongoose')
const Device = require('../models/Device')
const Parent = require('../models/Parent')
const EventSignal = require('../models/EventSignal')

const getDevices = async (req, res) => {
    const parentId = req.parent._id

    try {
      
        const devices = await Device.find({ parentId }).select('name age deviceToken createdAt') 
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
    const { name, age } = req.body
    const parentId = req.parent._id
    if (!mongoose.Types.ObjectId.isValid(parentId)) {
        return res.status(404).json({ error: 'Parent ID is invalid' })
    }
    if (!age || age < 1 || age > 18) {
        return res.status(400).json({ error: 'Age is required and must be between 1-18' })
    }
    const deviceToken = generateDeviceToken()
    
    const session = await mongoose.startSession()
    session.startTransaction()
    
    try {
        const existingDevice = await Device.findOne({ name: name, parentId: parentId }).session(session)
        if (existingDevice) {
            await session.abortTransaction()
            return res.status(400).json({ error: `You already have a device named "${name}"` })
        }
        
        // Create the new device
        const [newDevice] = await Device.create([{ name, age, parentId, deviceToken }], { session })

        // Add the device to the parent's devices array
        const parent = await Parent.findByIdAndUpdate(
            parentId,
            { $push: { devices: newDevice._id } }, 
            { runValidators: true, session }
        )
        
        if (!parent) {
            await session.abortTransaction()
            return res.status(404).json({ error: 'No such parent found' })
        }
        
        await session.commitTransaction()
        console.log('Device created successfully:', newDevice._id, 'for parent:', parentId)
        
        return res.status(201).json({ 
            name: newDevice.name,
            age: newDevice.age, 
            deviceToken: newDevice.deviceToken, 
            deviceId: newDevice._id 
        })

    } catch (error) {
        await session.abortTransaction()
        
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Token already exists, try again' })
        }
        return res.status(400).json({ error: error.message })
    } finally {
        session.endSession()
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

const updateDevice = async (req, res) => {
    const { deviceId } = req.params
    const { name, age } = req.body
    const parentId = req.parent._id
    
    if (!mongoose.Types.ObjectId.isValid(deviceId)) {
        return res.status(404).json({ error: 'No such device' })
    }
    
    const updateData = {}
    if (name) updateData.name = name
    if (age !== undefined) {
        if (age < 1 || age > 18) {
            return res.status(400).json({ error: 'Age must be between 1-18' })
        }
        updateData.age = age
    }
    
    try {
        const device = await Device.findOneAndUpdate(
            { _id: deviceId, parentId: parentId },
            updateData,
            { new: true, runValidators: true }
        )
        
        if (!device) {
            return res.status(404).json({ error: 'No such device for this parent' })
        }
        
        return res.status(200).json({ message: 'Device updated successfully', device })
    } catch (error) {
        return res.status(400).json({ error: error.message })
    }
}

module.exports = { getDevices, createDevice, updateDevice, deleteDevice, validateDeviceToken }