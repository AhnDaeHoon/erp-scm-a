import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { OrderItem } from './OrderItem';

@Entity()
export class Order {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    orderNumber: string;

    @Column()
    customerName: string;

    @Column()
    customerEmail: string;

    @Column()
    customerPhone: string;

    @Column()
    shippingAddress: string;

    @Column('decimal', { precision: 10, scale: 2 })
    totalAmount: number;

    @Column({ default: 'pending' })
    status: string; // 'pending', 'processing', 'shipped', 'delivered', 'cancelled'

    @OneToMany(() => OrderItem, orderItem => orderItem.order)
    items: OrderItem[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
} 