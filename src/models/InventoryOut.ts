import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Product } from './Product';
import { User } from './User';
import { Order } from './Order';

@Entity()
export class InventoryOut {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Product)
    product: Product;

    @Column()
    quantity: number;

    @ManyToOne(() => Order, { nullable: true })
    order: Order;

    @Column({ nullable: true })
    reason: string; // 'order', 'damaged', 'expired', 'other'

    @ManyToOne(() => User)
    createdBy: User;

    @Column({ default: 'pending' })
    status: string; // 'pending', 'approved', 'rejected'

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
} 