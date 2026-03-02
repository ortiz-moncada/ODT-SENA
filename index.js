import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import fileUpload from "express-fileupload";
import path from "path";
import { fileURLToPath } from "url";

// IMPORTAMOS LA FUNCIÓN DEL BOT
import { main } from "./bot/base-js-baileys-mongo/src/app.js"; 

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

// Archivos estáticos
app.use(express.static(path.join(__dirname, "public", "dist")));

// --- RUTA PARA VER EL QR EN EL NAVEGADOR ---
app.get("/ver-qr", (req, res) => {
    const qrPath = path.resolve(process.cwd(), "bot.qr.png");
    res.sendFile(qrPath, (err) => {
        if (err) {
            res.status(404).send(`
                <body style="font-family:sans-serif; text-align:center; padding:50px;">
                    <h1>QR no generado aún</h1>
                    <p>Espera unos segundos y recarga. Revisa la consola.</p>
                    <script>setTimeout(()=>location.reload(), 5000)</script>
                </body>
            `);
        }
    });
});

// --- RUTAS API ---
app.use("/users", userRoutes); 
app.use("/api/email", emailRoutes); 
app.use("/areas", areaRouter); 
app.use("/tasks", taskRouter); 
app.use("/notify", notificationRoutes); 
app.use("/api/drive", driveRoutes); 

// SPA Frontend
app.get(/^\/(?!api|users|areas|tasks|notify|ver-qr).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dist", "index.html"));
});

// --- ARRANQUE ---
const PORT = process.env.PORT || 4000;
const BOT_PORT = process.env.BOT_PORT;

mongoose.connect(process.env.CNX_MONGO)
  .then(() => {
    console.log("MongoDB Conectado");
    
    // Primero levantamos Express
    app.listen(PORT, async () => {
      console.log(`🚀 Servidor Express en: http://localhost:${PORT}`);
      console.log(`📸 QR disponible en: http://localhost:${PORT}/ver-qr`);
      
      // LUEGO inicializamos el bot una sola vez
      try {
          await main(); 
          console.log("🤖 WhatsApp Bot inicializado");
      } catch (e) {
          console.error("❌ Error en Bot:", e.message);
      }
    });
  })
  .catch(err => console.error("❌ Error Mongo:", err));