import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  nameTask: { type: String, required: true },
  description: { type: String, required: true },

  //  RELACIONES 
  task_id: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  area_id: { type: mongoose.Schema.Types.ObjectId,ref: "Area", required: true},
  deliveryDate: { type: Date },
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 30 }
});

export default mongoose.model("Notify", NotificationSchema);