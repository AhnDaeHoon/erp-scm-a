import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Product } from './Product';
import { User } from './User';

@Entity()
export class InventoryIn {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Product)
    product: Product;

    @Column()
    quantity: number;

    @Column('decimal', { precision: 10, scale: 2 })
    unitPrice: number;

    @Column('decimal', { precision: 10, scale: 2 })
    totalPrice: number;

    @Column()
    supplier: string;

    @Column({ nullable: true })
    invoiceNumber: string;

    @ManyToOne(() => User)
    createdBy: User;

    @Column({ default: 'pending' })
    status: string; // 'pending', 'approved', 'rejected'

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
} 