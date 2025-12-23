import { Router } from "express";
import bcrypt from "bcryptjs";
import usersModel from "../models/users.js";
import { 
  postUser, getUser, putUser, loginUser, putUserAll, 
  getActive, getInactive, getUserById, getCorreo
} from '../controllers/users.js';
import { userValidation } from "../middleware/validations.js";
import { validateFields } from "../middleware/validateFields.js";
import { verifyToken } from "../middleware/verifyToken.js"; 

const router = Router();

router.put("/reset-password/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    console.log("🔄 Restableciendo contraseña para usuario:", id);

    if (!password || password.length < 6) {
      return res.status(400).json({
        message: "La contraseña debe tener al menos 6 caracteres",
      });
    }

    // Hashear la nueva contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Actualizar usuario
    const updatedUser = await usersModel.findByIdAndUpdate(
      id,
      { password: hashedPassword },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.json({ message: "Contraseña actualizada correctamente" });
  } catch (error) {
    console.error("❌ Error al restablecer contraseña:", error.message);
    res.status(500).json({ message: "Error del servidor" });
  }
});

// LOGIN
router.post("/login", loginUser);

router.post("/register",[  verifyToken, userValidation,validateFields], postUser);
router.get("/seeUsers", verifyToken, getUser); 
router.get("/correo/:gmail", getCorreo);
router.put("/:id", verifyToken, putUser); 
router.put("/all/:id", putUserAll);
router.get("/active", verifyToken, getActive); 
router.get("/inactive", verifyToken, getInactive); 
router.get("/:id", verifyToken, getUserById); 


export default router;
