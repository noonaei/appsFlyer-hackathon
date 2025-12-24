const crypto = require('crypto');
const Device = require('../models/deviceModel')
const mongoose = require('mongoose')
const Parent = require('../models/Parent')

function generateDeviceToken() {
    return crypto.randomBytes(6).toString('hex').toUpperCase();
}

const createDevice = async (req, res) => {
    const {name, parentId } = req.body
    if (!mongoose.Types.ObjectId.isValid(parentId)) {
        return res.status(404).json({ error: 'Parent ID is invalid' })
      }
      const deviceToken = generateDeviceToken()
      try{
        const parentExists = await Parent.exists({ _id: parentId });
        if (!parentExists) {
            return res.status(404).json({ error: 'No such parent found' });
        }
       
        const newDevice = await Device.create({name, parentId,deviceToken})
        res.status(201).json({ name: newDevice.name, deviceToken: newDevice.deviceToken, id: newDevice._id })

      } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Token already exists, try again' });
        }
        res.status(400).json({ error: error.message})
      }
    } 

const deleteDevice = async (req, res) => {
    const { deviceId } = req.params
    if (!mongoose.Types.ObjectId.isValid(deviceId)) {
        return res.status(404).json({ error: 'No such device' })
      }
    try {
        const device = await Device.findByIdAndDelete(deviceId)
        if (!device) {
            return res.status(404).json({ error: 'No such device' })
        }

        const parent = await Parent.findById(device.parent)
        if (parent) {
            parent.devices.pull(deviceId)
            await parent.save()
        }

        await EventSignal.deleteMany({ deviceId: deviceId })
    
        res.status(200).json({ message: 'Device deleted successfully' })
    } catch (error) {
        res.status(400).json({ error: error.message })
    }
}
const validateDeviceToken = async (req, res) => {
    const { token } = req.params;

try {
    const device = await Device.findOne({ deviceToken: token });

    if (!device) {
        return res.status(404).json({ message: "Token not found" });
    }

    res.status(200).json({ deviceName: device.name, deviceId: device._id });
} catch (error) {
    res.status(500).json({ error: error.message });
}
}

module.exports = { createDevice , deleteDevice ,validateDeviceToken}