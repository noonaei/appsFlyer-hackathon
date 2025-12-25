const express = require('express')
const router = express.Router()
const { 
    saveSignals,
    getSignalsByDevice
} = require('../controllers/signalController')

router.get('/:deviceId', getSignalsByDevice)
router.post('/add', saveSignals)


module.exports = router