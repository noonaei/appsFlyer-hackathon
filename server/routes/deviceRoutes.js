const express = require('express')
const router = express.Router()
const  {createDevice , deleteDevice ,validateDeviceToken} = require('../controllers/deviceController')

router.post('/create', createDevice)
router.delete('/:deviceId', deleteDevice)
router.get('/validate/:token', validateDeviceToken)

module.exports = router