const express = require('express');
const cors = require('cors');
const basicAuth = require('basic-auth');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

// إعدادات قاعدة البيانات
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // تأكد أنك تضيف هذا في Railway أو .env
  ssl: { rejectUnauthorized: false } // إذا تحتاج SSL على Railway
});

app.use(cors());
app.use(express.json());

// Middleware للتحقق من بيانات الدخول (basic auth)
const adminAuth = (req, res, next) => {
  const user = basicAuth(req);
  if (!user || user.name !== 'dev2008' || user.pass !== 'admin') {
    res.set('WWW-Authenticate', 'Basic realm="Admin Area"');
    return res.status(401).send('Unauthorized');
  }
  next();
};

// صفحة الأدمن - تعرض آخر 50 طلب
app.get('/admin', adminAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, phone, id_number, created_at, status FROM orders ORDER BY created_at DESC LIMIT 50`
    );

    let html = `
      <h1>لوحة تحكم 4STORE - الأدمن</h1>
      <table border="1" cellpadding="8" cellspacing="0">
        <thead>
          <tr>
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

// API لإضافة طلب جديد (مثال)
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

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
