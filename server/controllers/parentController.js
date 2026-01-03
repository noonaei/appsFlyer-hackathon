const Parent = require('../models/Parent')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')

const createAccessToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '3d' })
}

const signupParent = async (req, res) => {
    const { email, password, name } = req.body
    try {
        
        const newParent = await Parent.create({ email, password, name })
        //send back access token for authentication
        const accessToken = createAccessToken(newParent._id)
        return res.status(201).json({ email: newParent.email, parentId: newParent._id, accessToken })
    } catch (error) {
        console.log(error)
        return res.status(400).json({ error: "Email already exists or invalid data" })
    }
}



const loginParent = async (req, res) => {
    const { email, password } = req.body;
    try {
        const parent = await Parent.findOne({ email })
        if (!parent) {
            return res.status(401).json({ error: "Invalid email or password" })
        }
        const isPasswordValid = await bcrypt.compare(password, parent.password)

        if (isPasswordValid) {

            const accessToken = createAccessToken(parent._id)
            return res.status(200).json({ parentId: parent._id, name: parent.name, accessToken })
        } else {
            return res.status(401).json({ error: "Invalid email or password" })
        }
    } catch (error) {
        return res.status(400).json({ error: error.message })
    }
}

module.exports = { signupParent, loginParent }