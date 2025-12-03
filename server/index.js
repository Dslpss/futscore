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

// Endpoint para verificar status do sistema de push (debug)
app.get("/push-stats", async (req, res) => {
  try {
    const User = require("./models/User");
    const usersWithToken = await User.countDocuments({
      pushToken: { $ne: null },
    });
    const totalUsers = await User.countDocuments();

    // Listar usuários e seus tokens (apenas preview)
    const users = await User.find().select("email pushToken name").lean();
    const userList = users.map((u) => ({
      email: u.email,
      name: u.name,
      hasPushToken: !!u.pushToken,
      tokenPreview: u.pushToken ? u.pushToken.substring(0, 40) + "..." : null,
    }));

    res.json({
      totalUsers,
      usersWithPushToken: usersWithToken,
      users: userList,
      message:
        usersWithToken === 0
          ? "Nenhum usuário com push token. Faça login no app para registrar."
          : `${usersWithToken} usuário(s) receberão notificações.`,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para registrar push token via query (debug - APENAS PARA TESTE)
app.get("/debug/register-token", async (req, res) => {
  try {
    const { email, token } = req.query;

    if (!email || !token) {
      return res.status(400).json({
        error: "Forneça email e token via query params",
        example:
          "/debug/register-token?email=seu@email.com&token=ExponentPushToken[xxx]",
      });
    }

    const User = require("./models/User");
    const user = await User.findOneAndUpdate(
      { email },
      { pushToken: token },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    console.log(`[Debug] Push token registrado manualmente para ${email}`);
    res.json({
      success: true,
      message: `Token registrado para ${email}`,
      tokenPreview: token.substring(0, 40) + "...",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
