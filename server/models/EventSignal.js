const mongoose = require('mongoose');

const eventSignalSchema = new mongoose.Schema({
    deviceId: {
        type: mongoose.Schema.Types.ObjectId,ref: 'Device',
        required: true,
    },
    platform: {
        type: String,
        required: true,
        enum: {
            values: ['youtube', 'tiktok', 'instagram', 'reddit', 'twitch', 'google_search'],
            message: '{VALUE} is not a supported platform'
        }
    },
    signals: [{


        kind: {
            type: String,
            required: true,
            enum: {

                values: ['hashtag', 'channel', 'search_term', 'url_visit'],
                message: '{VALUE} is not a supported signal kind'
            }
        },
        label: {
            type: String,
            required: true
        },

        url: {
            type: String
        },

        creator: {
            type: String
        },

        timestamp: { type: Date, default: Date.now }//time of the event at the source platform
    }],

    createdAt: {
        type: Date,
        expires: 2592000 // 30 days in seconds
    }
}, { timestamps: true });


eventSignalSchema.index({ deviceId: 1, createdAt: -1 });

module.exports = mongoose.model('EventSignal', eventSignalSchema);



