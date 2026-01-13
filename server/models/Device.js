const mongoose = require('mongoose')

const deviceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    age: {
        type: Number,
        required: true,
        min: 1,
        max: 18
    },
    parentId: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Parent',
        required: true,
        index: true,
        validate: {
            validator: async function(v) {
                const Parent = mongoose.model('Parent')
                const parent = await Parent.findById(v)
                return !!parent
            },
            message: 'Parent must exist'
        }
    },
    deviceToken: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
}, { timestamps: true })

// Add compound index for better query performance
deviceSchema.index({ parentId: 1, name: 1 }, { unique: true })

module.exports = mongoose.model('Device', deviceSchema)