// seed.js
require('dotenv').config();
const mongoose = require('mongoose');
const Parent = require('./models/Parent');
const Device = require('./models/Device');

const seed = async () => {
  try {
    // 1. חיבור לדאטהבייס
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB for seeding...");

    // 2. ניקוי נתונים קיימים (כדי שלא יהיו כפילויות בבדיקות)
    await Parent.deleteMany({});
    await Device.deleteMany({});
    console.log("Cleaned old data.");

    // 3. יצירת הורה דגימה
    const parent = await Parent.create({
      name: "mom shani",
      email: "shani@test.com",
      password: "123456" // בהמשך הדרך נלמד איך להצפין את זה
    });

    // 4. יצירת מכשיר דגימה שמקושר להורה
    const device = await Device.create({
      name: "Noga's iPhone",
      parent: parent._id, // כאן המערכת מקשרת בין המכשיר להורה
      deviceToken: "KIDS-SAFE-2025" // זה מה שתשימי בפוסטמן!
    });

    // 5. עדכון ההורה עם המכשיר (כי במודל שלך יש מערך של devices)
    parent.devices.push(device._id);
    await parent.save();

    console.log("---------------------------------");
    console.log("Seed successful!");
    console.log("Device Token for Noga: KIDS-SAFE-2025");
    console.log("Parent ID (for your routes):", parent._id);
    console.log("Device ID (for fetching signals):", device._id);
    console.log("---------------------------------");

    process.exit();
  } catch (error) {
    console.error("Error seeding data:", error);
    process.exit(1);
  }
};

seed();