const Device = require('../models/Device')

const deviceAuth = async (req, res, next) => {
    console.log('[DEVICE_AUTH] Request body:', JSON.stringify(req.body, null, 2))
    
    if (!req.body || typeof req.body !== 'object' || !req.body.deviceToken) {
        console.log('[DEVICE_AUTH] Missing deviceToken in request')
        return res.status(400).json({ 
            error: "Invalid request. Please ensure you are sending JSON with a deviceToken." 
        });
    }
    //לבדוק באיזה צורה נוגה שולחת את התוקן
    const { deviceToken } = req.body
    if (!deviceToken) {
        console.log('[DEVICE_AUTH] Device token is empty')
        return res.status(401).json({ error: 'Device token required' })
    }
    try {
        console.log('[DEVICE_AUTH] Looking up device with token:', deviceToken)
        const device = await Device.findOne({ deviceToken: deviceToken })
        if (!device) {
            console.log('[DEVICE_AUTH] Device not found for token:', deviceToken)
            return res.status(401).json({ error: 'Invalid device token' })
        }
        console.log('[DEVICE_AUTH] Device found:', device._id)
        req.device = device
        next()
    } catch (error) {
        console.error('[DEVICE_AUTH] Error:', error)
        return res.status(500).json({ error: 'Server error' })
    }

}
module.exports = deviceAuth