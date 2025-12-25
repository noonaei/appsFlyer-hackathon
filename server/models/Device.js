const mongoose = require('mongoose')

const deviceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    parentId: {
        type: mongoose.Schema.Types.ObjectId, ref: 'Parent',
        required: true,
        index: true
    },
    deviceToken: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    
}, { timestamps: true })

module.exports = mongoose.model('Device', deviceSchema)