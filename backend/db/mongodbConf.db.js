import mongoose from "mongoose";

export async function dbConnection() {
  try {
    const connObj = await mongoose.connect(process.env.DB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("DBSUCC: Connected to DB");
  } catch (error) {
    console.log("DBERR: DB connection failed");
    console.log("DBERR_name: " + error.name);
    console.log("DBERR_msg : " + error.message);
    mongoose.disconnect();
    process.exit(1);
  }
}
