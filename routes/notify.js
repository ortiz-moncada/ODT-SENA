import { Router } from "express";
import {
  createNotification,
  getNotifications,
  deleteNotification,
  deleteNotifications
} from "../controllers/notify.js";

const router = Router();

// Crear notificación
router.post("/create", (req, res, next) => {
  next();
}, createNotification);

// Obtener notificaciones
router.get("/", (req, res, next) => {
  next();
}, getNotifications);

// Eliminar UNA notificación por ID
router.delete("/:id", (req, res, next) => {
  next();
}, deleteNotification);

// Eliminar TODAS las notificaciones
router.delete("/", (req, res, next) => {
  next();
}, deleteNotifications);

export default router;