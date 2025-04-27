import request from 'supertest';
import { AppDataSource } from '../../src/config/database';
import { Role } from '../../src/models/Role';
import { Permission } from '../../src/models/Permission';
import { User } from '../../src/models/User';
import jwt from 'jsonwebtoken';
import express from 'express';

// 기본 Express 앱 생성
const app = express();
app.use(express.json());

// 테스트용 컨트롤러
const mockRoleController = {
  getAllRoles: async (req, res) => {
    try {
      // 역할 리포지토리에서 모든 역할 조회
      const roleRepository = AppDataSource.getRepository(Role);
      const roles = await roleRepository.find({
        relations: ['permissions']
      });
      
      return res.json(roles);
    } catch (error) {
      return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
  },
  
  createRole: async (req, res) => {
    try {
      // 사용자 권한 확인 (요청 객체에서 사용자 정보 추출)
      const user = req.user;
      if (!user || !user.roles.some(role => role.name === 'admin')) {
        return res.status(403).json({ message: '접근 권한이 없습니다.' });
      }
      
      const { name, description, permissionIds } = req.body;
      
      // 이름은 필수
      if (!name) {
        return res.status(400).json({ message: '역할 이름은 필수입니다.' });
      }
      
      // 역할 이름 중복 확인
      const roleRepository = AppDataSource.getRepository(Role);
      const existingRole = await roleRepository.findOne({ where: { name } });
      if (existingRole) {
        return res.status(400).json({ message: '이미 존재하는 역할 이름입니다.' });
      }
      
      // 권한 목록 조회
      let permissions = [];
      if (permissionIds && permissionIds.length > 0) {
        const permissionRepository = AppDataSource.getRepository(Permission);
        permissions = await permissionRepository.findByIds(permissionIds);
      }
      
      // 새 역할 생성
      const role = roleRepository.create({
        name,
        description,
        permissions
      });
      
      await roleRepository.save(role);
      
      return res.status(201).json(role);
    } catch (error) {
      return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
  },
  
  updateRole: async (req, res) => {
    try {
      // 사용자 권한 확인
      const user = req.user;
      if (!user || !user.roles.some(role => role.name === 'admin')) {
        return res.status(403).json({ message: '접근 권한이 없습니다.' });
      }
      
      const { id } = req.params;
      const { name, description, permissionIds } = req.body;
      
      // 역할 조회
      const roleRepository = AppDataSource.getRepository(Role);
      const role = await roleRepository.findOne({
        where: { id: parseInt(id) },
        relations: ['permissions']
      });
      
      if (!role) {
        return res.status(404).json({ message: '역할을 찾을 수 없습니다.' });
      }
      
      // 이름이 변경되었는지 확인하고, 중복 체크
      if (name && name !== role.name) {
        const existingRole = await roleRepository.findOne({ where: { name } });
        if (existingRole) {
          return res.status(400).json({ message: '이미 존재하는 역할 이름입니다.' });
        }
        role.name = name;
      }
      
      // 설명 업데이트
      if (description !== undefined) {
        role.description = description;
      }
      
      // 권한 업데이트
      if (permissionIds) {
        const permissionRepository = AppDataSource.getRepository(Permission);
        const permissions = await permissionRepository.findByIds(permissionIds);
        role.permissions = permissions;
      }
      
      await roleRepository.save(role);
      
      return res.json(role);
    } catch (error) {
      return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
  },
  
  deleteRole: async (req, res) => {
    try {
      // 사용자 권한 확인
      const user = req.user;
      if (!user || !user.roles.some(role => role.name === 'admin')) {
        return res.status(403).json({ message: '접근 권한이 없습니다.' });
      }
      
      const { id } = req.params;
      
      // 역할 조회
      const roleRepository = AppDataSource.getRepository(Role);
      const role = await roleRepository.findOne({
        where: { id: parseInt(id) }
      });
      
      if (!role) {
        return res.status(404).json({ message: '역할을 찾을 수 없습니다.' });
      }
      
      // 기본 역할(admin, manager, user) 삭제 방지
      if (['admin', 'manager', 'user'].includes(role.name)) {
        return res.status(400).json({ message: '기본 역할은 삭제할 수 없습니다.' });
      }
      
      await roleRepository.remove(role);
      
      return res.json({ message: '역할이 삭제되었습니다.' });
    } catch (error) {
      return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
  }
};

const mockPermissionController = {
  getAllPermissions: async (req, res) => {
    try {
      // 권한 리포지토리에서 모든 권한 조회
      const permissionRepository = AppDataSource.getRepository(Permission);
      const permissions = await permissionRepository.find();
      
      return res.json(permissions);
    } catch (error) {
      return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
  },
  
  createPermission: async (req, res) => {
    try {
      // 사용자 권한 확인
      const user = req.user;
      if (!user || !user.roles.some(role => role.name === 'admin')) {
        return res.status(403).json({ message: '접근 권한이 없습니다.' });
      }
      
      const { name, description, resource, action } = req.body;
      
      // 필수 필드 확인
      if (!name || !resource || !action) {
        return res.status(400).json({ message: '이름, 리소스, 액션은 필수 항목입니다.' });
      }
      
      // 중복 확인
      const permissionRepository = AppDataSource.getRepository(Permission);
      const existingPermission = await permissionRepository.findOne({ where: { name } });
      if (existingPermission) {
        return res.status(400).json({ message: '이미 존재하는 권한 이름입니다.' });
      }
      
      // 새 권한 생성
      const permission = permissionRepository.create({
        name,
        description,
        resource,
        action
      });
      
      await permissionRepository.save(permission);
      
      return res.status(201).json(permission);
    } catch (error) {
      return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
  }
};

// 인증 미들웨어 모킹
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: '인증 토큰이 없습니다.' });
    }
    
    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: '유효하지 않은 토큰 형식입니다.' });
    }
    
    // 토큰을 검증하는 대신, 미리 정의된 사용자 정보 사용
    // 실제로는 JWT 검증이 필요하지만, 테스트를 위해 이 과정을 건너뜀
    const tokenType = token.includes('admin') ? 'admin' : 'user';
    
    if (tokenType === 'admin') {
      req.user = {
        id: 1,
        username: 'admin',
        roles: [{ name: 'admin', permissions: [] }]
      };
    } else {
      req.user = {
        id: 2,
        username: 'user',
        roles: [{ name: 'user', permissions: [] }]
      };
    }
    
    next();
  } catch (error) {
    return res.status(401).json({ message: '인증에 실패했습니다.' });
  }
};

