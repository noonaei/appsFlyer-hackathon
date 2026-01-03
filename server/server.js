require('dotenv').config()

const express = require('express')
const mongoose = require('mongoose')
const signalRoutes = require('./routes/signalRoutes')
const parentRoutes = require('./routes/parentRoutes')
const deviceRoutes = require('./routes/deviceRoutes')

const app = express()

const cors = require('cors');
app.use(cors());

// middlewares
app.use(express.json())

app.use((req, res, next) => {
  console.log(req.path, req.method)
  next()
})

// routes
app.use('/api/signals', signalRoutes)
app.use('/api/parents', parentRoutes)
app.use('/api/devices', deviceRoutes)


// connect to db
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('connected to database mongoDB')
        // listen to port
        app.listen(process.env.PORT, () => {
            console.log('Server is running on port',process.env.PORT)
        })
    })
    .catch((err) => {
        console.log(err)
    })

