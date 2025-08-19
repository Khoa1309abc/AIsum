# AI Summarizer Backend

## Chạy local
```bash
cd ai-summarizer-backend
cp .env.example .env
# mở .env, dán OPENROUTER_API_KEY của bạn
npm install
npm start
```
Server sẽ lắng nghe `http://localhost:3000`

## Deploy Render
1. Tạo repo Git, push thư mục `ai-summarizer-backend/`
2. Vào Render.com → New Web Service → kết nối repo
3. **Runtime**: Node 18+
4. **Build Command**: `npm install`
5. **Start Command**: `npm start`
6. **Environment Variables**: đặt `OPENROUTER_API_KEY`, `MODEL` (tùy chọn), `ORIGINS=*`

Sau khi deploy, bạn sẽ có URL ví dụ: `https://adblock-pro-backend.onrender.com`.
Dán URL này vào **Backend URL** trong extension (Options hoặc Menu).