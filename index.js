import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import userRoutes from "./routes/users.js";
import emailRoutes from "./routes/email.js";
import areaRouter from "./routes/areas.js";
import taskRouter from "./routes/tasks.js";
import "./config/cronRecorderTask.js";
import notificationRoutes from './routes/notify.js';


dotenv.config();  // Permite recibir JSON en requests
const app = express();

// Middlewares
app.use(cors());          
app.use(express.json());
app.use("/users", userRoutes);
app.use("/api/email", emailRoutes);
app.use("/areas",areaRouter);
app.use("/tasks",taskRouter);
app.use('/notify', notificationRoutes);




// Ruta de prueba
app.get("/", (req, res) => {
  res.send("🚀 Backend funcionando correctamente");
});

// Puerto desde .env
const PORT = process.env.PORT || 4000;

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
   mongoose.connect(process.env.CNX_MONGO)
    .then(()=> console.log("conectado a mongo"))
    .catch(err => console.error(err));
});
