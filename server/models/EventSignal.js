const mongoose = require('mongoose');

const eventSignalSchema = new mongoose.Schema({
    deviceId: {
        type: mongoose.Schema.Types.ObjectId, ref: 'Device',
        required: true,
    },
    platform: {
        type: String,
        required: true,
        enum: {
            values: ['youtube', 'tiktok', 'instagram', 'reddit', 'twitch',],
            message: '{VALUE} is not a supported platform'
        }
    },
    kind: {
        type: String,
        required: true,
        enum: {

            values: ['hashtag', 'video_titles', 'creators', 'url_visit', 'channel',],
            message: '{VALUE} is not a supported signal kind'
        }
    },
    labels: [{
        type: String,
        required: true
        }],
    timestamp: { type: Date, default: Date.now },//time of the event at the source platform
}, { timestamps: true });


eventSignalSchema.index({ deviceId: 1, createdAt: -1 });

eventSignalSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

module.exports = mongoose.model('EventSignal', eventSignalSchema);



