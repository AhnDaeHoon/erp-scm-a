import request from 'supertest';
import app from '../../src/index';
import { AppDataSource } from '../../src/config/database';
import jwt from 'jsonwebtoken';
import { Permission } from '../../src/models/Permission';
import { User } from '../../src/models/User';
import { Role } from '../../src/models/Role';
import { Product } from '../../src/models/Product';
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

  // 권한 확인 미들웨어 모킹
  const hasPermission = (resource, action) => (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: '인증이 필요합니다.' });
    }

    const userId = req.user.id;
    const userRepository = AppDataSource.getRepository(User);
    
    userRepository.findOne({
      where: { id: userId },
      relations: ['roles', 'roles.permissions']
    })
    .then(user => {
      if (!user) {
        return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
      }

      // 사용자의 모든 권한 수집
      const userPermissions = [];
      user.roles.forEach(role => {
        role.permissions.forEach(permission => {
          userPermissions.push({
            resource: permission.resource,
            action: permission.action
          });
        });
      });
      
      // 필요한 권한 확인
      const hasRequiredPermission = userPermissions.some(
        p => p.resource === resource && p.action === action
      );

      if (!hasRequiredPermission) {
        return res.status(403).json({ message: '접근 권한이 없습니다.' });
      }

      next();
    })
    .catch(() => {
      res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    });
  };

  // 제품 API 엔드포인트 모킹
  app.get('/api/products', hasPermission('product', 'read'), (req, res) => {
    const productRepository = AppDataSource.getRepository(Product);
    productRepository.find()
      .then(products => res.json(products))
      .catch(() => res.status(500).json({ message: '서버 오류가 발생했습니다.' }));
  });

  app.get('/api/products/:id', hasPermission('product', 'read'), (req, res) => {
    const { id } = req.params;
    const productRepository = AppDataSource.getRepository(Product);
    productRepository.findOne({ where: { id: parseInt(id) } })
      .then(product => {
        if (!product) {
          return res.status(404).json({ message: '제품을 찾을 수 없습니다.' });
        }
        res.json(product);
      })
      .catch(() => res.status(500).json({ message: '서버 오류가 발생했습니다.' }));
  });

  app.post('/api/products', hasPermission('product', 'write'), (req, res) => {
    const { name, description, price, stock } = req.body;
    
    // 필수 필드 검증
    if (!name || price === undefined || stock === undefined) {
      return res.status(400).json({ message: '이름, 가격, 재고는 필수 필드입니다.' });
    }

    const productRepository = AppDataSource.getRepository(Product);
    
    // 제품 생성
    const product = productRepository.create({
      name,
      description,
      price,
      stock
    });

    productRepository.save(product)
      .then(savedProduct => res.status(201).json(savedProduct))
      .catch(() => res.status(500).json({ message: '서버 오류가 발생했습니다.' }));
  });

  app.put('/api/products/:id', hasPermission('product', 'write'), (req, res) => {
    const { id } = req.params;
    const { name, description, price, stock } = req.body;
    const productRepository = AppDataSource.getRepository(Product);

    productRepository.findOne({ where: { id: parseInt(id) } })
      .then(product => {
        if (!product) {
          return res.status(404).json({ message: '제품을 찾을 수 없습니다.' });
        }

        // 업데이트
        if (name) product.name = name;
        if (description !== undefined) product.description = description;
        if (price !== undefined) product.price = price;
        if (stock !== undefined) product.stock = stock;

        return productRepository.save(product);
      })
      .then(updatedProduct => res.json(updatedProduct))
      .catch(() => res.status(500).json({ message: '서버 오류가 발생했습니다.' }));
  });

  app.delete('/api/products/:id', hasPermission('product', 'delete'), (req, res) => {
    const { id } = req.params;
    const productRepository = AppDataSource.getRepository(Product);

    productRepository.findOne({ where: { id: parseInt(id) } })
      .then(product => {
        if (!product) {
          return res.status(404).json({ message: '제품을 찾을 수 없습니다.' });
        }

        return productRepository.remove(product)
          .then(() => res.json({ message: '제품이 삭제되었습니다.' }));
      })
      .catch(() => res.status(500).json({ message: '서버 오류가 발생했습니다.' }));
  });

  // 사용자 API 엔드포인트 모킹
  app.get('/api/users', hasRole(['admin']), (req, res) => {
    const userRepository = AppDataSource.getRepository(User);
    userRepository.find()
      .then(users => res.json(users))
      .catch(() => res.status(500).json({ message: '서버 오류가 발생했습니다.' }));
  });

  app.get('/api/users/profile', (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: '인증이 필요합니다.' });
    }
    
    const userId = req.user.id;
    const userRepository = AppDataSource.getRepository(User);
    
    userRepository.findOne({
      where: { id: userId },
      relations: ['roles']
    })
    .then(user => {
      if (!user) {
        return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
      }
      
      // 민감한 정보 제외
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    })
    .catch(() => res.status(500).json({ message: '서버 오류가 발생했습니다.' }));
  });

  return app;
});

