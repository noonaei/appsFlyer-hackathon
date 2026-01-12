<<<<<<< Updated upstream
require('dotenv').config()

const express = require('express')
const mongoose = require('mongoose')
const signalRoutes = require('./routes/signalRoutes')
const parentRoutes = require('./routes/parentRoutes')
const deviceRoutes = require('./routes/deviceRoutes')
const aiRouter = require('./routes/ai') //ai side
const pairingRoutes = require("./routes/pairingRoutes");


const app = express()

const cors = require('cors');
app.use(cors());

// middlewares
app.use(express.json())

app.use((req, res, next) => {
  console.log(req.path, req.method)
  next()
})

app.get("/api/config", (req, res) => {
  const base = `http://localhost:${process.env.PORT || 5000}`;
  res.json({
    uploadEndpoint: `${base}/api/signals/add`
  });
});

// routes
app.use('/api/signals', signalRoutes)
app.use('/api/parents', parentRoutes)
app.use('/api/devices', deviceRoutes)
app.use('/api/ai', aiRouter)
app.use("/api/pairing", pairingRoutes)


// connect to db
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("Connected DB:", mongoose.connection.name);
        console.log('connected to database mongoDB')
        // listen to port
        app.listen(process.env.PORT, () => {
            console.log('Server is running on port',process.env.PORT)
        })
    })
    .catch((err) => {
        console.log(err)
    })

=======
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import dotenv from 'dotenv';
import rubberDuckRoutes from './routes/rubberDucks.js'; // Import the routes
import aiRouter from "./routes/ai.js"; //don't remove this - AI routes

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();

app.use(express.json());
app.use('/images', express.static(path.join(__dirname, 'images'))); // Serve static images

app.use(cors({
  origin: process.env.CLIENT_URL
}));

// Use the routes file for all `/ducks` routes
app.use('/ducks', rubberDuckRoutes);

app.use('/api/ai', aiRouter); // AI routes

// Start server
const PORT = process.env.PORT;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
>>>>>>> Stashed changes
