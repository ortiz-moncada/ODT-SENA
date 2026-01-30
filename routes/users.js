import { Router } from "express";
import { postUser, getUser,  putUser, loginUser, putUserAll, getActive,  getInactive, getUserById,   sendRecoveryEmail,resetPasswordUpdate } from '../controllers/users.js';
import { userValidation } from "../middleware/validations.js";
import { validateFields } from "../middleware/validateFields.js";
import { verifyToken } from "../middleware/verifyToken.js"; 

const router = Router();


router.get("/correo/:gmail", sendRecoveryEmail);
router.post("/reset-password-update", resetPasswordUpdate);
router.post("/login", loginUser);
router.post("/register", [verifyToken, userValidation, validateFields], postUser);
router.get("/seeUsers", verifyToken, getUser); 
router.get("/active", verifyToken, getActive); 
router.get("/inactive", verifyToken, getInactive); 
router.get("/:id", verifyToken, getUserById); 
router.put("/:id", verifyToken, putUser); 
router.put("/all/:id", putUserAll);

export default router;