require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const {
  startMatchMonitor,
  getMonitorStatus,
  checkAndNotify,
} = require("./services/matchMonitor");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Database Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    // Iniciar monitoramento de partidas após conectar ao banco
    startMatchMonitor();
  })
  .catch((err) => console.error("MongoDB connection error:", err));

app.use("/auth", authRoutes);
app.use("/admin", require("./routes/admin"));
app.use("/user", require("./routes/user"));
app.use("/api/football", require("./routes/football"));
app.use("/api/channels", require("./routes/channels"));
app.use("/download", require("./routes/download"));
app.use("/api/webhooks", require("./routes/webhooks"));
app.use("/api/subscription", require("./routes/subscription"));
app.use("/api/announcements", require("./routes/announcements"));
// Rota de IA (Guru) restaurada apenas para Chat
app.use("/api/ai-predictions", require("./routes/aiChat"));


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

// Endpoint para verificar status do monitor de partidas
app.get("/monitor-status", (req, res) => {
  try {
    const status = getMonitorStatus();
    res.json({
      ...status,
      serverTime: new Date().toISOString(),
      uptime: process.uptime() + "s",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para forçar verificação manual
app.get("/debug/force-check", async (req, res) => {
  try {
    console.log("[Debug] Forçando verificação de partidas...");
    await checkAndNotify();
    res.json({
      success: true,
      message: "Verificação executada! Veja os logs do servidor.",
      status: getMonitorStatus(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



// Endpoint para enviar notificação de teste (debug)
app.get("/debug/test-push", async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        error: "Forneça o email via query param",
        example: "/debug/test-push?email=seu@email.com",
      });
    }

    const User = require("./models/User");
    const { sendPushToUser } = require("./services/pushNotifications");

    const user = await User.findOne({ email }).select("pushToken");

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    if (!user.pushToken) {
      return res
        .status(400)
        .json({ error: "Usuário não tem push token registrado" });
    }

    const success = await sendPushToUser(
      user.pushToken,
      "🎉 Teste FutScore!",
      "Se você recebeu isso, as notificações estão funcionando perfeitamente!",
      { type: "test" }
    );

    console.log(
      `[Debug] Notificação de teste enviada para ${email}: ${
        success ? "✅" : "❌"
      }`
    );
    res.json({
      success,
      message: success
        ? "Notificação enviada! Verifique seu celular."
        : "Falha ao enviar notificação",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  // Keep-alive: Previne que o Railway hiberne o servidor
  // Ping a cada 10 minutos (otimizado para reduzir custos)
  const KEEP_ALIVE_INTERVAL = 10 * 60 * 1000; // 10 minutos

  setInterval(() => {
    const url = process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}/monitor-status`
      : `http://localhost:${PORT}/monitor-status`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        console.log(
          `[KeepAlive] Ping OK - Monitor checks: ${data.checkCount}, Last: ${data.lastCheck}`
        );
      })
      .catch((err) => {
        console.log(`[KeepAlive] Self-ping (expected in dev):`, err.message);
      });
  }, KEEP_ALIVE_INTERVAL);

  console.log(
    `[KeepAlive] Iniciado - ping a cada ${KEEP_ALIVE_INTERVAL / 1000}s`
  );
});
