import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import fileUpload from "express-fileupload";

import userRoutes from "./routes/users.js";
import emailRoutes from "./routes/email.js";
import areaRouter from "./routes/areas.js";
import taskRouter from "./routes/tasks.js";
import "./config/cronRecorderTask.js";
import "./config/monthlyTasks.js";
import notificationRoutes from "./routes/notify.js";
import driveRoutes from "./routes/drive.routes.js";

dotenv.config();

const app = express();

const allowedOrigins = [
  'http://localhost:5173',      // Siempre permitir desarrollo local
  process.env.FRONTEND_URL      // URL de producción desde .env
].filter(Boolean); 

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(fileUpload({
  useTempFiles: false,
  tempFileDir: './uploads/',
  createParentPath: true,
  limits: { fileSize: 50 * 1024 * 1024 },
  parseNested: true,
  debug: true
}));

// Rutas
app.use("/users", userRoutes);
app.use("/api/email", emailRoutes);
app.use("/areas", areaRouter);
app.use("/tasks", taskRouter);
app.use("/notify", notificationRoutes);
app.use("/api/drive", driveRoutes);

app.get("/", (req, res) => {
  res.send("Backend funcionando correctamente");
});

const PORT = process.env.PORT || 4000;

mongoose
  .connect(process.env.CNX_MONGO)
  .then(() => {
    console.log("✅ Conectado a MongoDB");
    console.log("🌐 CORS habilitado para:", allowedOrigins);
    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Error conectando a MongoDB:", err);
  });