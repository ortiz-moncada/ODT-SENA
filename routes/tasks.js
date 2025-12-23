import express from "express";
import {getActiveTasks,getInactiveTasks,getTasks,getTasksByWorker,postTasks,putTasks,entregarTarea} from "../controllers/tasks.js";
import { upload } from "../middleware/upload.js";
import { verifyToken } from "../middleware/verifyToken.js";



const router = express.Router();

router.post("/create", upload.array("attached_files", 10), postTasks);
router.get("/seeTasks", getTasks);
router.get("/byWorker/:worker", getTasksByWorker); 
router.put("/:id", upload.array("attached_files", 10), putTasks);
router.get("/active/tasks", getActiveTasks);
router.get("/inactive/tasks", getInactiveTasks);
router.post("/entregar/:id",  verifyToken,   upload.single("file"), entregarTarea);


export default router;
