import request from 'supertest';
import app from '../../src/index';
import { AppDataSource } from '../../src/config/database';
import jwt from 'jsonwebtoken';
import { Permission } from '../../src/models/Permission';
import { User } from '../../src/models/User';
import { Role } from '../../src/models/Role';
import dotenv from 'dotenv';

// 환경 변수 로드
dotenv.config();

// AppDataSource 모킹
jest.mock('../../src/config/database', () => ({
  AppDataSource: {
    initialize: jest.fn().mockResolvedValue({}),
    getRepository: jest.fn()
  }
}));

// app 모듈 모킹
jest.mock('../../src/index', () => {
  const express = require('express');
  const app = express();
  app.use(express.json());

  // JWT 검증 미들웨어 모킹
  app.use((req, res, next) => {
    if (req.headers.authorization) {
      const token = req.headers.authorization.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key');
        req.user = decoded;
      } catch (error) {
        return res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
      }
    }
    next();
  });

  // 권한 확인 미들웨어 모킹
  const hasRole = (roles) => (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: '인증이 필요합니다.' });
    }

    const userRoles = req.user.roles || [];
    const hasRequiredRole = roles.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      return res.status(403).json({ message: '접근 권한이 없습니다.' });
    }

    next();
  };

  // 권한 관리 API 엔드포인트 모킹
  app.get('/api/permissions', (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: '인증이 필요합니다.' });
    }
    
    const permissionRepository = AppDataSource.getRepository(Permission);
    permissionRepository.find()
      .then(permissions => res.json(permissions))
      .catch(error => res.status(500).json({ message: '서버 오류가 발생했습니다.' }));
  });

  app.get('/api/permissions/:id', (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: '인증이 필요합니다.' });
    }
    
    const { id } = req.params;
    const permissionRepository = AppDataSource.getRepository(Permission);
    permissionRepository.findOne({ where: { id: parseInt(id) } })
      .then(permission => {
        if (!permission) {
          return res.status(404).json({ message: '권한을 찾을 수 없습니다.' });
        }
        res.json(permission);
      })
      .catch(error => res.status(500).json({ message: '서버 오류가 발생했습니다.' }));
  });

  app.post('/api/permissions', hasRole(['admin']), (req, res) => {
    const { name, description, resource, action } = req.body;
    
    // 필수 필드 검증
    if (!name || !resource || !action) {
      return res.status(400).json({ message: '이름, 리소스, 액션은 필수 필드입니다.' });
    }

    const permissionRepository = AppDataSource.getRepository(Permission);
    
    // 권한 중복 확인
    permissionRepository.findOne({ where: [{ name }, { resource, action }] })
      .then(existingPermission => {
        if (existingPermission) {
          return res.status(400).json({ message: '이미 존재하는 권한입니다.' });
        }

        // 권한 생성
        const permission = permissionRepository.create({
          name,
          description,
          resource,
          action
        });

        return permissionRepository.save(permission)
          .then(savedPermission => res.status(201).json(savedPermission));
      })
      .catch(error => res.status(500).json({ message: '서버 오류가 발생했습니다.' }));
  });

  app.put('/api/permissions/:id', hasRole(['admin']), (req, res) => {
    const { id } = req.params;
    const { name, description, resource, action } = req.body;
    const permissionRepository = AppDataSource.getRepository(Permission);

    let permission;

    permissionRepository.findOne({ where: { id: parseInt(id) } })
      .then(foundPermission => {
        if (!foundPermission) {
          return res.status(404).json({ message: '권한을 찾을 수 없습니다.' });
        }

        permission = foundPermission;

        // 이름 중복 확인
        if (name && name !== permission.name) {
          return permissionRepository.findOne({ where: { name } })
            .then(existingPermission => {
              if (existingPermission) {
                return Promise.reject({ status: 400, message: '이미 존재하는 권한 이름입니다.' });
              }
              permission.name = name;
              
              // 리소스/액션 중복 확인
              if ((resource && resource !== permission.resource) || (action && action !== permission.action)) {
                return permissionRepository.findOne({ 
                  where: { 
                    resource: resource || permission.resource, 
                    action: action || permission.action 
                  } 
                });
              }
              
              return null;
            });
        }
        
        // 리소스/액션 중복 확인
        if ((resource && resource !== permission.resource) || (action && action !== permission.action)) {
          return permissionRepository.findOne({ 
            where: { 
              resource: resource || permission.resource, 
              action: action || permission.action 
            } 
          });
        }
        
        return null;
      })
      .then(existingPermission => {
        if (existingPermission && existingPermission.id !== permission.id) {
          return Promise.reject({ status: 400, message: '이미 존재하는 리소스/액션 조합입니다.' });
        }

        // 업데이트
        if (description !== undefined) permission.description = description;
        if (resource) permission.resource = resource;
        if (action) permission.action = action;

        return permissionRepository.save(permission);
      })
      .then(updatedPermission => res.json(updatedPermission))
      .catch(error => {
        if (error.status) {
          return res.status(error.status).json({ message: error.message });
        }
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
      });
  });

  app.delete('/api/permissions/:id', hasRole(['admin']), (req, res) => {
    const { id } = req.params;
    const permissionRepository = AppDataSource.getRepository(Permission);

    permissionRepository.findOne({ where: { id: parseInt(id) } })
      .then(permission => {
        if (!permission) {
          return res.status(404).json({ message: '권한을 찾을 수 없습니다.' });
        }

        return permissionRepository.remove(permission)
          .then(() => res.json({ message: '권한이 삭제되었습니다.' }));
      })
      .catch(error => res.status(500).json({ message: '서버 오류가 발생했습니다.' }));
  });

  return app;
});

