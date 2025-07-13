const express = require('express');
const cors = require('cors');
const basicAuth = require('basic-auth');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

// إعداد قاعدة البيانات مع متغير البيئة DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:LvzPKmcHPUXhtDWaUGeUomlfMfEawcaR@caboose.proxy.rlwy.net:39107/railway',
  ssl: { rejectUnauthorized: false }
});

app.use(cors());
app.use(express.json());

// مصادقة Basic Auth
const adminAuth = (req, res, next) => {
  const user = basicAuth(req);
  if (!user || user.name !== 'admin' || user.pass !== 'dev2008') {
    res.set('WWW-Authenticate', 'Basic realm="Admin Area"');
    return res.status(401).send('Unauthorized');
  }
  next();
};

// صفحة الأدمن تعرض آخر 50 طلب
app.get('/admin', adminAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, phone, id_number, created_at, status FROM orders ORDER BY created_at DESC LIMIT 50`
    );

    let html = `
      <h1>لوحة تحكم 4STORE - الأدمن</h1>
      <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; direction: rtl;">
        <thead>
          <tr style="background-color: #6c4fcf; color: white;">
            <th>رقم الطلب</th>
            <th>الاسم</th>
            <th>رقم الجوال</th>
            <th>رقم الهوية</th>
            <th>تاريخ الطلب</th>
            <th>الحالة</th>
          </tr>
        </thead>
        <tbody>
    `;

    for (const row of result.rows) {
      html += `
        <tr>
          <td>${row.id}</td>
          <td>${row.name || '-'}</td>
          <td>${row.phone || '-'}</td>
          <td>${row.id_number || '-'}</td>
          <td>${new Date(row.created_at).toLocaleString('ar-EG')}</td>
          <td>${row.status || '-'}</td>
        </tr>
      `;
    }

    html += `
        </tbody>
      </table>
      <p>تم عرض آخر 50 طلب</p>
    `;

    res.send(html);
  } catch (err) {
    console.error(err);
    res.status(500).send('حدث خطأ في الخادم');
  }
});

// API لإضافة طلب جديد
app.post('/orders', async (req, res) => {
  const { name, phone, id_number, status } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO orders (name, phone, id_number, status, created_at)
       VALUES ($1, $2, $3, $4, NOW()) RETURNING id`,
      [name, phone, id_number, status || 'قيد المراجعة']
    );
    res.json({ success: true, id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'فشل إضافة الطلب' });
  }
});

// نقطة البداية (اختياري)
app.get('/', (req, res) => {
  res.send('API 4STORE تعمل.');
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
