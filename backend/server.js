import { app } from "./app.js";
import { dbConnection } from "./db/mongodbConf.db.js";
import mongoose from "mongoose";
import { configDotenv } from "dotenv";

configDotenv({
  path: "./.env",
});

const PORT = process.env.PORT || 8001;

dbConnection()
  .then(function () {
    app.listen(PORT, () => {
      console.log(`Server is active on http://localhost:${PORT}`);
    });
  })
  .catch(async (err) => {
    console.log("ERR: " + err.name + "\n ERR_msg: " + err.message);
    await mongoose.disconnect();
  });
