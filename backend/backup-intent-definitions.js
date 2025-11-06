const mongoose = require("mongoose");
const fs = require("fs");
require("dotenv").config();

mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log("Connected to MongoDB");

    // Backup current intent definitions
    const IntentDefinition = mongoose.model(
      "IntentDefinition",
      new mongoose.Schema({}, { strict: false })
    );
    const currentIntents = await IntentDefinition.find({});

    const backup = {
      timestamp: new Date().toISOString(),
      count: currentIntents.length,
      data: currentIntents,
    };

    fs.writeFileSync(
      "backup-intent-definitions.json",
      JSON.stringify(backup, null, 2)
    );
    console.log(`Backup saved: ${currentIntents.length} intent definitions`);

    mongoose.disconnect();
  })
  .catch((err) => console.error("Error:", err));
