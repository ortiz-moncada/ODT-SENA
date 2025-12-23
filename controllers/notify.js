import Notification from '../models/notify.js';

// Crear notificación
export const createNotification = async (req, res) => {
  try {
    const { title,nameTask, description, deliveryDate } = req.body;

    const notification = new Notification({
      title,
      nameTask,
      description,
      deliveryDate
    });

    await notification.save();

    res.status(200).json({ message: 'Notificación creada', notification });
  } catch (error) {
    res.status(500).json({ message: 'Error al crear notificación', error });
  }
};

// Obtener todas
export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 });
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener notificaciones', error });
  }
};

// Eliminar manualmente
export const deleteNotification = async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Notificación eliminada' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar notificación', error });
  }
};
