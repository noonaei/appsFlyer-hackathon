const Device = require('../models/Device')

const deviceAuth = async (req, res, next) => {
    if (!req.body || typeof req.body !== 'object' || !req.body.deviceToken) { //fix: token not id
        return res.status(400).json({
            error: "Invalid request. Please ensure you are sending JSON with a deviceToken."
        });
    }
    
    const { deviceToken } = req.body
    if (!deviceToken) {
        return res.status(401).json({ error: 'Device token required' })
    }
    try {
        const device = await Device.findOne({ deviceToken })
        if (!device) {
            return res.status(401).json({ error: 'Invalid device token' })
        }
        req.device = device
        next()
    } catch (error) {
        return res.status(500).json({ error: 'Server error' })
    }

}
module.exports = deviceAuth