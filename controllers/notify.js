import Notification from "../models/notify.js";

// controllers/notify.js
export const createNotification = async (req, res) => {
  try {
    const {
      title,
      nameTask,
      description,
      deliveryDate,
      task_id,
      user_id,
      area_id,
      isOwnChange
    } = req.body;

    if (!title || !nameTask || !description || !task_id || !user_id || !area_id) {
      return res.status(400).json({
        message: "Campos obligatorios incompletos"
      });
    }

    const notification = new Notification({
      title,
      nameTask,
      description,
      deliveryDate,
      task_id,
      user_id,
      area_id
    });

    await notification.save();

    res.status(201).json({
      message: "Notificación creada correctamente",
      notification
    });

  } catch (error) {
    console.error("🔥 Error al crear notificación:", error);
    res.status(500).json({
      message: "Error interno al crear notificación"
    });
  }
};

export const getNotifications = async (req, res) => {
  try {
    const { rol, userId } = req.query;

    if (!rol || !userId) {
      return res.status(400).json({
        message: "Rol y userId requeridos"
      });
    }
    const filter = { user_id: userId };

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 });

    res.status(200).json(notifications);
  } catch (error) {
    console.error("Error al obtener notificaciones:", error);
    res.status(500).json({
      message: "Error interno al obtener notificaciones"
    });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        message: "ID requerido"
      });
    }

    await Notification.findByIdAndDelete(id);

    res.status(200).json({
      message: "Notificación eliminada correctamente"
    });
  } catch (error) {
    console.error("Error al eliminar notificación:", error);
    res.status(500).json({
      message: "Error interno al eliminar notificación"
    });
  }
};

export const deleteNotifications = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        message: "userId requerido"
      });
    }

    // TODOS eliminan solo SUS propias notificaciones
    const filter = { user_id: userId };

    const result = await Notification.deleteMany(filter);

    res.json({
      success: true,
      message: `${result.deletedCount} notificaciones eliminadas correctamente`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error("Error al eliminar notificaciones:", error);
    res.status(500).json({
      success: false,
      message: "Error al eliminar notificaciones"
    });
  }
};