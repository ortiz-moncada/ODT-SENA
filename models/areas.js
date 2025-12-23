import mongoose from "mongoose";

const areaSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        description: { type: String, required: true },
        admin: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users", required: null},
       worker: [{ 
            type: mongoose.Schema.Types.ObjectId,
            ref: "users", 
            required: false
        }],
        tribute_id: { type: String },
        date: { type: Date, default: Date.now },
        state: { type: Number, enum: [1, 2], default: 1 } // 1 = activo, 2 = inactivo
    },
    {
        timestamps: true
    }
);

export default mongoose.model("Area", areaSchema);
