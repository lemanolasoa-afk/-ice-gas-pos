import { Product } from '../types'

export const products: Product[] = [
  // น้ำแข็ง
  { id: 'ice-1', name: 'น้ำแข็งหลอดเล็ก', price: 10, category: 'ice', unit: 'ถุง', stock: 100, low_stock_threshold: 10 },
  { id: 'ice-2', name: 'น้ำแข็งหลอดใหญ่', price: 20, category: 'ice', unit: 'ถุง', stock: 100, low_stock_threshold: 10 },
  { id: 'ice-3', name: 'น้ำแข็งซอง 3 กก.', price: 15, category: 'ice', unit: 'ซอง', stock: 100, low_stock_threshold: 10 },
  { id: 'ice-4', name: 'น้ำแข็งซอง 5 กก.', price: 25, category: 'ice', unit: 'ซอง', stock: 100, low_stock_threshold: 10 },
  { id: 'ice-5', name: 'น้ำแข็งบด', price: 30, category: 'ice', unit: 'ถุง', stock: 100, low_stock_threshold: 10 },
  
  // แก๊ส
  { id: 'gas-1', name: 'แก๊สถัง 4 กก.', price: 200, category: 'gas', unit: 'ถัง', stock: 50, low_stock_threshold: 5 },
  { id: 'gas-2', name: 'แก๊สถัง 7 กก.', price: 320, category: 'gas', unit: 'ถัง', stock: 50, low_stock_threshold: 5 },
  { id: 'gas-3', name: 'แก๊สถัง 15 กก.', price: 450, category: 'gas', unit: 'ถัง', stock: 30, low_stock_threshold: 5 },
  { id: 'gas-4', name: 'แก๊สถัง 48 กก.', price: 1200, category: 'gas', unit: 'ถัง', stock: 10, low_stock_threshold: 3 },
  
  // น้ำดื่ม
  { id: 'water-1', name: 'น้ำดื่มขวดเล็ก 350ml', price: 7, category: 'water', unit: 'ขวด', stock: 200, low_stock_threshold: 20 },
  { id: 'water-2', name: 'น้ำดื่มขวด 600ml', price: 10, category: 'water', unit: 'ขวด', stock: 200, low_stock_threshold: 20 },
  { id: 'water-3', name: 'น้ำดื่มขวด 1.5L', price: 15, category: 'water', unit: 'ขวด', stock: 100, low_stock_threshold: 10 },
  { id: 'water-4', name: 'น้ำดื่มแกลลอน 6L', price: 25, category: 'water', unit: 'แกลลอน', stock: 50, low_stock_threshold: 5 },
  { id: 'water-5', name: 'น้ำดื่มถัง 20L', price: 15, category: 'water', unit: 'ถัง', stock: 50, low_stock_threshold: 5 },
  { id: 'water-6', name: 'น้ำแข็งแพ็ค 12 ขวด', price: 100, category: 'water', unit: 'แพ็ค', stock: 30, low_stock_threshold: 5 },
]
