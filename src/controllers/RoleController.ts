import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Role } from '../models/Role';
import { Permission } from '../models/Permission';
import { AuthRequest } from '../middlewares/authMiddleware';

export class RoleController {
    private roleRepository = AppDataSource.getRepository(Role);
    private permissionRepository = AppDataSource.getRepository(Permission);

    // 모든 역할 조회
    public getAllRoles = async (req: Request, res: Response) => {
        try {
            const roles = await this.roleRepository.find({
                relations: ['permissions']
            });
            
            return res.json(roles);
        } catch (error) {
            console.error('역할 조회 중 오류 발생:', error);
            return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
        }
    };

    // 특정 역할 조회
    public getRoleById = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const role = await this.roleRepository.findOne({
                where: { id: parseInt(id) },
                relations: ['permissions']
            });

            if (!role) {
                return res.status(404).json({ message: '역할을 찾을 수 없습니다.' });
            }

            return res.json(role);
        } catch (error) {
            console.error('역할 조회 중 오류 발생:', error);
            return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
        }
    };

    // 역할 생성
    public createRole = async (req: Request, res: Response) => {
        try {
            const { name, description, permissionIds } = req.body;

            // 이름은 필수
            if (!name) {
                return res.status(400).json({ message: '역할 이름은 필수입니다.' });
            }

            // 역할 이름 중복 확인
            const existingRole = await this.roleRepository.findOne({ where: { name } });
            if (existingRole) {
                return res.status(400).json({ message: '이미 존재하는 역할 이름입니다.' });
            }

            // 권한 목록 조회
            let permissions: Permission[] = [];
            if (permissionIds && permissionIds.length > 0) {
                permissions = await this.permissionRepository.findByIds(permissionIds);
            }

            // 새 역할 생성
            const role = this.roleRepository.create({
                name,
                description,
                permissions
            });

            await this.roleRepository.save(role);

            return res.status(201).json(role);
        } catch (error) {
            console.error('역할 생성 중 오류 발생:', error);
            return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
        }
    };

    // 역할 수정
    public updateRole = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { name, description, permissionIds } = req.body;

            // 역할 조회
            const role = await this.roleRepository.findOne({
                where: { id: parseInt(id) },
                relations: ['permissions']
            });

            if (!role) {
                return res.status(404).json({ message: '역할을 찾을 수 없습니다.' });
            }

            // 이름 변경 시 중복 확인
            if (name && name !== role.name) {
                const existingRole = await this.roleRepository.findOne({ where: { name } });
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
                const permissions = await this.permissionRepository.findByIds(permissionIds);
                role.permissions = permissions;
            }

            await this.roleRepository.save(role);

            return res.json(role);
        } catch (error) {
            console.error('역할 수정 중 오류 발생:', error);
            return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
        }
    };

    // 역할 삭제
    public deleteRole = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            // 역할 조회
            const role = await this.roleRepository.findOne({
                where: { id: parseInt(id) }
            });

            if (!role) {
                return res.status(404).json({ message: '역할을 찾을 수 없습니다.' });
            }

            // 기본 역할 삭제 방지
            if (role.name === 'admin' || role.name === 'user') {
                return res.status(400).json({ message: '기본 역할은 삭제할 수 없습니다.' });
            }

            await this.roleRepository.remove(role);

            return res.json({ message: '역할이 삭제되었습니다.' });
        } catch (error) {
            console.error('역할 삭제 중 오류 발생:', error);
            return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
        }
    };
} 