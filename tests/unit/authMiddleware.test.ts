import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware, hasRole, hasPermission, AuthRequest } from '../../src/middlewares/authMiddleware';
import { AppDataSource } from '../../src/config/database';
import { User } from '../../src/models/User';
import { Role } from '../../src/models/Role';
import { Permission } from '../../src/models/Permission';

// AppDataSource와 repository 모킹
jest.mock('../../src/config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn()
  }
}));

describe('인증 미들웨어 테스트', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;
  let mockUserRepository: any;

  beforeEach(() => {
    // 각 테스트 전에 목 객체 초기화
    mockRequest = {
      headers: {},
      user: undefined
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    nextFunction = jest.fn();

    // 사용자 리포지토리 모킹
    mockUserRepository = {
      findOne: jest.fn()
    };
    (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockUserRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // 테스트 1: 토큰이 없을 때 401 응답 반환
  test('토큰이 없을 때 401 응답을 반환해야 함', async () => {
    // Authorization 헤더가 없는 요청
    mockRequest.headers = {};

    await authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

    // 401 상태 코드와 에러 메시지로 응답해야 함
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '인증 토큰이 없습니다.' })
    );
    expect(nextFunction).not.toHaveBeenCalled();
  });

  // 테스트 2: 올바르지 않은 형식의 토큰일 때 401 응답 반환
  test('올바르지 않은 형식의 토큰일 때 401 응답을 반환해야 함', async () => {
    // Authorization 헤더는 있지만 잘못된 형식
    mockRequest.headers = { authorization: 'InvalidToken' };

    await authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '유효하지 않은 토큰 형식입니다.' })
    );
    expect(nextFunction).not.toHaveBeenCalled();
  });

  // 테스트 3: 유효하지 않은 토큰일 때 401 응답 반환
  test('유효하지 않은 토큰일 때 401 응답을 반환해야 함', async () => {
    // jwt.verify가 에러를 던지도록 모킹
    mockRequest.headers = { authorization: 'Bearer invalid_token' };
    jest.spyOn(jwt, 'verify').mockImplementation(() => {
      throw new jwt.JsonWebTokenError('invalid token');
    });

    await authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '유효하지 않은 토큰입니다.' })
    );
    expect(nextFunction).not.toHaveBeenCalled();
  });

  // 테스트 4: 유효한 토큰이지만 사용자가 없을 때 401 응답 반환
  test('유효한 토큰이지만 사용자가 없을 때 401 응답을 반환해야 함', async () => {
    // jwt.verify가 디코딩된 토큰을 반환하도록 모킹
    mockRequest.headers = { authorization: 'Bearer valid_token' };
    jest.spyOn(jwt, 'verify').mockImplementation(() => ({ id: 1 } as any));
    
    // 사용자를 찾을 수 없음
    mockUserRepository.findOne.mockResolvedValue(null);

    await authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

    expect(mockUserRepository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 } })
    );
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '사용자를 찾을 수 없습니다.' })
    );
    expect(nextFunction).not.toHaveBeenCalled();
  });

  // 테스트 5: 유효한 토큰과 사용자가 있을 때 req.user 설정 및 next() 호출
  test('유효한 토큰과 사용자가 있을 때 req.user를 설정하고 next()를 호출해야 함', async () => {
    // jwt.verify가 디코딩된 토큰을 반환하도록 모킹
    mockRequest.headers = { authorization: 'Bearer valid_token' };
    jest.spyOn(jwt, 'verify').mockImplementation(() => ({ id: 1 } as any));
    
    // 사용자를 찾음
    const mockUser = { id: 1, username: 'testuser', roles: [] };
    mockUserRepository.findOne.mockResolvedValue(mockUser);

    await authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

    expect(mockUserRepository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ 
        where: { id: 1 },
        relations: ['roles', 'roles.permissions']
      })
    );
    expect(mockRequest.user).toBe(mockUser);
    expect(nextFunction).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
    expect(mockResponse.json).not.toHaveBeenCalled();
  });
});

describe('역할 기반 인가 미들웨어 테스트', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    nextFunction = jest.fn();
  });

  // 테스트 1: 사용자가 없을 때 401 응답 반환
  test('사용자가 없을 때 401 응답을 반환해야 함', () => {
    mockRequest.user = undefined;
    const hasRoleMiddleware = hasRole(['admin']);

    hasRoleMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '인증이 필요합니다.' })
    );
    expect(nextFunction).not.toHaveBeenCalled();
  });

  // 테스트 2: 필요한 역할이 없을 때 403 응답 반환
  test('필요한 역할이 없을 때 403 응답을 반환해야 함', () => {
    mockRequest.user = {
      id: 1,
      username: 'testuser',
      roles: [{ name: 'user', id: 1 } as Role]
    } as User;
    const hasRoleMiddleware = hasRole(['admin']);

    hasRoleMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '접근 권한이 없습니다.' })
    );
    expect(nextFunction).not.toHaveBeenCalled();
  });

  // 테스트 3: 필요한 역할이 있을 때 next() 호출
  test('필요한 역할이 있을 때 next()를 호출해야 함', () => {
    mockRequest.user = {
      id: 1,
      username: 'admin',
      roles: [{ name: 'admin', id: 1 } as Role]
    } as User;
    const hasRoleMiddleware = hasRole(['admin']);

    hasRoleMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
    expect(mockResponse.json).not.toHaveBeenCalled();
  });
});

describe('권한 기반 인가 미들웨어 테스트', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    nextFunction = jest.fn();
  });

  // 테스트 1: 사용자가 없을 때 401 응답 반환
  test('사용자가 없을 때 401 응답을 반환해야 함', () => {
    mockRequest.user = undefined;
    const hasPermissionMiddleware = hasPermission('users', 'read');

    hasPermissionMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '인증이 필요합니다.' })
    );
    expect(nextFunction).not.toHaveBeenCalled();
  });

  // 테스트 2: 필요한 권한이 없을 때 403 응답 반환
  test('필요한 권한이 없을 때 403 응답을 반환해야 함', () => {
    const mockPermission = {
      id: 1,
      name: 'product:read',
      resource: 'products',
      action: 'read'
    } as Permission;

    const mockRole = {
      id: 1,
      name: 'user',
      permissions: [mockPermission]
    } as Role;

    mockRequest.user = {
      id: 1,
      username: 'user',
      roles: [mockRole]
    } as User;

    const hasPermissionMiddleware = hasPermission('users', 'read');

    hasPermissionMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '접근 권한이 없습니다.' })
    );
    expect(nextFunction).not.toHaveBeenCalled();
  });

  // 테스트 3: 필요한 권한이 있을 때 next() 호출
  test('필요한 권한이 있을 때 next()를 호출해야 함', () => {
    const mockPermission = {
      id: 1,
      name: 'user:read',
      resource: 'users',
      action: 'read'
    } as Permission;

    const mockRole = {
      id: 1,
      name: 'user',
      permissions: [mockPermission]
    } as Role;

    mockRequest.user = {
      id: 1,
      username: 'user',
      roles: [mockRole]
    } as User;

    const hasPermissionMiddleware = hasPermission('users', 'read');

    hasPermissionMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
    expect(mockResponse.json).not.toHaveBeenCalled();
  });
}); 