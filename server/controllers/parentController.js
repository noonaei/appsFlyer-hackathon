const Parent = require('../models/Parent')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')

const createAccessToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '3d' })
}

const signupParent = async (req, res) => {
    const { email, password, name } = req.body
    try {
        
        const newParent = await Parent.create({ email, password, name })
        //send back access token for authentication
        const accessToken = createAccessToken(newParent._id)
        return res.status(201).json({ email: newParent.email, parentId: newParent._id, accessToken })
    } catch (error) {
        console.log(error)
        return res.status(400).json({ error: "Email already exists or invalid data" })
    }
}



const loginParent = async (req, res) => {
    const { email, password } = req.body;
    try {
        const parent = await Parent.findOne({ email })
        if (!parent) {
            return res.status(401).json({ error: "Invalid email or password" })
        }
        const isPasswordValid = await bcrypt.compare(password, parent.password)

        if (isPasswordValid) {

            const accessToken = createAccessToken(parent._id)
            return res.status(200).json({ parentId: parent._id, name: parent.name, accessToken })
        } else {
            return res.status(401).json({ error: "Invalid email or password" })
        }
    } catch (error) {
        return res.status(400).json({ error: error.message })
    }
}

const updateParent = async (req, res) => {
    const { name } = req.body
    const parentId = req.parent._id
    
    try {
        const parent = await Parent.findByIdAndUpdate(
            parentId,
            { name },
            { new: true, runValidators: true }
        )
        
        if (!parent) {
            return res.status(404).json({ error: 'Parent not found' })
        }
        
        return res.status(200).json({ message: 'Parent updated successfully', name: parent.name })
    } catch (error) {
        return res.status(400).json({ error: error.message })
    }
}

const deleteParent = async (req, res) => {
    const parentId = req.parent._id
    
    try {
        const Device = require('../models/Device')
        const EventSignal = require('../models/EventSignal')
        
        // Delete all devices and their signals
        const devices = await Device.find({ parentId })
        const deviceIds = devices.map(d => d._id)
        
        await EventSignal.deleteMany({ deviceId: { $in: deviceIds } })
        await Device.deleteMany({ parentId })
        
        // Delete parent
        await Parent.findByIdAndDelete(parentId)
        
        return res.status(200).json({ message: 'Account deleted successfully' })
    } catch (error) {
        return res.status(400).json({ error: error.message })
    }
}

module.exports = { signupParent, loginParent, updateParent, deleteParent }