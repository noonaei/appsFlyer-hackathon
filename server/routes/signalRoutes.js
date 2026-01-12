const express = require('express')
const router = express.Router()
const { 
    saveSignals,
    deleteSignals,
    getSignalsToday,
    getSignalsLast5Days
} = require('../controllers/signalController')

const requireAuth = require('../middleware/requireAuth')
const deviceAuth = require('../middleware/deviceAuth')

router.post('/add',deviceAuth, saveSignals)
router.post('/batch', deviceAuth, saveSignals); //alias for batch endpoint

// Require auth for all signal routes
router.use(requireAuth)

router.get('/5days/:deviceId', getSignalsLast5Days)
router.get('/today/:deviceId', getSignalsToday)
router.delete('/delete/:deviceId', deleteSignals)



module.exports = router