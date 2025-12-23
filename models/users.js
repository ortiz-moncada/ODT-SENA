import mongoose from "mongoose";
import bcrypt from "bcryptjs";


const userSchema = new mongoose.Schema(
  {
    names: { type: String, required: true },
    identification: { type: String, required: true },
    gmail: { type: String, required: true },
    phone: { type: Number},
    tribute_id: { type: String },
    password: { type: String, required: true },
    rol: { type: Number, enum: [1, 2, 3], default: 3 }, // 1=super admin, 2=admin, 3=usuario
    state: { type: Number, enum: [1, 2], default: 1 }, // 1= activo, 2=inactivo
    date: { type: Date, default: Date.now },
    areaId: { type: mongoose.Schema.Types.ObjectId, ref: "Area"},
    tasksId: { type: mongoose.Schema.Types.ObjectId,ref: "Tasks"}
  },
  {
    timestamps: true 
  }
);


userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt); 
  next();
});

export default mongoose.model("users",userSchema);