require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const { startMatchMonitor } = require("./services/matchMonitor");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    // Iniciar monitoramento de partidas após conectar ao banco
    startMatchMonitor();
  })
  .catch((err) => console.error("MongoDB connection error:", err));

// Routes
app.use("/auth", authRoutes);
app.use("/admin", require("./routes/admin"));
app.use("/user", require("./routes/user"));
app.use("/api/football", require("./routes/football"));

app.get("/", (req, res) => {
  res.send("FutScore API is running");
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
