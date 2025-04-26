import { Router } from 'express';
import { ProductController } from '../controllers/ProductController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();
const productController = new ProductController();

// 제품 조회 라우트
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);

// 제품 관리 라우트 (인증 필요)
router.post('/', authMiddleware, productController.createProduct);
router.put('/:id', authMiddleware, productController.updateProduct);
router.delete('/:id', authMiddleware, productController.deleteProduct);

// 재고 관리 라우트
router.get('/:id/inventory', authMiddleware, productController.getInventoryHistory);
router.post('/:id/inventory/in', authMiddleware, productController.addInventory);
router.post('/:id/inventory/out', authMiddleware, productController.removeInventory);

export default router; 