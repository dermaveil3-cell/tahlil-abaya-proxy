const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());

app.get('/', (req,res)=>res.send('Tahlil Abaya Proxy - Auto Refresh Ready ✅'));

app.get('/api', async (req,res)=>{
  let token = req.query.token;
  const endpoint = req.query.endpoint || 'products';
  if(!token) return res.json({error:'Add ?token=ory_at_ or ory_rt_'});
  
  try{
    // لو التوكن refresh (ory_rt_) جدده تلقائياً لـ access جديد
    if(token.startsWith('ory_rt_')){
      const refreshRes = await fetch('https://accounts.salla.sa/oauth2/token',{
        method:'POST',
        headers:{'Content-Type':'application/x-www-form-urlencoded'},
        body:`grant_type=refresh_token&refresh_token=${token}&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET`
      });
      const refreshData = await refreshRes.json();
      if(refreshData.access_token) token = refreshData.access_token;
    }
    
    const url = `https://api.salla.dev/admin/v2/${endpoint}?per_page=100`;
    const r = await fetch(url, {headers:{Authorization:`Bearer ${token}`}});
    const data = await r.json();
    res.json(data);
  }catch(e){
    res.status(500).json({error:e.message});
  }
});

app.listen(process.env.PORT||10000);
