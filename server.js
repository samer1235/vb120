const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const basicAuth = require('basic-auth');

const app = express();
const port = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: 'postgresql://postgres:LvzPKmcHPUXhtDWaUGeUomlfMfEawcaR@caboose.proxy.rlwy.net:39107/railway',
});

app.use(cors());
app.use(express.json());

// إنشاء جدول الطلبات
async function createTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      offer_name VARCHAR(255) NOT NULL,
      amount NUMERIC(10, 2) NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      status VARCHAR(50) NOT NULL DEFAULT 'قيد المعالجة',
      tracking_code VARCHAR(20) UNIQUE NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
}
createTable().catch(console.error);

// Middleware بسيط للتحقق من Basic Auth
function auth(req, res, next) {
  const user = basicAuth(req);
  if (!user || user.name !== 'dev2008' || user.pass !== 'admin') {
    res.set('WWW-Authenticate', 'Basic realm="لوحة تحكم 4STORE"');
    return res.status(401).send('Unauthorized');
  }
  next();
}

// إضافة طلب جديد
app.post('/orders', async (req, res) => {
  const { offer_name, amount, quantity } = req.body;

  if (!offer_name || !amount) {
    return res.status(400).json({ error: 'العرض والسعر مطلوبان' });
  }

  // توليد كود تتبع عشوائي بسيط
  const tracking_code = 'B' + Math.floor(100000 + Math.random() * 900000);

  try {
    const result = await pool.query(
      `INSERT INTO orders (offer_name, amount, quantity, tracking_code) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [offer_name, amount, quantity || 1, tracking_code]
    );
    res.json({ success: true, order: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'خطأ في إنشاء الطلب' });
  }
});

// استعلام عن الطلب حسب كود التتبع
app.get('/orders/:tracking_code', async (req, res) => {
  const { tracking_code } = req.params;

  try {
    const result = await pool.query(
      `SELECT * FROM orders WHERE tracking_code = $1`,
      [tracking_code]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'لم يتم العثور على الطلب' });
    }
    res.json({ order: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'خطأ في جلب الطلب' });
  }
});

// لوحة تحكم: عرض جميع الطلبات (محمي بكلمة مرور)
app.get('/admin/orders', auth, async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM orders ORDER BY created_at DESC`);
    res.json({ orders: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'خطأ في جلب الطلبات' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
