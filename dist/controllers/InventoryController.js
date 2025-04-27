"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryController = void 0;
const database_1 = require("../config/database");
const InventoryIn_1 = require("../models/InventoryIn");
const InventoryOut_1 = require("../models/InventoryOut");
const Product_1 = require("../models/Product");
class InventoryController {
    constructor() {
        this.inventoryInRepository = database_1.AppDataSource.getRepository(InventoryIn_1.InventoryIn);
        this.inventoryOutRepository = database_1.AppDataSource.getRepository(InventoryOut_1.InventoryOut);
        this.productRepository = database_1.AppDataSource.getRepository(Product_1.Product);
        // 입고 목록 조회
        this.getAllInventoryIn = async (req, res) => {
            try {
                const inventoryIn = await this.inventoryInRepository.find({
                    relations: ['product', 'createdBy']
                });
                return res.json(inventoryIn);
            }
            catch (error) {
                console.error('입고 목록 조회 중 오류 발생:', error);
                return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
            }
        };
        // 특정 입고 조회
        this.getInventoryInById = async (req, res) => {
            try {
                const { id } = req.params;
                const inventoryIn = await this.inventoryInRepository.findOne({
                    where: { id: parseInt(id) },
                    relations: ['product', 'createdBy']
                });
                if (!inventoryIn) {
                    return res.status(404).json({ message: '입고 기록을 찾을 수 없습니다.' });
                }
                return res.json(inventoryIn);
            }
            catch (error) {
                console.error('입고 조회 중 오류 발생:', error);
                return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
            }
        };
        // 입고 생성
        this.createInventoryIn = async (req, res) => {
            const queryRunner = database_1.AppDataSource.createQueryRunner();
            await queryRunner.connect();
            await queryRunner.startTransaction();
            try {
                const { productId, quantity, unitPrice, supplier, invoiceNumber } = req.body;
                const product = await this.productRepository.findOne({
                    where: { id: productId }
                });
                if (!product) {
                    return res.status(404).json({ message: '제품을 찾을 수 없습니다.' });
                }
                const inventoryIn = this.inventoryInRepository.create({
                    product,
                    quantity,
                    unitPrice,
                    totalPrice: quantity * unitPrice,
                    supplier,
                    invoiceNumber,
                    createdBy: req.user
                });
                await queryRunner.manager.save(inventoryIn);
                // 제품 수량 업데이트
                product.quantity += quantity;
                await queryRunner.manager.save(product);
                await queryRunner.commitTransaction();
                return res.status(201).json(inventoryIn);
            }
            catch (error) {
                await queryRunner.rollbackTransaction();
                console.error('입고 생성 중 오류 발생:', error);
                return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
            }
            finally {
                await queryRunner.release();
            }
        };
        // 입고 수정
        this.updateInventoryIn = async (req, res) => {
            const queryRunner = database_1.AppDataSource.createQueryRunner();
            await queryRunner.connect();
            await queryRunner.startTransaction();
            try {
                const { id } = req.params;
                const { quantity, unitPrice, supplier, invoiceNumber } = req.body;
                const inventoryIn = await this.inventoryInRepository.findOne({
                    where: { id: parseInt(id) },
                    relations: ['product']
                });
                if (!inventoryIn) {
                    return res.status(404).json({ message: '입고 기록을 찾을 수 없습니다.' });
                }
                // 제품 수량 복구
                const product = inventoryIn.product;
                product.quantity -= inventoryIn.quantity;
                // 새로운 수량 적용
                inventoryIn.quantity = quantity;
                inventoryIn.unitPrice = unitPrice;
                inventoryIn.totalPrice = quantity * unitPrice;
                inventoryIn.supplier = supplier;
                inventoryIn.invoiceNumber = invoiceNumber;
                product.quantity += quantity;
                await queryRunner.manager.save(inventoryIn);
                await queryRunner.manager.save(product);
                await queryRunner.commitTransaction();
                return res.json(inventoryIn);
            }
            catch (error) {
                await queryRunner.rollbackTransaction();
                console.error('입고 수정 중 오류 발생:', error);
                return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
            }
            finally {
                await queryRunner.release();
            }
        };
        // 입고 삭제
        this.deleteInventoryIn = async (req, res) => {
            const queryRunner = database_1.AppDataSource.createQueryRunner();
            await queryRunner.connect();
            await queryRunner.startTransaction();
            try {
                const { id } = req.params;
                const inventoryIn = await this.inventoryInRepository.findOne({
                    where: { id: parseInt(id) },
                    relations: ['product']
                });
                if (!inventoryIn) {
                    return res.status(404).json({ message: '입고 기록을 찾을 수 없습니다.' });
                }
                // 제품 수량 복구
                const product = inventoryIn.product;
                product.quantity -= inventoryIn.quantity;
                await queryRunner.manager.save(product);
                await queryRunner.manager.remove(inventoryIn);
                await queryRunner.commitTransaction();
                return res.json({ message: '입고 기록이 삭제되었습니다.' });
            }
            catch (error) {
                await queryRunner.rollbackTransaction();
                console.error('입고 삭제 중 오류 발생:', error);
                return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
            }
            finally {
                await queryRunner.release();
            }
        };
        // 출고 목록 조회
        this.getAllInventoryOut = async (req, res) => {
            try {
                const inventoryOut = await this.inventoryOutRepository.find({
                    relations: ['product', 'createdBy', 'order']
                });
                return res.json(inventoryOut);
            }
            catch (error) {
                console.error('출고 목록 조회 중 오류 발생:', error);
                return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
            }
        };
        // 특정 출고 조회
        this.getInventoryOutById = async (req, res) => {
            try {
                const { id } = req.params;
                const inventoryOut = await this.inventoryOutRepository.findOne({
                    where: { id: parseInt(id) },
                    relations: ['product', 'createdBy', 'order']
                });
                if (!inventoryOut) {
                    return res.status(404).json({ message: '출고 기록을 찾을 수 없습니다.' });
                }
                return res.json(inventoryOut);
            }
            catch (error) {
                console.error('출고 조회 중 오류 발생:', error);
                return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
            }
        };
        // 출고 생성
        this.createInventoryOut = async (req, res) => {
            const queryRunner = database_1.AppDataSource.createQueryRunner();
            await queryRunner.connect();
            await queryRunner.startTransaction();
            try {
                const { productId, quantity, reason } = req.body;
                const product = await this.productRepository.findOne({
                    where: { id: productId }
                });
                if (!product) {
                    return res.status(404).json({ message: '제품을 찾을 수 없습니다.' });
                }
                if (product.quantity < quantity) {
                    return res.status(400).json({ message: '재고가 부족합니다.' });
                }
                const inventoryOut = this.inventoryOutRepository.create({
                    product,
                    quantity,
                    reason,
                    createdBy: req.user
                });
                await queryRunner.manager.save(inventoryOut);
                // 제품 수량 업데이트
                product.quantity -= quantity;
                await queryRunner.manager.save(product);
                await queryRunner.commitTransaction();
                return res.status(201).json(inventoryOut);
            }
            catch (error) {
                await queryRunner.rollbackTransaction();
                console.error('출고 생성 중 오류 발생:', error);
                return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
            }
            finally {
                await queryRunner.release();
            }
        };
        // 출고 수정
        this.updateInventoryOut = async (req, res) => {
            const queryRunner = database_1.AppDataSource.createQueryRunner();
            await queryRunner.connect();
            await queryRunner.startTransaction();
            try {
                const { id } = req.params;
                const { quantity, reason } = req.body;
                const inventoryOut = await this.inventoryOutRepository.findOne({
                    where: { id: parseInt(id) },
                    relations: ['product']
                });
                if (!inventoryOut) {
                    return res.status(404).json({ message: '출고 기록을 찾을 수 없습니다.' });
                }
                // 제품 수량 복구
                const product = inventoryOut.product;
                product.quantity += inventoryOut.quantity;
                // 새로운 수량이 재고보다 많은지 확인
                if (product.quantity < quantity) {
                    return res.status(400).json({ message: '재고가 부족합니다.' });
                }
                // 새로운 수량 적용
                inventoryOut.quantity = quantity;
                inventoryOut.reason = reason;
                product.quantity -= quantity;
                await queryRunner.manager.save(inventoryOut);
                await queryRunner.manager.save(product);
                await queryRunner.commitTransaction();
                return res.json(inventoryOut);
            }
            catch (error) {
                await queryRunner.rollbackTransaction();
                console.error('출고 수정 중 오류 발생:', error);
                return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
            }
            finally {
                await queryRunner.release();
            }
        };
        // 출고 삭제
        this.deleteInventoryOut = async (req, res) => {
            const queryRunner = database_1.AppDataSource.createQueryRunner();
            await queryRunner.connect();
            await queryRunner.startTransaction();
            try {
                const { id } = req.params;
                const inventoryOut = await this.inventoryOutRepository.findOne({
                    where: { id: parseInt(id) },
                    relations: ['product']
                });
                if (!inventoryOut) {
                    return res.status(404).json({ message: '출고 기록을 찾을 수 없습니다.' });
                }
                // 제품 수량 복구
                const product = inventoryOut.product;
                product.quantity += inventoryOut.quantity;
                await queryRunner.manager.save(product);
                await queryRunner.manager.remove(inventoryOut);
                await queryRunner.commitTransaction();
                return res.json({ message: '출고 기록이 삭제되었습니다.' });
            }
            catch (error) {
                await queryRunner.rollbackTransaction();
                console.error('출고 삭제 중 오류 발생:', error);
                return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
            }
            finally {
                await queryRunner.release();
            }
        };
        // 재고 현황 조회
        this.getInventoryStatus = async (req, res) => {
            try {
                const products = await this.productRepository.find({
                    select: ['id', 'name', 'sku', 'quantity', 'minimumQuantity', 'unit']
                });
                const inventoryStatus = products.map(product => ({
                    ...product,
                    status: product.quantity <= product.minimumQuantity ? 'low' : 'normal'
                }));
                return res.json(inventoryStatus);
            }
            catch (error) {
                console.error('재고 현황 조회 중 오류 발생:', error);
                return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
            }
        };
        // 재고 이력 조회
        this.getInventoryHistory = async (req, res) => {
            try {
                const { startDate, endDate, productId } = req.query;
                let whereClause = {};
                if (productId) {
                    whereClause.product = { id: parseInt(productId) };
                }
                if (startDate && endDate) {
                    whereClause.createdAt = {
                        $gte: new Date(startDate),
                        $lte: new Date(endDate)
                    };
                }
                const [inventoryIn, inventoryOut] = await Promise.all([
                    this.inventoryInRepository.find({
                        where: whereClause,
                        relations: ['product', 'createdBy'],
                        order: { createdAt: 'DESC' }
                    }),
                    this.inventoryOutRepository.find({
                        where: whereClause,
                        relations: ['product', 'createdBy', 'order'],
                        order: { createdAt: 'DESC' }
                    })
                ]);
                // 이력을 시간순으로 정렬
                const history = [
                    ...inventoryIn.map(item => ({
                        ...item,
                        type: 'in'
                    })),
                    ...inventoryOut.map(item => ({
                        ...item,
                        type: 'out'
                    }))
                ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
                return res.json(history);
            }
            catch (error) {
                console.error('재고 이력 조회 중 오류 발생:', error);
                return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
            }
        };
    }
}
exports.InventoryController = InventoryController;
