import express from 'express';
import {createNotification,getNotifications, deleteNotification, deleteNotifications} from '../controllers/notify.js';

const router = express.Router();

router.post('/create', createNotification);
router.get('/', getNotifications);
router.delete('/:id', deleteNotification);
router.delete("/", deleteNotifications);



export default router;
