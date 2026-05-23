const app = require("../src/app");
const connectDB = require("../src/config/db");

let dbReady;

module.exports = async (req, res) => {
  try {
    if (!dbReady) {
      dbReady = connectDB();
    }

    await dbReady;
    return app(req, res);
  } catch (error) {
    dbReady = null;

    console.error("Backend initialization failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Backend initialization failed",
      error: error.message,
    });
  }
};
