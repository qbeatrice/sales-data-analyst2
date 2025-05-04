// /lib/schema.ts
import { 
  sqlServerTable, 
  int, 
  nvarchar, 
  decimal, 
  date, 
  datetime2, 
  bit, 
  primaryKey 
} from 'drizzle-orm/mssql-server';


// Transactions table - for storing sales transactions
export const sales = sqlServerTable('sales_data', {
  key: int('key').identity().primaryKey(), //unique identifier of the transaction
  country: nvarchar('country', { length: 50 }).notNull(), //country of the store
  region: nvarchar('region', { length: 50 }).notNull(), //region of the store
  city: nvarchar('city', { length: 50 }).notNull(), //city of the store
  store_id: int('store_id', { length: 50 }).notNull(), //unique identifier of the store
  store_name: nvarchar('store_name', { length: 50 }).notNull(), //name of the store
  sales_order_number: nvarchar('sales_order_number', { length: 50 }).notNull(), //sales order unique identifier
  sales_date: date('sales_date').notNull(), //date of the sales order
  product_name: nvarchar('product_name', { length: 50 }).notNull(), //name of the product sold
  quantity: int('quantity').notNull(), //quantity of the product sold
  unit_price: decimal('unit_price').notNull(), //price of the product
  total_product_cost: decimal('total_product_cost').notNull(), //total cost of the product
  material_cost: decimal('material_cost').notNull(), //cost of the materials used to make the product
  shipping_cost: decimal('shipping_cost').notNull(), //cost of shipping the product
  total_cost: decimal('total_cost').notNull(), //total cost of the product
  sales_type: nvarchar('sales_type', { length: 50 }).notNull(), //type of sales. instore means the product was sold in the store, delivery means the product was sold online and delivered to the customer
  delivery_fee: decimal('delivery_fee').notNull(), //fee for the delivery of the product
  delivery_duration_mins: int('delivery_duration_mins').Null(), //amount of time it took to deliver the product
  discount_code: nvarchar('discount_code', { length: 50 }).Null(), //code of the discount applied to the product
  discount_percent: int('discount_percent').Null(), //percentage of discount applied to the product
  delivery_plate: nvarchar('delivery_plate', { length: 50 }).Null(), //plate number of the delivery vehicle
  created_at: datetime2('created_at').defaultNow(),
  updated_at: datetime2('updated_at').defaultNow()
});

// product design table - stores information on the materials used to make the product and the cost of the materials
export const product_design = sqlServerTable('unique_products_with_materials_masterlist', {
  Country: nvarchar('Country', { length: 50 }).primaryKey(), //country where the product is produced and sold
  Region: nvarchar('Region', { length: 50 }).primaryKey(), //region where the product is produced and sold
  City: nvarchar('City', { length: 50 }).primaryKey(), //city where the product is produced and sold
  Product_Name: nvarchar('Product_Name', { length: 50 }).primaryKey(), //name of the product
  Product_Price: decimal('Product_Price',).Null(), //selling price of the product
  Material_Code: nvarchar('Material_Code', { length: 50 }).primaryKey(), //code of the material used to make the product
  Material_Quantity: int('Material_Quantity').Null(), //quantity of the material used to make the product
  Material_Unit_Cost: decimal('Material_Unit_Cost').Null(), //unit cost of the material used to make the product
  Material_Shipping_Cost: decimal('Material_Shipping_Cost').Null(), //shipping cost of the material used to make the product
  total_material_cost: decimal('total_material_cost').Null(), //total cost of the material used to make the product
  total_material_shipping_cost: decimal('total_material_shipping_cost').Null(), //total shipping cost of the material used to make the product
  created_at: datetime2('created_at').defaultNow(),
  updated_at: datetime2('updated_at').defaultNow()
});

// vehicle master table - stores information on the vehicles available in a city for delivering products
export const vehicle_master = sqlServerTable('vehicle_master', {
  Country: nvarchar('Country', { length: 50 }).notNull(), //country where the vehicle is used
  Region: nvarchar('Region', { length: 50 }).notNull(), //region where the vehicle is used
  City: nvarchar('City', { length: 50 }).primaryKey(), //city where the vehicle is used
  Vehicle_Plate: nvarchar('Vehicle_Plate', { length: 50 }).primaryKey(), //plate number of the vehicle used to deliver the product
  created_at: datetime2('created_at').defaultNow(),
  updated_at: datetime2('updated_at').defaultNow()
});

