import express from "express";
import {getTasks,getTasksByWorker,postTasks,putTasks,entregarTarea,getMonthlyTasks} from "../controllers/tasks.js";
import { upload } from "../middleware/upload.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router.post("/create", upload.array("attached_files", 10), postTasks);
router.get("/seeTasks", getTasks);
router.get("/byWorker/:worker", getTasksByWorker); 
router.put("/:id", upload.array("attached_files", 10), putTasks);
router.post("/entregar/:id",verifyToken, upload.array("attached_files", 5), entregarTarea);
router.get("/monthly", getMonthlyTasks);


export default router;