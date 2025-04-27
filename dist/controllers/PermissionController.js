"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionController = void 0;
const database_1 = require("../config/database");
const Permission_1 = require("../models/Permission");
class PermissionController {
    constructor() {
        this.permissionRepository = database_1.AppDataSource.getRepository(Permission_1.Permission);
        // 모든 권한 조회
        this.getAllPermissions = async (req, res) => {
            try {
                const permissions = await this.permissionRepository.find();
                return res.json(permissions);
            }
            catch (error) {
                console.error('권한 조회 중 오류 발생:', error);
                return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
            }
        };
        // 특정 권한 조회
        this.getPermissionById = async (req, res) => {
            try {
                const { id } = req.params;
                const permission = await this.permissionRepository.findOne({
                    where: { id: parseInt(id) }
                });
                if (!permission) {
                    return res.status(404).json({ message: '권한을 찾을 수 없습니다.' });
                }
                return res.json(permission);
            }
            catch (error) {
                console.error('권한 조회 중 오류 발생:', error);
                return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
            }
        };
        // 권한 생성
        this.createPermission = async (req, res) => {
            try {
                const { name, description, resource, action } = req.body;
                // 필수 필드 검증
                if (!name || !resource || !action) {
                    return res.status(400).json({ message: '이름, 리소스, 액션은 필수 필드입니다.' });
                }
                // 권한 중복 확인
                const existingPermission = await this.permissionRepository.findOne({
                    where: [{ name }, { resource, action }]
                });
                if (existingPermission) {
                    return res.status(400).json({ message: '이미 존재하는 권한입니다.' });
                }
                // 새 권한 생성
                const permission = this.permissionRepository.create({
                    name,
                    description,
                    resource,
                    action
                });
                await this.permissionRepository.save(permission);
                return res.status(201).json(permission);
            }
            catch (error) {
                console.error('권한 생성 중 오류 발생:', error);
                return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
            }
        };
        // 권한 수정
        this.updatePermission = async (req, res) => {
            try {
                const { id } = req.params;
                const { name, description, resource, action } = req.body;
                // 권한 조회
                const permission = await this.permissionRepository.findOne({
                    where: { id: parseInt(id) }
                });
                if (!permission) {
                    return res.status(404).json({ message: '권한을 찾을 수 없습니다.' });
                }
                // 이름 중복 확인
                if (name && name !== permission.name) {
                    const existingPermission = await this.permissionRepository.findOne({
                        where: { name }
                    });
                    if (existingPermission) {
                        return res.status(400).json({ message: '이미 존재하는 권한 이름입니다.' });
                    }
                    permission.name = name;
                }
                // 리소스와 액션 중복 확인
                if ((resource && resource !== permission.resource) || (action && action !== permission.action)) {
                    const existingPermission = await this.permissionRepository.findOne({
                        where: {
                            resource: resource || permission.resource,
                            action: action || permission.action
                        }
                    });
                    if (existingPermission && existingPermission.id !== permission.id) {
                        return res.status(400).json({ message: '이미 존재하는 리소스/액션 조합입니다.' });
                    }
                }
                // 업데이트
                if (description !== undefined)
                    permission.description = description;
                if (resource)
                    permission.resource = resource;
                if (action)
                    permission.action = action;
                await this.permissionRepository.save(permission);
                return res.json(permission);
            }
            catch (error) {
                console.error('권한 수정 중 오류 발생:', error);
                return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
            }
        };
        // 권한 삭제
        this.deletePermission = async (req, res) => {
            try {
                const { id } = req.params;
                // 권한 조회
                const permission = await this.permissionRepository.findOne({
                    where: { id: parseInt(id) }
                });
                if (!permission) {
                    return res.status(404).json({ message: '권한을 찾을 수 없습니다.' });
                }
                await this.permissionRepository.remove(permission);
                return res.json({ message: '권한이 삭제되었습니다.' });
            }
            catch (error) {
                console.error('권한 삭제 중 오류 발생:', error);
                return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
            }
        };
    }
}
exports.PermissionController = PermissionController;