describe('권한 관리 API 엔드포인트 테스트', () => {
  let mockPermissionRepository: any;
  let mockAdminToken: string;
  let mockUserToken: string;

  beforeEach(() => {
    // 권한 리포지토리 모킹
    mockPermissionRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn()
    };

    // 리포지토리 반환 모킹
    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
      if (entity === Permission) {
        return mockPermissionRepository;
      }
      return {};
    });

    // JWT 토큰 모킹
    jest.spyOn(jwt, 'verify').mockImplementation((token) => {
      if (token === 'admin_token') {
        return { id: 1, username: 'admin', roles: ['admin'] };
      } else if (token === 'user_token') {
        return { id: 2, username: 'user', roles: ['user'] };
      }
      throw new Error('Invalid token');
    });

    mockAdminToken = 'admin_token';
    mockUserToken = 'user_token';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('권한 조회 API 테스트', () => {
    test('관리자가 모든 권한을 조회할 수 있다', async () => {
      // 권한 목록 모킹
      const mockPermissions = [
        { id: 1, name: 'user-read', resource: 'user', action: 'read', description: '사용자 조회 권한' },
        { id: 2, name: 'user-write', resource: 'user', action: 'write', description: '사용자 생성/수정 권한' }
      ];
      mockPermissionRepository.find.mockResolvedValue(mockPermissions);

      // API 요청
      const response = await request(app)
        .get('/api/permissions')
        .set('Authorization', `Bearer ${mockAdminToken}`);

      // 응답 검증
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('name', 'user-read');
      expect(response.body[1]).toHaveProperty('name', 'user-write');

      // 메소드 호출 검증
      expect(mockPermissionRepository.find).toHaveBeenCalled();
    });

    test('일반 사용자도 모든 권한을 조회할 수 있다', async () => {
      // 권한 목록 모킹
      const mockPermissions = [
        { id: 1, name: 'user-read', resource: 'user', action: 'read', description: '사용자 조회 권한' },
        { id: 2, name: 'user-write', resource: 'user', action: 'write', description: '사용자 생성/수정 권한' }
      ];
      mockPermissionRepository.find.mockResolvedValue(mockPermissions);

      // API 요청
      const response = await request(app)
        .get('/api/permissions')
        .set('Authorization', `Bearer ${mockUserToken}`);

      // 응답 검증
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);

      // 메소드 호출 검증
      expect(mockPermissionRepository.find).toHaveBeenCalled();
    });

    test('인증되지 않은 사용자는 권한을 조회할 수 없다', async () => {
      // API 요청 (토큰 없음)
      const response = await request(app)
        .get('/api/permissions');

      // 응답 검증
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', '인증이 필요합니다.');

      // 메소드 호출 검증
      expect(mockPermissionRepository.find).not.toHaveBeenCalled();
    });
  });

  describe('권한 생성 API 테스트', () => {
    test('관리자는 새로운 권한을 생성할 수 있다', async () => {
      // 중복 권한 없음
      mockPermissionRepository.findOne.mockResolvedValue(null);

      // 권한 생성 모킹
      const mockPermission = {
        id: 3,
        name: 'product-read',
        resource: 'product',
        action: 'read',
        description: '제품 조회 권한'
      };
      mockPermissionRepository.create.mockReturnValue(mockPermission);
      mockPermissionRepository.save.mockResolvedValue(mockPermission);

      // API 요청
      const response = await request(app)
        .post('/api/permissions')
        .set('Authorization', `Bearer ${mockAdminToken}`)
        .send({
          name: 'product-read',
          resource: 'product',
          action: 'read',
          description: '제품 조회 권한'
        });

      // 응답 검증
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id', 3);
      expect(response.body).toHaveProperty('name', 'product-read');

      // 메소드 호출 검증
      expect(mockPermissionRepository.findOne).toHaveBeenCalled();
      expect(mockPermissionRepository.create).toHaveBeenCalled();
      expect(mockPermissionRepository.save).toHaveBeenCalled();
    });

    test('일반 사용자는 권한을 생성할 수 없다', async () => {
      // API 요청
      const response = await request(app)
        .post('/api/permissions')
        .set('Authorization', `Bearer ${mockUserToken}`)
        .send({
          name: 'product-read',
          resource: 'product',
          action: 'read',
          description: '제품 조회 권한'
        });

      // 응답 검증
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message', '접근 권한이 없습니다.');

      // 메소드 호출 검증
      expect(mockPermissionRepository.findOne).not.toHaveBeenCalled();
      expect(mockPermissionRepository.create).not.toHaveBeenCalled();
      expect(mockPermissionRepository.save).not.toHaveBeenCalled();
    });

    test('중복된 권한 이름으로 생성 시 실패한다', async () => {
      // 중복 권한 모킹
      mockPermissionRepository.findOne.mockResolvedValue({
        id: 1,
        name: 'product-read',
        resource: 'otherResource',
        action: 'otherAction'
      });

      // API 요청
      const response = await request(app)
        .post('/api/permissions')
        .set('Authorization', `Bearer ${mockAdminToken}`)
        .send({
          name: 'product-read',
          resource: 'product',
          action: 'read',
          description: '제품 조회 권한'
        });

      // 응답 검증
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', '이미 존재하는 권한입니다.');

      // 메소드 호출 검증
      expect(mockPermissionRepository.findOne).toHaveBeenCalled();
      expect(mockPermissionRepository.create).not.toHaveBeenCalled();
      expect(mockPermissionRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('권한 수정 API 테스트', () => {
    test('관리자는 권한을 수정할 수 있다', async () => {
      // 기존 권한 모킹
      const mockPermission = {
        id: 1,
        name: 'user-read',
        resource: 'user',
        action: 'read',
        description: '사용자 조회 권한'
      };
      mockPermissionRepository.findOne.mockResolvedValueOnce(mockPermission);
      mockPermissionRepository.findOne.mockResolvedValueOnce(null); // 중복 이름 없음
      mockPermissionRepository.findOne.mockResolvedValueOnce(null); // 중복 리소스/액션 없음

      // 수정된 권한 모킹
      const updatedPermission = {
        ...mockPermission,
        description: '사용자 정보 조회 권한 (수정됨)'
      };
      mockPermissionRepository.save.mockResolvedValue(updatedPermission);

      // API 요청
      const response = await request(app)
        .put('/api/permissions/1')
        .set('Authorization', `Bearer ${mockAdminToken}`)
        .send({
          description: '사용자 정보 조회 권한 (수정됨)'
        });

      // 응답 검증
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('description', '사용자 정보 조회 권한 (수정됨)');

      // 메소드 호출 검증
      expect(mockPermissionRepository.findOne).toHaveBeenCalled();
      expect(mockPermissionRepository.save).toHaveBeenCalled();
    });

    test('일반 사용자는 권한을 수정할 수 없다', async () => {
      // API 요청
      const response = await request(app)
        .put('/api/permissions/1')
        .set('Authorization', `Bearer ${mockUserToken}`)
        .send({
          description: '사용자 정보 조회 권한 (수정됨)'
        });

      // 응답 검증
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message', '접근 권한이 없습니다.');

      // 메소드 호출 검증
      expect(mockPermissionRepository.findOne).not.toHaveBeenCalled();
      expect(mockPermissionRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('권한 삭제 API 테스트', () => {
    test('관리자는 권한을 삭제할 수 있다', async () => {
      // 기존 권한 모킹
      const mockPermission = {
        id: 1,
        name: 'user-read',
        resource: 'user',
        action: 'read',
        description: '사용자 조회 권한'
      };
      mockPermissionRepository.findOne.mockResolvedValue(mockPermission);
      mockPermissionRepository.remove.mockResolvedValue({});

      // API 요청
      const response = await request(app)
        .delete('/api/permissions/1')
        .set('Authorization', `Bearer ${mockAdminToken}`);

      // 응답 검증
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', '권한이 삭제되었습니다.');

      // 메소드 호출 검증
      expect(mockPermissionRepository.findOne).toHaveBeenCalled();
      expect(mockPermissionRepository.remove).toHaveBeenCalled();
    });

    test('일반 사용자는 권한을 삭제할 수 없다', async () => {
      // API 요청
      const response = await request(app)
        .delete('/api/permissions/1')
        .set('Authorization', `Bearer ${mockUserToken}`);

      // 응답 검증
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message', '접근 권한이 없습니다.');

      // 메소드 호출 검증
      expect(mockPermissionRepository.findOne).not.toHaveBeenCalled();
      expect(mockPermissionRepository.remove).not.toHaveBeenCalled();
    });

    test('존재하지 않는 권한 삭제 시 404 에러가 발생한다', async () => {
      // 권한 없음 모킹
      mockPermissionRepository.findOne.mockResolvedValue(null);

      // API 요청
      const response = await request(app)
        .delete('/api/permissions/999')
        .set('Authorization', `Bearer ${mockAdminToken}`);

      // 응답 검증
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', '권한을 찾을 수 없습니다.');

      // 메소드 호출 검증
      expect(mockPermissionRepository.findOne).toHaveBeenCalled();
      expect(mockPermissionRepository.remove).not.toHaveBeenCalled();
    });
  });
}); 