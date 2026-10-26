const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.get('/', (req,res)=>res.send('Tahlil Abaya Proxy Live ✅'));
app.get('/api', async (req,res)=>{
  const token=req.query.token;
  const endpoint=req.query.endpoint||'products';
  if(!token) return res.json({error:'No token'});
  try{
    const fetch=require('node-fetch');
    const url=`https://api.salla.dev/admin/v2/${endpoint}?per_page=100`;
    const r=await fetch(url,{headers:{Authorization:`Bearer ${token}`}});
    const data=await r.json();
    res.json(data);
  }catch(e){res.status(500).json({error:e.message})}
});
app.listen(process.env.PORT||10000);
