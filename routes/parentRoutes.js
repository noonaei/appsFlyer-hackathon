const express = require('express')
const router = express.Router()
const { signupParent, loginParent } = require('../controllers/parentController')

router.post('/signup', signupParent)
router.post('/login', loginParent)

module.exports = router