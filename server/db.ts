import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'
import { seedCategories, seedProducts, type Product } from '../src/data/catalog.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const jsonPath = join(root, 'public', 'products.json')

function loadEnvFile() {
  try {
    const text = readFileSync(join(root, '.env'), 'utf8')
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const split = trimmed.indexOf('=')
      if (split < 1) continue
      const key = trimmed.slice(0, split)
      const value = trimmed.slice(split + 1)
      if (!process.env[key]) process.env[key] = value
    }
  } catch {
    // .env is optional
  }
}

loadEnvFile()

export type ProductRow = {
  id: number
  name: string
  category: number
  brand: string
  model: string
  spec: string
  price: number
  previous_price: number | null
  image: string
  active: number
}

function mysqlConfig() {
  return {
    host: process.env.MYSQL_HOST ?? '127.0.0.1',
    port: Number(process.env.MYSQL_PORT ?? 3306),
    user: process.env.MYSQL_USER ?? '',
    password: process.env.MYSQL_PASSWORD ?? '',
    database: process.env.MYSQL_DATABASE ?? '',
  }
}

let pool: mysql.Pool | undefined
let ready: Promise<mysql.Pool> | undefined

async function bootstrap() {
  const config = mysqlConfig()
  const rootUser = process.env.MYSQL_ROOT_USER ?? 'root'
  const rootPassword = process.env.MYSQL_ROOT_PASSWORD ?? config.password
  const rootPasswords = [...new Set([rootPassword, '', config.password])]

  let admin: mysql.Connection | undefined
  let lastError: unknown
  for (const password of rootPasswords) {
    try {
      admin = await mysql.createConnection({
        host: config.host,
        port: config.port,
        user: rootUser,
        password,
        connectTimeout: 5000,
      })
      if (password !== rootPassword) {
        await admin.query(
          `ALTER USER ${admin.escape(rootUser)}@'localhost' IDENTIFIED BY ${admin.escape(rootPassword)}`,
        )
        await admin.query('FLUSH PRIVILEGES')
      }
      break
    } catch (error) {
      lastError = error
    }
  }

  if (!admin) {
    throw lastError instanceof Error
      ? lastError
      : new Error('Could not connect to MySQL as root. Start MySQL Server, then try again.')
  }

  const dbName = admin.escapeId(config.database)
  const dbUser = admin.escape(config.user)
  const dbPass = admin.escape(config.password)
  await admin.query(
    `CREATE DATABASE IF NOT EXISTS ${dbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  )
  await admin.query(`CREATE USER IF NOT EXISTS ${dbUser}@'localhost' IDENTIFIED BY ${dbPass}`)
  await admin.query(`CREATE USER IF NOT EXISTS ${dbUser}@'127.0.0.1' IDENTIFIED BY ${dbPass}`)
  await admin.query(`ALTER USER ${dbUser}@'localhost' IDENTIFIED BY ${dbPass}`)
  await admin.query(`ALTER USER ${dbUser}@'127.0.0.1' IDENTIFIED BY ${dbPass}`)
  await admin.query(`GRANT ALL PRIVILEGES ON ${dbName}.* TO ${dbUser}@'localhost'`)
  await admin.query(`GRANT ALL PRIVILEGES ON ${dbName}.* TO ${dbUser}@'127.0.0.1'`)
  await admin.query('FLUSH PRIVILEGES')
  await admin.end()
}

async function init(): Promise<mysql.Pool> {
  if (pool) return pool
  await bootstrap()
  const created = mysql.createPool({
    ...mysqlConfig(),
    waitForConnections: true,
    connectionLimit: 8,
    connectTimeout: 5000,
  })
  await created.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      active TINYINT(1) NOT NULL DEFAULT 1,
      sort_order INT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
  await created.query(`
    CREATE TABLE IF NOT EXISTS products (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      category INT NOT NULL,
      brand VARCHAR(64) NOT NULL,
      model VARCHAR(255) NOT NULL,
      spec VARCHAR(255) NOT NULL,
      price INT NOT NULL,
      previous_price INT NULL,
      image VARCHAR(255) NOT NULL,
      active TINYINT(1) NOT NULL DEFAULT 1
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
  pool = created
  try {
    await created.query('ALTER TABLE categories ENGINE=InnoDB')
    await created.query('ALTER TABLE products ENGINE=InnoDB')
  } catch {
    // Already InnoDB, or the engine change is not needed
  }
  await ensureColumn(created, 'products', 'active', 'TINYINT(1) NOT NULL DEFAULT 1')
  await migrateCatalogIds(created)
  await seedCategoriesIfEmpty()
  await linkProductsToCategories(created)
  await seedIfEmpty()
  return created
}

async function getDb(): Promise<mysql.Pool> {
  if (!ready) ready = init()
  return ready
}

async function ensureColumn(
  db: mysql.Pool,
  table: string,
  column: string,
  definition: string,
) {
  const [rows] = await db.query<mysql.RowDataPacket[]>(
    `SHOW COLUMNS FROM ${table} LIKE ?`,
    [column],
  )
  if (rows.length > 0) return
  await db.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
}

async function ensureIndex(db: mysql.Pool, table: string, index: string, column: string) {
  const [rows] = await db.query<mysql.RowDataPacket[]>(
    `
    SELECT INDEX_NAME FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?
    `,
    [table, index],
  )
  if (rows.length > 0) return
  await db.query(`ALTER TABLE ${table} ADD INDEX ${index} (${column})`)
}

async function ensureForeignKey(
  db: mysql.Pool,
  table: string,
  constraint: string,
  column: string,
  refTable: string,
  refColumn: string,
) {
  const [rows] = await db.query<mysql.RowDataPacket[]>(
    `
    SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND CONSTRAINT_NAME = ?
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    `,
    [table, constraint],
  )
  if (rows.length > 0) return
  await db.query(
    `ALTER TABLE ${table}
     ADD CONSTRAINT ${constraint}
     FOREIGN KEY (${column}) REFERENCES ${refTable}(${refColumn})
     ON DELETE RESTRICT ON UPDATE CASCADE`,
  )
}

async function columnIsInteger(db: mysql.Pool, table: string, column: string) {
  const [rows] = await db.query<mysql.RowDataPacket[]>(`SHOW COLUMNS FROM \`${table}\` LIKE ?`, [column])
  return String(rows[0]?.Type ?? '').toLowerCase().startsWith('int')
}

async function migrateCatalogIds(db: mysql.Pool) {
  const categoryIsInt = await columnIsInteger(db, 'categories', 'id')
  const productCategoryIsInt = await columnIsInteger(db, 'products', 'category')
  if (categoryIsInt && productCategoryIsInt) return

  const [fkRows] = await db.query<mysql.RowDataPacket[]>(
    `
    SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'products'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    `,
  )
  for (const row of fkRows as { CONSTRAINT_NAME: string }[]) {
    await db.query(`ALTER TABLE products DROP FOREIGN KEY \`${row.CONSTRAINT_NAME}\``)
  }

  await db.query('SET FOREIGN_KEY_CHECKS = 0')
  await db.query(`
    CREATE TABLE categories_new (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      active TINYINT(1) NOT NULL DEFAULT 1,
      sort_order INT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
  const [categoryRows] = await db.query<mysql.RowDataPacket[]>(
    'SELECT id, name, active, sort_order FROM categories',
  )
  const categoryMap = new Map<string, number>()
  const used = new Set<number>()
  for (const row of categoryRows) {
    const seed = seedCategories.find((item) => item.name === String(row.name))
    let id = seed?.id ?? Number(row.id)
    if (!Number.isInteger(id) || id < 1 || used.has(id)) {
      id = 1
      while (used.has(id)) id += 1
    }
    used.add(id)
    categoryMap.set(String(row.id), id)
    await db.query(
      'INSERT INTO categories_new (id, name, active, sort_order) VALUES (?, ?, ?, ?)',
      [id, row.name, row.active ? 1 : 0, Number(row.sort_order ?? 0)],
    )
  }

  await db.query(`
    CREATE TABLE products_new (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      category INT NOT NULL,
      brand VARCHAR(64) NOT NULL,
      model VARCHAR(255) NOT NULL,
      spec VARCHAR(255) NOT NULL,
      price INT NOT NULL,
      previous_price INT NULL,
      image VARCHAR(255) NOT NULL,
      active TINYINT(1) NOT NULL DEFAULT 1
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
  const [productRows] = await db.query<mysql.RowDataPacket[]>(
    'SELECT id, name, category, brand, model, spec, price, previous_price, image, active FROM products',
  )
  const usedProducts = new Set<number>()
  for (const row of productRows) {
    const seed = seedProducts.find((item) => item.name === String(row.name))
    let id = seed?.id ?? Number(row.id)
    if (!Number.isInteger(id) || id < 1 || usedProducts.has(id)) {
      id = 1
      while (usedProducts.has(id)) id += 1
    }
    usedProducts.add(id)
    await db.query(
      `
      INSERT INTO products_new (id, name, category, brand, model, spec, price, previous_price, image, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        row.name,
        categoryMap.get(String(row.category)) ?? seed?.category ?? 1,
        row.brand,
        row.model,
        row.spec,
        Number(row.price),
        row.previous_price == null ? null : Number(row.previous_price),
        row.image,
        row.active == null ? 1 : row.active ? 1 : 0,
      ],
    )
  }

  await db.query('DROP TABLE IF EXISTS categories_old')
  await db.query('RENAME TABLE categories TO categories_old, categories_new TO categories')
  await db.query('DROP TABLE categories_old')
  await db.query('DROP TABLE IF EXISTS products_old')
  await db.query('RENAME TABLE products TO products_old, products_new TO products')
  await db.query('DROP TABLE products_old')
  await db.query('SET FOREIGN_KEY_CHECKS = 1')
}

async function seedCategoriesIfEmpty() {
  const db = pool
  if (!db) return
  for (const category of seedCategories) {
    await db.query(
      `
      INSERT IGNORE INTO categories (id, name, active, sort_order)
      VALUES (?, ?, ?, ?)
      `,
      [category.id, category.name, category.active ? 1 : 0, category.sortOrder],
    )
  }
}

async function linkProductsToCategories(db: mysql.Pool) {
  await ensureIndex(db, 'products', 'products_category', 'category')
  await ensureForeignKey(db, 'products', 'fk_products_category', 'category', 'categories', 'id')
}

export function rowToProduct(row: ProductRow): Product {
  return {
    id: Number(row.id),
    name: row.name,
    category: Number(row.category),
    brand: row.brand as Product['brand'],
    model: row.model,
    spec: row.spec,
    price: Number(row.price),
    previousPrice: row.previous_price == null ? undefined : Number(row.previous_price),
    image: row.image,
    active: row.active == null ? true : Boolean(row.active),
  }
}

export async function listProducts(): Promise<Product[]> {
  const db = await getDb()
  const [rows] = await db.query<mysql.RowDataPacket[]>(
    `
    SELECT p.id, p.name, p.category, p.brand, p.model, p.spec, p.price, p.previous_price, p.image, p.active
    FROM products p
    INNER JOIN categories c ON c.id = p.category
    ORDER BY p.name
    `,
  )
  return (rows as ProductRow[]).map(rowToProduct)
}

export async function upsertProduct(product: Product): Promise<Product> {
  const db = await getDb()
  const values = [
    product.name,
    product.category,
    product.brand,
    product.model,
    product.spec,
    product.price,
    product.previousPrice ?? null,
    product.image,
    product.active !== false ? 1 : 0,
  ]
  let id = product.id
  if (id > 0) {
    await db.query(
      `
      UPDATE products
      SET name = ?, category = ?, brand = ?, model = ?, spec = ?, price = ?, previous_price = ?, image = ?, active = ?
      WHERE id = ?
      `,
      [...values, id],
    )
  } else {
    const [result] = await db.query<mysql.ResultSetHeader>(
      `
      INSERT INTO products (name, category, brand, model, spec, price, previous_price, image, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      values,
    )
    id = result.insertId
  }
  const saved = { ...product, id }
  await exportProductsJson()
  return saved
}

export async function deleteProduct(id: number) {
  const db = await getDb()
  await db.query('DELETE FROM products WHERE id = ?', [id])
  await exportProductsJson()
}

export async function closeDb() {
  if (!pool) return
  await pool.end()
  pool = undefined
  ready = undefined
}

export async function exportProductsJson() {
  mkdirSync(dirname(jsonPath), { recursive: true })
  let products = seedProducts
  try {
    products = await listProducts()
  } catch {
    // GitHub Pages build has no MySQL
  }
  writeFileSync(jsonPath, `${JSON.stringify(products, null, 2)}\n`)
}

async function seedIfEmpty() {
  const db = pool
  if (!db) return
  const [rows] = await db.query<mysql.RowDataPacket[]>('SELECT COUNT(*) AS total FROM products')
  const total = Number((rows[0] as { total: number }).total)
  if (total > 0) return

  for (const product of seedProducts) {
    await db.query(
      `
      INSERT INTO products (id, name, category, brand, model, spec, price, previous_price, image, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        product.id,
        product.name,
        product.category,
        product.brand,
        product.model,
        product.spec,
        product.price,
        product.previousPrice ?? null,
        product.image,
        product.active !== false ? 1 : 0,
      ],
    )
  }
}
