const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

// تخزين التوكن في الذاكرة
let cachedToken = null;
let tokenExpiry = 0;

// دالة تجديد التوكن تلقائياً
async function getValidToken(providedToken) {
  // لو المستخدم حط ory_at_ مباشرة استخدمه
  if (providedToken && providedToken.startsWith('ory_at_')) {
    return providedToken;
  }
  
  // لو في توكن محفوظ ولسه ما انتهى استخدمه
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }
  
  // حاول تجديد باستخدام refresh_token من Env أو من المستخدم
  const refreshToken = providedToken?.startsWith('ory_rt_') ? providedToken : process.env.SALLA_REFRESH_TOKEN;
  const clientId = process.env.SALLA_CLIENT_ID;
  const clientSecret = process.env.SALLA_CLIENT_SECRET;
  
  if (refreshToken && clientId && clientSecret) {
    try {
      const params = new URLSearchParams();
      params.append('grant_type', 'refresh_token');
      params.append('refresh_token', refreshToken);
      params.append('client_id', clientId);
      params.append('client_secret', clientSecret);
      
      const r = await fetch('https://accounts.salla.sa/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
      });
      const data = await r.json();
      
      if (data.access_token) {
        cachedToken = data.access_token;
        tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // قبل الانتهاء بدقيقة
        console.log('Token refreshed automatically!');
        return cachedToken;
      }
    } catch(e) {
      console.log('Refresh failed:', e.message);
    }
  }
  
  // لو مافي شي، ارجع التوكن الممرر كما هو
  return providedToken || cachedToken;
}

app.get('/', (req,res)=>{
  res.send(`
    <h2>Tahlil Abaya Proxy - Auto Refresh Live ✅</h2>
    <p>المنصة مربوطة وتجدد التوكن تلقائياً!</p>
    <p>استخدم: /api?endpoint=products</p>
    <p>بدون ما تحط توكن كل مرة - السيرفر يحفظه!</p>
  `);
});

app.get('/api', async (req,res)=>{
  try {
    const endpoint = req.query.endpoint || 'products';
    let token = req.query.token;
    
    // جيب توكن صالح (مجدد تلقائياً لو لزم)
    const validToken = await getValidToken(token);
    
    if (!validToken) {
      return res.json({
        error: 'No valid token - Add SALLA_REFRESH_TOKEN in Render Env Vars',
        hint: 'روح Render > Environment > Add: SALLA_REFRESH_TOKEN, SALLA_CLIENT_ID, SALLA_CLIENT_SECRET'
      });
    }
    
    const url = `https://api.salla.dev/admin/v2/${endpoint}?per_page=100`;
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${validToken}` }
    });
    const data = await r.json();
    
    // لو التوكن منتهي ورجع 401، حاول تجديد مرة ثانية
    if (r.status === 401 && req.query.token?.startsWith('ory_rt_') === false) {
      cachedToken = null; // امسح الكاش وحاول مرة ثانية
      const newToken = await getValidToken(req.query.token);
      if (newToken !== validToken) {
        const r2 = await fetch(url, { headers: { Authorization: `Bearer ${newToken}` } });
        const data2 = await r2.json();
        return res.json(data2);
      }
    }
    
    res.json(data);
  } catch(e) {
    res.status(500).json({error: e.message});
  }
});

// endpoint خاص لحفظ التوكن مرة وحدة
app.post('/api/save-token', (req,res)=>{
  const { refresh_token, client_id, client_secret } = req.body;
  if (refresh_token) {
    process.env.SALLA_REFRESH_TOKEN = refresh_token;
    cachedToken = null;
    res.json({success:true, message:'Token saved! لن تحتاج تغيره مرة ثانية'});
  } else {
    res.json({error:'No token'});
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, ()=>console.log(`Auto-refresh proxy running on ${PORT}`));
