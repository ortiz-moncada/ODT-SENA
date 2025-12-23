import express from "express";
import { sendEmail,restablecerContraseña } from "../controllers/email.js";


const router = express.Router();

router.post("/send", sendEmail);
router.post("/restablecer", restablecerContraseña);

export default router;
