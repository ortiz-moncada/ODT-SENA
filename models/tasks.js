import mongoose from "mongoose";

const taskSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  tribute_id: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
  stateTask: { type: Number, enum: [1, 2, 3, 4, 5], default: 1 },
  delivery_date: { type: Date },
  workers: [{ type: mongoose.Schema.Types.ObjectId, ref: "users" }],
  area_id: { type: mongoose.Schema.Types.ObjectId, ref: "Area" },
  leader: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: null },

  // ENTREGA DE TAREA
  delivery_file: { type: String, default: null },
  delivery_comment: { type: String, default: "" },
  delivery_date_real: { type: Date, default: null },
  delivered_by: { type: mongoose.Schema.Types.ObjectId, ref: "users", default: null },

  // ARCHIVOS ADJUNTOS
  attached_files: [
    {
      filename: { type: String, required: true },
      url: { type: String, required: true },
      drive_id: { type: String, required: true },
      uploaded_at: { type: Date, default: Date.now }
    }
  ],

  isMonthly: { type: Boolean, default: false },
  monthlyDay: { type: Number, default: 28 }, // día del mes (1–28 recomendado)
  parentTask: { type: mongoose.Schema.Types.ObjectId, ref: 'tasks' },


  deliveredFile: {
    type: String,
    default: null,
  },
  driveStatus: {
    type: String,
    enum: ["OK", "FAILED", "PENDING"],
    default: "PENDING",
  },
  deliveredAt: Date,

});

// Nombres de los estados
taskSchema.virtual("stateName").get(function () {
  const labels = {
    1: "En Desarrollo",
    2: "En Revisión",
    3: "Completada",
    4: "Rechazada",
    5: "Vencida"
  };
  return labels[this.stateTask];
});

export default mongoose.model("Task", taskSchema);