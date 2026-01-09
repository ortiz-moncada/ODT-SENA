import Notification from "../models/notify.js";

export const createNotification = async (req, res) => {
  try {
    const {
      title,
      nameTask,
      description,
      deliveryDate,
      task_id,   //  FALTABA
      user_id,
      area_id
    } = req.body;

    //  VALIDACIÓN REAL
    if (
      !title ||
      !nameTask ||
      !description ||
      !task_id ||
      !user_id ||
      !area_id
    ) {
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
    const { rol, userId, areaId } = req.query;

    if (!rol) {
      return res.status(400).json({
        message: "Rol requerido"
      });
    }

    let filter = {};


    if (Number(rol) === 3) {
      filter.user_id = userId;
    }


    else if (Number(rol) === 2) {
      filter.area_id = areaId;
    }

    else if (Number(rol) === 1) {
      filter = {};
    }

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
    const { rol, userId, areaId } = req.query;

    let filter = {};

    if (rol === "3") filter.user = userId;
    if (rol === "2") filter.area = areaId;
    if (rol === "1") filter = {};

    await Notification.deleteMany(filter);

    res.json({ message: "Notificaciones eliminadas correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al eliminar notificaciones" });
  }
};

