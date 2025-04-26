import { Router } from 'express';
import { RoleController } from '../controllers/RoleController';
import { authMiddleware, hasRole } from '../middlewares/authMiddleware';

const router = Router();
const roleController = new RoleController();

// 모든 역할 조회 (인증 필요)
router.get('/', authMiddleware, roleController.getAllRoles);

// 특정 역할 조회 (인증 필요)
router.get('/:id', authMiddleware, roleController.getRoleById);

// 역할 관리 라우트 (admin 역할 필요)
router.post('/', authMiddleware, hasRole(['admin']), roleController.createRole);
router.put('/:id', authMiddleware, hasRole(['admin']), roleController.updateRole);
router.delete('/:id', authMiddleware, hasRole(['admin']), roleController.deleteRole);

export default router; 