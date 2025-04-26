import { Router } from 'express';
import { InventoryController } from '../controllers/InventoryController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();
const inventoryController = new InventoryController();

// 입고 관리 라우트
router.get('/in', authMiddleware, inventoryController.getAllInventoryIn);
router.get('/in/:id', authMiddleware, inventoryController.getInventoryInById);
router.post('/in', authMiddleware, inventoryController.createInventoryIn);
router.put('/in/:id', authMiddleware, inventoryController.updateInventoryIn);
router.delete('/in/:id', authMiddleware, inventoryController.deleteInventoryIn);

// 출고 관리 라우트
router.get('/out', authMiddleware, inventoryController.getAllInventoryOut);
router.get('/out/:id', authMiddleware, inventoryController.getInventoryOutById);
router.post('/out', authMiddleware, inventoryController.createInventoryOut);
router.put('/out/:id', authMiddleware, inventoryController.updateInventoryOut);
router.delete('/out/:id', authMiddleware, inventoryController.deleteInventoryOut);

// 재고 현황 라우트
router.get('/status', authMiddleware, inventoryController.getInventoryStatus);
router.get('/history', authMiddleware, inventoryController.getInventoryHistory);

export default router; 