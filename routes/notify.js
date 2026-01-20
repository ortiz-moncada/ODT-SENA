import { Router } from "express";
import {
  createNotification,
  getNotifications,
  deleteNotification,
  deleteNotifications
} from "../controllers/notify.js";

const router = Router();

console.log("🔔 ================================");
console.log("🔔 CARGANDO RUTAS DE NOTIFICACIONES");
console.log("🔔 ================================");

// Crear notificación
router.post("/create", (req, res, next) => {
  console.log("✅ POST /create ejecutado");
  next();
}, createNotification);

// Obtener notificaciones
router.get("/", (req, res, next) => {
  console.log("✅ GET / ejecutado");
  next();
}, getNotifications);

// Eliminar UNA notificación por ID
router.delete("/:id", (req, res, next) => {
  console.log("✅ DELETE /:id ejecutado");
  next();
}, deleteNotification);

// Eliminar TODAS las notificaciones
router.delete("/", (req, res, next) => {
  console.log("✅ DELETE / ejecutado");
  next();
}, deleteNotifications);

console.log("✅ Rutas de notificaciones registradas:");
console.log("   - POST   /create");
console.log("   - GET    /");
console.log("   - DELETE /:id");
console.log("   - DELETE /");

export default router;