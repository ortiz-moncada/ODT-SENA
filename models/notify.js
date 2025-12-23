import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  nameTask: { type: String, required: true },
  description: { type: String, required: true },
  deliveryDate: { type: Date, required: true },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 60 * 60 * 24 * 30 // se borra en 30 días
  }
});

export default mongoose.model('Notify', NotificationSchema);