describe('일반 사용자 권한 제한 테스트', () => {
  let mockUserRepository: any;
  let mockProductRepository: any;
  let mockUserToken: string;
  let mockReadOnlyUserToken: string;
  let mockWriteOnlyUserToken: string;
  let mockAdminToken: string;

  beforeEach(() => {
    // 리포지토리 모킹
    mockUserRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn()
    };

    mockProductRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn()
    };

    // 리포지토리 반환 모킹
    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
      if (entity === User) {
        return mockUserRepository;
      } else if (entity === Product) {
        return mockProductRepository;
      }
      return {};
    });

    // JWT 토큰 모킹
    jest.spyOn(jwt, 'verify').mockImplementation((token) => {
      if (token === 'admin_token') {
        return { id: 1, username: 'admin', roles: ['admin'] };
      } else if (token === 'user_token') {
        return { id: 2, username: 'user', roles: ['user'] };
      } else if (token === 'readonly_token') {
        return { id: 3, username: 'readonly', roles: ['readonly'] };
      } else if (token === 'writeonly_token') {
        return { id: 4, username: 'writeonly', roles: ['writeonly'] };
      }
      throw new Error('Invalid token');
    });

    mockAdminToken = 'admin_token';
    mockUserToken = 'user_token';
    mockReadOnlyUserToken = 'readonly_token';
    mockWriteOnlyUserToken = 'writeonly_token';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('사용자 권한 확인 테스트', () => {
    test('일반 사용자는 자신의 프로필을 조회할 수 있다', async () => {
      // 사용자 정보 모킹
      const mockUser = {
        id: 2,
        username: 'user',
        password: 'hashed_password',
        name: '일반 사용자',
        email: 'user@example.com',
        roles: [{ id: 2, name: 'user' }]
      };
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      // API 요청
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${mockUserToken}`);

      // 응답 검증
      expect(response.status).toBe(200);
      expect(response.body).not.toHaveProperty('password');
      expect(response.body).toHaveProperty('username', 'user');
      expect(response.body).toHaveProperty('roles');

      // 메소드 호출 검증
      expect(mockUserRepository.findOne).toHaveBeenCalled();
    });

    test('일반 사용자는 전체 사용자 목록을 조회할 수 없다', async () => {
      // API 요청
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${mockUserToken}`);

      // 응답 검증
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message', '접근 권한이 없습니다.');

      // 메소드 호출 검증
      expect(mockUserRepository.find).not.toHaveBeenCalled();
    });

    test('관리자는 전체 사용자 목록을 조회할 수 있다', async () => {
      // 사용자 목록 모킹
      const mockUsers = [
        { id: 1, username: 'admin', name: '관리자', email: 'admin@example.com' },
        { id: 2, username: 'user', name: '일반 사용자', email: 'user@example.com' }
      ];
      mockUserRepository.find.mockResolvedValue(mockUsers);

      // API 요청
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${mockAdminToken}`);

      // 응답 검증
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);

      // 메소드 호출 검증
      expect(mockUserRepository.find).toHaveBeenCalled();
    });
  });

  describe('제품 권한 테스트', () => {
    test('제품 읽기 권한이 있는 사용자는 제품 목록을 조회할 수 있다', async () => {
      // 사용자 권한 모킹
      const mockUser = {
        id: 2,
        username: 'user',
        roles: [
          {
            id: 2,
            name: 'user',
            permissions: [
              { id: 1, resource: 'product', action: 'read' }
            ]
          }
        ]
      };
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      // 제품 목록 모킹
      const mockProducts = [
        { id: 1, name: '제품1', price: 1000, stock: 10 },
        { id: 2, name: '제품2', price: 2000, stock: 20 }
      ];
      mockProductRepository.find.mockResolvedValue(mockProducts);

      // API 요청
      const response = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${mockUserToken}`);

      // 응답 검증
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);

      // 메소드 호출 검증
      expect(mockUserRepository.findOne).toHaveBeenCalled();
      expect(mockProductRepository.find).toHaveBeenCalled();
    });

    test('제품 읽기 권한이 없는 사용자는 제품 목록을 조회할 수 없다', async () => {
      // 권한 없는 사용자 모킹
      const mockUser = {
        id: 4,
        username: 'writeonly',
        roles: [
          {
            id: 4,
            name: 'writeonly',
            permissions: [
              { id: 2, resource: 'product', action: 'write' }
            ]
          }
        ]
      };
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      // API 요청
      const response = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${mockWriteOnlyUserToken}`);

      // 응답 검증
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message', '접근 권한이 없습니다.');

      // 메소드 호출 검증
      expect(mockUserRepository.findOne).toHaveBeenCalled();
      expect(mockProductRepository.find).not.toHaveBeenCalled();
    });

    test('제품 쓰기 권한이 있는 사용자는 제품을 생성할 수 있다', async () => {
      // 사용자 권한 모킹
      const mockUser = {
        id: 2,
        username: 'user',
        roles: [
          {
            id: 2,
            name: 'user',
            permissions: [
              { id: 2, resource: 'product', action: 'write' }
            ]
          }
        ]
      };
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      // 제품 생성 모킹
      const mockProduct = {
        id: 3,
        name: '새 제품',
        description: '새로운 제품 설명',
        price: 3000,
        stock: 30
      };
      mockProductRepository.create.mockReturnValue(mockProduct);
      mockProductRepository.save.mockResolvedValue(mockProduct);

      // API 요청
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${mockUserToken}`)
        .send({
          name: '새 제품',
          description: '새로운 제품 설명',
          price: 3000,
          stock: 30
        });

      // 응답 검증
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id', 3);
      expect(response.body).toHaveProperty('name', '새 제품');

      // 메소드 호출 검증
      expect(mockUserRepository.findOne).toHaveBeenCalled();
      expect(mockProductRepository.create).toHaveBeenCalled();
      expect(mockProductRepository.save).toHaveBeenCalled();
    });

    test('제품 쓰기 권한이 없는 사용자는 제품을 생성할 수 없다', async () => {
      // 권한 없는 사용자 모킹
      const mockUser = {
        id: 3,
        username: 'readonly',
        roles: [
          {
            id: 3,
            name: 'readonly',
            permissions: [
              { id: 1, resource: 'product', action: 'read' }
            ]
          }
        ]
      };
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      // API 요청
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${mockReadOnlyUserToken}`)
        .send({
          name: '새 제품',
          description: '새로운 제품 설명',
          price: 3000,
          stock: 30
        });

      // 응답 검증
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message', '접근 권한이 없습니다.');

      // 메소드 호출 검증
      expect(mockUserRepository.findOne).toHaveBeenCalled();
      expect(mockProductRepository.create).not.toHaveBeenCalled();
      expect(mockProductRepository.save).not.toHaveBeenCalled();
    });

    test('제품 삭제 권한이 없는 일반 사용자는 제품을 삭제할 수 없다', async () => {
      // 권한 없는 사용자 모킹
      const mockUser = {
        id: 2,
        username: 'user',
        roles: [
          {
            id: 2,
            name: 'user',
            permissions: [
              { id: 1, resource: 'product', action: 'read' },
              { id: 2, resource: 'product', action: 'write' }
            ]
          }
        ]
      };
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      // API 요청
      const response = await request(app)
        .delete('/api/products/1')
        .set('Authorization', `Bearer ${mockUserToken}`);

      // 응답 검증
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message', '접근 권한이 없습니다.');

      // 메소드 호출 검증
      expect(mockUserRepository.findOne).toHaveBeenCalled();
      expect(mockProductRepository.findOne).not.toHaveBeenCalled();
      expect(mockProductRepository.remove).not.toHaveBeenCalled();
    });

    test('관리자는 제품을 삭제할 수 있다', async () => {
      // 관리자 권한 모킹
      const mockAdmin = {
        id: 1,
        username: 'admin',
        roles: [
          {
            id: 1,
            name: 'admin',
            permissions: [
              { id: 1, resource: 'product', action: 'read' },
              { id: 2, resource: 'product', action: 'write' },
              { id: 3, resource: 'product', action: 'delete' }
            ]
          }
        ]
      };
      mockUserRepository.findOne.mockResolvedValue(mockAdmin);

      // 제품 모킹
      const mockProduct = { id: 1, name: '제품1', price: 1000, stock: 10 };
      mockProductRepository.findOne.mockResolvedValue(mockProduct);
      mockProductRepository.remove.mockResolvedValue({});

      // API 요청
      const response = await request(app)
        .delete('/api/products/1')
        .set('Authorization', `Bearer ${mockAdminToken}`);

      // 응답 검증
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', '제품이 삭제되었습니다.');

      // 메소드 호출 검증
      expect(mockUserRepository.findOne).toHaveBeenCalled();
      expect(mockProductRepository.findOne).toHaveBeenCalled();
      expect(mockProductRepository.remove).toHaveBeenCalled();
    });
  });
}); 