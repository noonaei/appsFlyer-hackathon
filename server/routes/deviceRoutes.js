const express = require('express')
const router = express.Router()
const  { getDevices, createDevice , deleteDevice ,validateDeviceToken} = require('../controllers/deviceController')
const requireAuth = require('../middleware/requireAuth')

router.get('/validate/:token', validateDeviceToken)

router.use(requireAuth)

//Require auth for all device routes
router.get('/', getDevices)
router.post('/create', createDevice)
router.delete('/:deviceId', deleteDevice)


module.exports = router