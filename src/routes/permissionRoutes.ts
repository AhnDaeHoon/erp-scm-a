import { Router } from 'express';
import { PermissionController } from '../controllers/PermissionController';
import { authMiddleware, hasRole } from '../middlewares/authMiddleware';

const router = Router();
const permissionController = new PermissionController();

// 모든 권한 조회 (인증 필요)
router.get('/', authMiddleware, permissionController.getAllPermissions);

// 특정 권한 조회 (인증 필요)
router.get('/:id', authMiddleware, permissionController.getPermissionById);

// 권한 관리 라우트 (admin 역할 필요)
router.post('/', authMiddleware, hasRole(['admin']), permissionController.createPermission);
router.put('/:id', authMiddleware, hasRole(['admin']), permissionController.updatePermission);
router.delete('/:id', authMiddleware, hasRole(['admin']), permissionController.deletePermission);

export default router; 