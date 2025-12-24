const express = require('express')
const router = express.Router()
const  {createDevice , deleteDevice ,validateDeviceToken} = require('../controllers/deviceController')

router.post('/create', createDevice)
router.post('/delete', deleteDevice)
router.get('/validate/:token', validateDeviceToken)

module.exports = router