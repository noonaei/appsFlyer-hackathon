const express = require('express')
const router = express.Router()
const { signupParent, loginParent, updateParent, deleteParent } = require('../controllers/parentController')
const requireAuth = require('../middleware/requireAuth')

router.post('/signup', signupParent)
router.post('/login', loginParent)

router.use(requireAuth)
router.put('/update', updateParent)
router.delete('/delete', deleteParent)

module.exports = router