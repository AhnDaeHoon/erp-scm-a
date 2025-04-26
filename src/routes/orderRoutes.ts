import { Router } from 'express';
import { OrderController } from '../controllers/OrderController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();
const orderController = new OrderController();

// 주문 조회 라우트
router.get('/', authMiddleware, orderController.getAllOrders);
router.get('/:id', authMiddleware, orderController.getOrderById);

// 주문 관리 라우트
router.post('/', authMiddleware, orderController.createOrder);
router.put('/:id', authMiddleware, orderController.updateOrder);
router.delete('/:id', authMiddleware, orderController.deleteOrder);

// 주문 상태 관리 라우트
router.put('/:id/status', authMiddleware, orderController.updateOrderStatus);
router.get('/:id/items', authMiddleware, orderController.getOrderItems);

export default router; 