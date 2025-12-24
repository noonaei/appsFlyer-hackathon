const Parent = require('../models/Parent')


const signupParent = async (req, res) => {
    const { email, password, name } = req.body
    try {
        const newParent = await Parent.create({ email, password, name })
        res.status(201).json({ email: newParent.email, id: newParent._id })
    } catch (error) {
        res.status(400).json({ error: "Email already exists or invalid data" })
    }
}


const loginParent = async (req, res) => {
    const { email, password } = req.body;
    try {
        const parent = await Parent.findOne({ email })
        //  להוסיף הצפנה!!!!!!!!!!!!!!!!!
        if (parent && parent.password === password) { 
            res.status(200).json({ id: parent._id, name: parent.name })
        } else {
            res.status(401).json({ error: "Invalid email or password" })
        }
    } catch (error) {
        res.status(400).json({ error: error.message })
    }
}

module.exports = { signupParent, loginParent }