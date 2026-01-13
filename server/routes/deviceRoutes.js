const express = require('express')
const router = express.Router()
const  { getDevices, createDevice, updateDevice, deleteDevice ,validateDeviceToken} = require('../controllers/deviceController')
const requireAuth = require('../middleware/requireAuth')

router.get('/validate/:token', validateDeviceToken)

router.use(requireAuth)

//Require auth for all device routes
router.get('/', getDevices)
router.post('/create', createDevice)
router.put('/:deviceId', updateDevice)
router.delete('/:deviceId', deleteDevice)


module.exports = router