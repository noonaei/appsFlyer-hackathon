const jwt = require('jsonwebtoken')
const Parent = require('../models/Parent')

const requireAuth = async (req , res , next) => {
    const { authorization } = req.headers
    if (!authorization) {
        return res.status(401).json({error: 'Authorization token required'})
    }
    const accessToken = authorization.split(' ')[1]
    try {
        const {id} = jwt.verify(accessToken , process.env.JWT_SECRET)
        req.parent = await Parent.findById(id).select('_id')
        if(!req.parent){
            return res.status(401).json({error: 'Request is not authorized'})
        }
        next()
    } catch (error) {
        return res.status(401).json({error: 'Request is not authorized'})
    }
}

module.exports = requireAuth