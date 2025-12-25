const mongoose = require('mongoose')

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
    devices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Device' }],
    createdAt: {
        type: Date,
        immutable: true
    },
}, { timestamps: true })

module.exports = mongoose.model("Parent", parentSchema)