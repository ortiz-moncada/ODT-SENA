// ODT-SENA/database/seed.js
import mongoose from "mongoose";
import User from "../models/users.js"; 
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.CNX_MONGO;

const usersToSeed = [
  {
    names: "Lady Leonela ortiz Viviescas",
    identification: "111111111",
    gmail: "lortizv@sena.edu.co",
    phone: 3143650275,
    password: "leo12345", 
    rol: 1,
    state: 1
  }
];

const runSeed = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("🟢 Conectado a MongoDB para el seed...");

    // Limpiamos usuarios existentes con el mismo correo para evitar duplicados en pruebas
    await User.deleteMany({ gmail: { $in: usersToSeed.map(u => u.gmail) } });
    console.log("🧹 Limpieza de usuarios previa completada");

    // Usamos .create() en lugar de .insertMany() para que se ejecute el middleware de bcrypt
    await User.create(usersToSeed);
    
    console.log("✅ Seed finalizado: Usuarios creados con éxito");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error en el seed:", error);
    process.exit(1);
  }
};

runSeed();