const mongoose = require('mongoose')
const bcrypt = require('bcrypt')

const parentSchema = new mongoose.Schema({
    email: {
        type: String,
        minlength: 5,
        required: true,
        unique: true,
        lowercase: true,//כל האותיות יהפכו לאותיות קטנות כדי שישמר בצורה שווה לכולם בחיפוש לוג אין נהפוך גם הכל לקטנות
    },
    password: {
        type: String,
        required: true
    },
    name: {
        type: String
    },
    devices: [{ 
        type: mongoose.Schema.Types.ObjectId, ref: 'Device' 
    }],
    createdAt: {
        type: Date,
        immutable: true
    },
}, { timestamps: true })




//before saving the parent, hash the password if it has been modified
parentSchema.pre('save', async function () {
    if (!this.isModified('password')) return
    
    try {
        const salt = await bcrypt.genSalt(10)
        this.password = await bcrypt.hash(this.password, salt)
        
    } catch (err) {
        throw err
    }
})

module.exports = mongoose.model("Parent", parentSchema)