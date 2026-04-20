import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import fileUpload from "express-fileupload";
import path from "path";
import { fileURLToPath } from "url";

// 1. IMPORTA EL ARCHIVO DE NOTIFICACIONES (CRONS)
// Asegúrate de que la ruta sea la correcta según tu carpeta
import "./config/cronRecorderTask.js"; 

// Importación de rutas
import userRoutes from "./routes/users.js";
import emailRoutes from "./routes/email.js";
import areaRouter from "./routes/areas.js";
import taskRouter from "./routes/tasks.js";
import notificationRoutes from "./routes/notify.js";
import driveRoutes from "./routes/drive.routes.js";

// Configuración de __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// --- MIDDLEWARES ---
const allowedOrigins = ['http://localhost:4000', process.env.FRONTEND_URL].filter(Boolean); 
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({ useTempFiles: false, createParentPath: true }));

// Archivos estáticos (Frontend)
app.use(express.static(path.join(__dirname, "public", "dist")));

// --- RUTAS API ---
app.use("/users", userRoutes); 
app.use("/api/email", emailRoutes); 
app.use("/areas", areaRouter); 
app.use("/tasks", taskRouter); 
app.use("/notify", notificationRoutes); 
app.use("/api/drive", driveRoutes); 

// Manejo de SPA
app.get(/^\/(?!api|users|areas|tasks|notify).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dist", "index.html"));
});

// --- ARRANQUE DEL SERVIDOR ---
const PORT = process.env.PORT || 4000;

mongoose.connect(process.env.CNX_MONGO)
  .then(() => {
    console.log("✅ MongoDB Conectado con éxito");
    
    app.listen(PORT, () => {
      console.log(`🚀 Servidor Express ejecutándose en: http://localhost:${PORT}`);
      console.log(`⏰ Sistema de notificaciones (Cron) activo`);
    });
  })
  .catch(err => {
    console.error("❌ Error de conexión a MongoDB:", err.message);
  });