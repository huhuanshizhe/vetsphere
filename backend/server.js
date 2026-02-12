
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

// 初始化 Express 应用
const app = express();
const PORT = 3001; 

// --- 中间件配置 ---
app.use(cors({
  origin: ['https://veterinary.chanyechuhai.com', 'http://localhost:3000'],
  credentials: true
}));
app.use(bodyParser.json());

// --- 路由 ---
app.get('/', (req, res) => {
    res.send('VetSphere Backend is running (Supabase Mode). API logic has moved to frontend direct connection.');
});

// 健康检查
app.get('/health', (req, res) => {
    res.json({ status: 'ok', database: 'Supabase (Cloud)' });
});

app.listen(PORT, () => {
    console.log(`
==================================================
   VetSphere Backend (Supabase Mode)
   Status: Running
   Port: ${PORT}
   
   NOTE: The application has been migrated to Supabase.
   The frontend connects directly to Supabase Cloud.
   This local server is currently idle/placeholder.
==================================================
    `);
});