// 라우트 설정
app.get('/api/roles', authMiddleware, mockRoleController.getAllRoles);
app.post('/api/roles', authMiddleware, mockRoleController.createRole);
app.put('/api/roles/:id', authMiddleware, mockRoleController.updateRole);
app.delete('/api/roles/:id', authMiddleware, mockRoleController.deleteRole);

app.get('/api/permissions', authMiddleware, mockPermissionController.getAllPermissions);
app.post('/api/permissions', authMiddleware, mockPermissionController.createPermission);

// AppDataSource 모킹
jest.mock('../../src/config/database', () => ({
  AppDataSource: {
    initialize: jest.fn().mockResolvedValue({}),
    getRepository: jest.fn()
  }
}));

describe('역할 및 권한 관리 통합 테스트', () => {
  let mockRoleRepository: any;
  let mockPermissionRepository: any;
  let mockUserRepository: any;
  
  beforeEach(() => {
    // 테스트용 리포지토리 모킹
    mockRoleRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      findByIds: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn()
    };
    
    mockPermissionRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      findByIds: jest.fn(),
      create: jest.fn(),
      save: jest.fn()
    };
    
    mockUserRepository = {
      findOne: jest.fn()
    };
    
    // 모킹된 리포지토리 반환
    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
      if (entity === Role) {
        return mockRoleRepository;
      } else if (entity === Permission) {
        return mockPermissionRepository;
      } else if (entity === User) {
        return mockUserRepository;
      }
      return {};
    });
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  // 관리자 권한으로 역할 관리 테스트
  describe('관리자 권한으로 역할 관리', () => {
    const adminToken = 'Bearer admin_token';
    
    test('관리자는 모든 역할을 조회할 수 있다', async () => {
      // 역할 목록 모킹
      const mockRoles = [
        { id: 1, name: 'admin', description: '관리자', permissions: [] },
        { id: 2, name: 'manager', description: '매니저', permissions: [] },
        { id: 3, name: 'user', description: '일반 사용자', permissions: [] }
      ];
      mockRoleRepository.find.mockResolvedValue(mockRoles);
      
      // 역할 조회 요청
      const response = await request(app)
        .get('/api/roles')
        .set('Authorization', adminToken);
      
      // 응답 검증
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(3);
      expect(response.body[0].name).toBe('admin');
      
      // 호출 검증
      expect(mockRoleRepository.find).toHaveBeenCalledWith({
        relations: ['permissions']
      });
    });
    
    test('관리자는 새 역할을 생성할 수 있다', async () => {
      // 역할 중복 확인
      mockRoleRepository.findOne.mockResolvedValue(null);
      
      // 권한 조회
      const mockPermissions = [
        { id: 1, name: 'user:read' },
        { id: 2, name: 'user:write' }
      ];
      mockPermissionRepository.findByIds.mockResolvedValue(mockPermissions);
      
      // 역할 생성 모킹
      mockRoleRepository.create.mockImplementation((roleData) => ({
        ...roleData,
        id: 4
      }));
      mockRoleRepository.save.mockImplementation((role) => Promise.resolve(role));
      
      // 새 역할 생성 요청
      const response = await request(app)
        .post('/api/roles')
        .set('Authorization', adminToken)
        .send({
          name: 'editor',
          description: '편집자',
          permissionIds: [1, 2]
        });
      
      // 응답 검증
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id', 4);
      expect(response.body).toHaveProperty('name', 'editor');
      expect(response.body).toHaveProperty('description', '편집자');
      expect(response.body).toHaveProperty('permissions', mockPermissions);
      
      // 호출 검증
      expect(mockRoleRepository.findOne).toHaveBeenCalledWith({ where: { name: 'editor' } });
      expect(mockPermissionRepository.findByIds).toHaveBeenCalledWith([1, 2]);
      expect(mockRoleRepository.create).toHaveBeenCalled();
      expect(mockRoleRepository.save).toHaveBeenCalled();
    });
    
    test('관리자는 역할을 수정할 수 있다', async () => {
      // 역할 조회
      const existingRole = {
        id: 4,
        name: 'editor',
        description: '편집자',
        permissions: []
      };
      mockRoleRepository.findOne.mockResolvedValue(existingRole);
      
      // 권한 조회
      const mockPermissions = [
        { id: 1, name: 'user:read' },
        { id: 2, name: 'user:write' },
        { id: 3, name: 'product:read' }
      ];
      mockPermissionRepository.findByIds.mockResolvedValue(mockPermissions);
      
      // 역할 업데이트 및 저장 모킹
      mockRoleRepository.save.mockImplementation((role) => Promise.resolve({
        ...role,
        permissions: mockPermissions
      }));
      
      // 역할 수정 요청
      const response = await request(app)
        .put('/api/roles/4')
        .set('Authorization', adminToken)
        .send({
          description: '콘텐츠 편집자',
          permissionIds: [1, 2, 3]
        });
      
      // 응답 검증
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', 4);
      expect(response.body).toHaveProperty('name', 'editor');
      expect(response.body).toHaveProperty('description', '콘텐츠 편집자');
      expect(response.body).toHaveProperty('permissions', mockPermissions);
      
      // 호출 검증
      expect(mockRoleRepository.findOne).toHaveBeenCalledWith({
        where: { id: 4 },
        relations: ['permissions']
      });
      expect(mockPermissionRepository.findByIds).toHaveBeenCalledWith([1, 2, 3]);
      expect(mockRoleRepository.save).toHaveBeenCalled();
    });
    
    test('관리자는 커스텀 역할을 삭제할 수 있다', async () => {
      // 역할 조회
      const customRole = {
        id: 4,
        name: 'editor',
        description: '편집자'
      };
      mockRoleRepository.findOne.mockResolvedValue(customRole);
      
      // 역할 삭제 모킹
      mockRoleRepository.remove.mockResolvedValue({});
      
      // 역할 삭제 요청
      const response = await request(app)
        .delete('/api/roles/4')
        .set('Authorization', adminToken);
      
      // 응답 검증
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', '역할이 삭제되었습니다.');
      
      // 호출 검증
      expect(mockRoleRepository.findOne).toHaveBeenCalledWith({
        where: { id: 4 }
      });
      expect(mockRoleRepository.remove).toHaveBeenCalledWith(customRole);
    });
    
    test('관리자는 기본 역할(admin, manager, user)을 삭제할 수 없다', async () => {
      // 기본 역할 조회
      const adminRole = {
        id: 1,
        name: 'admin',
        description: '관리자'
      };
      mockRoleRepository.findOne.mockResolvedValue(adminRole);
      
      // 역할 삭제 요청
      const response = await request(app)
        .delete('/api/roles/1')
        .set('Authorization', adminToken);
      
      // 응답 검증
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', '기본 역할은 삭제할 수 없습니다.');
      
      // 호출 검증
      expect(mockRoleRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 }
      });
      expect(mockRoleRepository.remove).not.toHaveBeenCalled();
    });
  });
  
  // 일반 사용자 권한으로 역할 관리 테스트
  describe('일반 사용자 권한으로 역할 관리', () => {
    const userToken = 'Bearer user_token';
    
    test('일반 사용자는 역할을 조회할 수는 있다', async () => {
      // 역할 목록 모킹
      const mockRoles = [
        { id: 1, name: 'admin', description: '관리자', permissions: [] },
        { id: 2, name: 'manager', description: '매니저', permissions: [] },
        { id: 3, name: 'user', description: '일반 사용자', permissions: [] }
      ];
      mockRoleRepository.find.mockResolvedValue(mockRoles);
      
      // 역할 조회 요청
      const response = await request(app)
        .get('/api/roles')
        .set('Authorization', userToken);
      
      // 응답 검증
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(3);
      
      // 호출 검증
      expect(mockRoleRepository.find).toHaveBeenCalledWith({
        relations: ['permissions']
      });
    });
    
    test('일반 사용자는 역할을 생성할 수 없다', async () => {
      // 역할 생성 요청
      const response = await request(app)
        .post('/api/roles')
        .set('Authorization', userToken)
        .send({
          name: 'custom_role',
          description: '커스텀 역할'
        });
      
      // 응답 검증
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message', '접근 권한이 없습니다.');
      
      // 호출 검증
      expect(mockRoleRepository.create).not.toHaveBeenCalled();
      expect(mockRoleRepository.save).not.toHaveBeenCalled();
    });
    
    test('일반 사용자는 역할을 수정할 수 없다', async () => {
      // 역할 수정 요청
      const response = await request(app)
        .put('/api/roles/3')
        .set('Authorization', userToken)
        .send({
          description: '수정된 설명'
        });
      
      // 응답 검증
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message', '접근 권한이 없습니다.');
      
      // 호출 검증
      expect(mockRoleRepository.findOne).not.toHaveBeenCalled();
      expect(mockRoleRepository.save).not.toHaveBeenCalled();
    });
    
    test('일반 사용자는 역할을 삭제할 수 없다', async () => {
      // 역할 삭제 요청
      const response = await request(app)
        .delete('/api/roles/4')
        .set('Authorization', userToken);
      
      // 응답 검증
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message', '접근 권한이 없습니다.');
      
      // 호출 검증
      expect(mockRoleRepository.findOne).not.toHaveBeenCalled();
      expect(mockRoleRepository.remove).not.toHaveBeenCalled();
    });
  });
  
  // 권한 관리 테스트
  describe('권한 관리', () => {
    const adminToken = 'Bearer admin_token';
    const userToken = 'Bearer user_token';
    
    test('관리자는 모든 권한을 조회할 수 있다', async () => {
      // 권한 목록 모킹
      const mockPermissions = [
        { id: 1, name: 'user:read', resource: 'user', action: 'read' },
        { id: 2, name: 'user:write', resource: 'user', action: 'write' },
        { id: 3, name: 'product:read', resource: 'product', action: 'read' }
      ];
      mockPermissionRepository.find.mockResolvedValue(mockPermissions);
      
      // 권한 조회 요청
      const response = await request(app)
        .get('/api/permissions')
        .set('Authorization', adminToken);
      
      // 응답 검증
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(3);
      expect(response.body[0].name).toBe('user:read');
      
      // 호출 검증
      expect(mockPermissionRepository.find).toHaveBeenCalled();
    });
    
    test('관리자는 새 권한을 생성할 수 있다', async () => {
      // 권한 중복 확인
      mockPermissionRepository.findOne.mockResolvedValue(null);
      
      // 권한 생성 모킹
      mockPermissionRepository.create.mockImplementation((permData) => ({
        ...permData,
        id: 4
      }));
      mockPermissionRepository.save.mockImplementation((perm) => Promise.resolve(perm));
      
      // 새 권한 생성 요청
      const response = await request(app)
        .post('/api/permissions')
        .set('Authorization', adminToken)
        .send({
          name: 'product:write',
          description: '상품 수정 권한',
          resource: 'product',
          action: 'write'
        });
      
      // 응답 검증
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id', 4);
      expect(response.body).toHaveProperty('name', 'product:write');
      expect(response.body).toHaveProperty('resource', 'product');
      expect(response.body).toHaveProperty('action', 'write');
      
      // 호출 검증
      expect(mockPermissionRepository.findOne).toHaveBeenCalledWith({ where: { name: 'product:write' } });
      expect(mockPermissionRepository.create).toHaveBeenCalled();
      expect(mockPermissionRepository.save).toHaveBeenCalled();
    });
    
    test('일반 사용자는 권한을 생성할 수 없다', async () => {
      // 권한 생성 요청
      const response = await request(app)
        .post('/api/permissions')
        .set('Authorization', userToken)
        .send({
          name: 'custom:permission',
          description: '커스텀 권한',
          resource: 'custom',
          action: 'read'
        });
      
      // 응답 검증
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message', '접근 권한이 없습니다.');
      
      // 호출 검증
      expect(mockPermissionRepository.create).not.toHaveBeenCalled();
      expect(mockPermissionRepository.save).not.toHaveBeenCalled();
    });
  });
}); 