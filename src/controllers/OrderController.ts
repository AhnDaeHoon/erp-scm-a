import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Order } from '../models/Order';
import { OrderItem } from '../models/OrderItem';
import { Product } from '../models/Product';
import { InventoryOut } from '../models/InventoryOut';
import { AuthRequest } from '../middlewares/authMiddleware';

export class OrderController {
    private orderRepository = AppDataSource.getRepository(Order);
    private orderItemRepository = AppDataSource.getRepository(OrderItem);
    private productRepository = AppDataSource.getRepository(Product);
    private inventoryOutRepository = AppDataSource.getRepository(InventoryOut);

    // 전체 주문 조회
    public getAllOrders = async (req: AuthRequest, res: Response) => {
        try {
            const orders = await this.orderRepository.find({
                relations: ['items', 'items.product']
            });
            return res.json(orders);
        } catch (error) {
            console.error('주문 조회 중 오류 발생:', error);
            return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
        }
    };

    // 특정 주문 조회
    public getOrderById = async (req: AuthRequest, res: Response) => {
        try {
            const { id } = req.params;
            const order = await this.orderRepository.findOne({
                where: { id: parseInt(id) },
                relations: ['items', 'items.product']
            });

            if (!order) {
                return res.status(404).json({ message: '주문을 찾을 수 없습니다.' });
            }

            return res.json(order);
        } catch (error) {
            console.error('주문 조회 중 오류 발생:', error);
            return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
        }
    };

    // 주문 생성
    public createOrder = async (req: AuthRequest, res: Response) => {
        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const {
                customerName,
                customerEmail,
                customerPhone,
                shippingAddress,
                items
            } = req.body;

            // 주문 번호 생성 (예: ORD-20240315-001)
            const today = new Date();
            const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
            const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            const orderNumber = `ORD-${dateStr}-${randomNum}`;

            // 주문 생성
            const order = this.orderRepository.create({
                orderNumber,
                customerName,
                customerEmail,
                customerPhone,
                shippingAddress,
                totalAmount: 0,
                status: 'pending'
            });

            await queryRunner.manager.save(order);

            let totalAmount = 0;

            // 주문 항목 생성 및 재고 확인
            for (const item of items) {
                const product = await this.productRepository.findOne({
                    where: { id: item.productId }
                });

                if (!product) {
                    throw new Error(`제품 ID ${item.productId}를 찾을 수 없습니다.`);
                }

                if (product.quantity < item.quantity) {
                    throw new Error(`제품 ${product.name}의 재고가 부족합니다.`);
                }

                const orderItem = this.orderItemRepository.create({
                    order,
                    product,
                    quantity: item.quantity,
                    unitPrice: product.price,
                    totalPrice: product.price * item.quantity
                });

                await queryRunner.manager.save(orderItem);

                // 재고 출고 처리
                const inventoryOut = this.inventoryOutRepository.create({
                    product,
                    quantity: item.quantity,
                    reason: `주문 번호: ${orderNumber}`,
                    order,
                    createdBy: req.user
                });

                await queryRunner.manager.save(inventoryOut);

                // 제품 재고 업데이트
                product.quantity -= item.quantity;
                await queryRunner.manager.save(product);

                totalAmount += orderItem.totalPrice;
            }

            // 주문 총액 업데이트
            order.totalAmount = totalAmount;
            await queryRunner.manager.save(order);

            await queryRunner.commitTransaction();

            return res.status(201).json(order);
        } catch (error: any) {
            await queryRunner.rollbackTransaction();
            console.error('주문 생성 중 오류 발생:', error);
            return res.status(500).json({ message: error.message || '서버 오류가 발생했습니다.' });
        } finally {
            await queryRunner.release();
        }
    };

    // 주문 상태 업데이트
    public updateOrderStatus = async (req: AuthRequest, res: Response) => {
        try {
            const { id } = req.params;
            const { status } = req.body;

            const order = await this.orderRepository.findOne({
                where: { id: parseInt(id) }
            });

            if (!order) {
                return res.status(404).json({ message: '주문을 찾을 수 없습니다.' });
            }

            order.status = status;
            await this.orderRepository.save(order);

            return res.json(order);
        } catch (error) {
            console.error('주문 상태 업데이트 중 오류 발생:', error);
            return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
        }
    };

    // 주문 삭제
    public deleteOrder = async (req: AuthRequest, res: Response) => {
        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const { id } = req.params;

            const order = await this.orderRepository.findOne({
                where: { id: parseInt(id) },
                relations: ['items', 'items.product']
            });

            if (!order) {
                return res.status(404).json({ message: '주문을 찾을 수 없습니다.' });
            }

            // 주문이 완료된 경우 삭제 불가
            if (order.status === 'completed') {
                return res.status(400).json({ message: '완료된 주문은 삭제할 수 없습니다.' });
            }

            // 재고 복구
            for (const item of order.items) {
                const product = item.product;
                product.quantity += item.quantity;
                await queryRunner.manager.save(product);
            }

            // 관련된 출고 기록 삭제
            await queryRunner.manager.delete(InventoryOut, { order: { id: order.id } });

            // 주문 항목 삭제
            await queryRunner.manager.delete(OrderItem, { order: { id: order.id } });

            // 주문 삭제
            await queryRunner.manager.remove(order);

            await queryRunner.commitTransaction();

            return res.json({ message: '주문이 삭제되었습니다.' });
        } catch (error) {
            await queryRunner.rollbackTransaction();
            console.error('주문 삭제 중 오류 발생:', error);
            return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
        } finally {
            await queryRunner.release();
        }
    };

    // 주문 항목 조회
    public getOrderItems = async (req: AuthRequest, res: Response) => {
        try {
            const { id } = req.params;
            const orderItems = await this.orderItemRepository.find({
                where: { order: { id: parseInt(id) } },
                relations: ['product']
            });

            return res.json(orderItems);
        } catch (error) {
            console.error('주문 항목 조회 중 오류 발생:', error);
            return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
        }
    };

    // 주문 업데이트
    public updateOrder = async (req: AuthRequest, res: Response) => {
        try {
            const { id } = req.params;
            const { customerName, customerEmail, customerPhone, shippingAddress } = req.body;

            const order = await this.orderRepository.findOne({
                where: { id: parseInt(id) }
            });

            if (!order) {
                return res.status(404).json({ message: '주문을 찾을 수 없습니다.' });
            }

            // 주문이 배송 중이거나 완료된 경우 수정 불가
            if (order.status === 'shipped' || order.status === 'completed') {
                return res.status(400).json({ message: '배송 중이거나 완료된 주문은 수정할 수 없습니다.' });
            }

            // 주문 정보 업데이트
            order.customerName = customerName || order.customerName;
            order.customerEmail = customerEmail || order.customerEmail;
            order.customerPhone = customerPhone || order.customerPhone;
            order.shippingAddress = shippingAddress || order.shippingAddress;

            await this.orderRepository.save(order);

            return res.json({ message: '주문이 성공적으로 업데이트되었습니다.', order });
        } catch (error: any) {
            console.error('주문 업데이트 중 오류 발생:', error);
            return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
        }
    };
} 