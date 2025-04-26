import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Product } from '../models/Product';
import { InventoryIn } from '../models/InventoryIn';
import { InventoryOut } from '../models/InventoryOut';
import { AuthRequest } from '../middlewares/authMiddleware';

export class ProductController {
    private productRepository = AppDataSource.getRepository(Product);
    private inventoryInRepository = AppDataSource.getRepository(InventoryIn);
    private inventoryOutRepository = AppDataSource.getRepository(InventoryOut);

    // 전체 제품 조회
    public getAllProducts = async (req: Request, res: Response) => {
        try {
            const products = await this.productRepository.find();
            return res.json(products);
        } catch (error) {
            console.error('제품 조회 중 오류 발생:', error);
            return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
        }
    };

    // 특정 제품 조회
    public getProductById = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const product = await this.productRepository.findOne({ where: { id: parseInt(id) } });

            if (!product) {
                return res.status(404).json({ message: '제품을 찾을 수 없습니다.' });
            }

            return res.json(product);
        } catch (error) {
            console.error('제품 조회 중 오류 발생:', error);
            return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
        }
    };

    // 제품 생성
    public createProduct = async (req: AuthRequest, res: Response) => {
        try {
            const { name, description, sku, price, cost, unit, minimumQuantity } = req.body;

            const product = this.productRepository.create({
                name,
                description,
                sku,
                price,
                cost,
                unit,
                minimumQuantity,
                quantity: 0
            });

            await this.productRepository.save(product);

            return res.status(201).json(product);
        } catch (error) {
            console.error('제품 생성 중 오류 발생:', error);
            return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
        }
    };

    // 제품 수정
    public updateProduct = async (req: AuthRequest, res: Response) => {
        try {
            const { id } = req.params;
            const { name, description, sku, price, cost, unit, minimumQuantity } = req.body;

            const product = await this.productRepository.findOne({ where: { id: parseInt(id) } });
            if (!product) {
                return res.status(404).json({ message: '제품을 찾을 수 없습니다.' });
            }

            product.name = name || product.name;
            product.description = description || product.description;
            product.sku = sku || product.sku;
            product.price = price || product.price;
            product.cost = cost || product.cost;
            product.unit = unit || product.unit;
            product.minimumQuantity = minimumQuantity || product.minimumQuantity;

            await this.productRepository.save(product);

            return res.json(product);
        } catch (error) {
            console.error('제품 수정 중 오류 발생:', error);
            return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
        }
    };

    // 제품 삭제
    public deleteProduct = async (req: AuthRequest, res: Response) => {
        try {
            const { id } = req.params;

            const product = await this.productRepository.findOne({ where: { id: parseInt(id) } });
            if (!product) {
                return res.status(404).json({ message: '제품을 찾을 수 없습니다.' });
            }

            await this.productRepository.remove(product);

            return res.json({ message: '제품이 삭제되었습니다.' });
        } catch (error) {
            console.error('제품 삭제 중 오류 발생:', error);
            return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
        }
    };

    // 재고 이력 조회
    public getInventoryHistory = async (req: AuthRequest, res: Response) => {
        try {
            const { id } = req.params;
            const product = await this.productRepository.findOne({ where: { id: parseInt(id) } });

            if (!product) {
                return res.status(404).json({ message: '제품을 찾을 수 없습니다.' });
            }

            const inventoryIn = await this.inventoryInRepository.find({
                where: { product: { id: parseInt(id) } },
                relations: ['createdBy']
            });

            const inventoryOut = await this.inventoryOutRepository.find({
                where: { product: { id: parseInt(id) } },
                relations: ['createdBy', 'order']
            });

            return res.json({
                product,
                inventoryIn,
                inventoryOut
            });
        } catch (error) {
            console.error('재고 이력 조회 중 오류 발생:', error);
            return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
        }
    };

    // 입고 처리
    public addInventory = async (req: AuthRequest, res: Response) => {
        try {
            const { id } = req.params;
            const { quantity, unitPrice, supplier, invoiceNumber } = req.body;

            const product = await this.productRepository.findOne({ where: { id: parseInt(id) } });
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

            await this.inventoryInRepository.save(inventoryIn);

            // 제품 수량 업데이트
            product.quantity += quantity;
            await this.productRepository.save(product);

            return res.status(201).json(inventoryIn);
        } catch (error) {
            console.error('입고 처리 중 오류 발생:', error);
            return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
        }
    };

    // 출고 처리
    public removeInventory = async (req: AuthRequest, res: Response) => {
        try {
            const { id } = req.params;
            const { quantity, reason } = req.body;

            const product = await this.productRepository.findOne({ where: { id: parseInt(id) } });
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

            await this.inventoryOutRepository.save(inventoryOut);

            // 제품 수량 업데이트
            product.quantity -= quantity;
            await this.productRepository.save(product);

            return res.status(201).json(inventoryOut);
        } catch (error) {
            console.error('출고 처리 중 오류 발생:', error);
            return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
        }
    };
} 