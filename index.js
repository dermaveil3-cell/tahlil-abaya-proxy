const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());

app.get('/', (req,res)=>res.send('Tahlil Abaya Proxy - All Products Ready ✅'));

app.get('/api', async (req,res)=>{
  const token=req.query.token;
  const endpoint=req.query.endpoint||'products';
  if(!token) return res.json({error:'No token'});
  
  try{
    const fetch=require('node-fetch');
    let allProducts=[];
    let page=1;
    let hasMore=true;
    
    while(hasMore && page<=10){
      const url=`https://api.salla.dev/admin/v2/${endpoint}?per_page=100&page=${page}`;
      const r=await fetch(url,{headers:{Authorization:`Bearer ${token}`}});
      const json=await r.json();
      
      if(json.data && Array.isArray(json.data)){
        allProducts=allProducts.concat(json.data);
        hasMore=json.data.length===100;
      } else if(json.data && json.data.id){
        allProducts.push(json.data);
        hasMore=false;
      } else {
        hasMore=false;
      }
      page++;
    }
    
    res.json({status:200, success:true, total:allProducts.length, data:[STRIPPED]
  }catch(e){
    res.status(500).json({error:e.message});
  }
});

app.listen(process.env.PORT||10000);
