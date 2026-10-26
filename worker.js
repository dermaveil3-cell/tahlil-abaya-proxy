export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // الصفحة الرئيسية
    if (url.pathname === '/') {
      return new Response(`
        <h2>Tahlil Abaya Proxy - Cloudflare Live ✅</h2>
        <p>يعمل 24 ساعة بدون ما ينام - مجاني للأبد!</p>
        <p>استخدم: /api?endpoint=products</p>
        <p>أو: /api?endpoint=orders</p>
        <p>السيرفر يجدد التوكن تلقائياً من Environment Variables</p>
      `, { headers: { ...corsHeaders, 'Content-Type': 'text/html;charset=utf-8' } });
    }

    // API proxy
    if (url.pathname === '/api') {
      try {
        const endpoint = url.searchParams.get('endpoint') || 'products';
        let token = url.searchParams.get('token');

        // حاول تجيب توكن صالح
        let validToken = token;

        // لو مافي توكن أو التوكن قديم، حاول تجديد من Env Vars
        if (!validToken || validToken.startsWith('ory_at_')) {
          // حاول استخدام التوكن المحفوظ في Env
          const refreshToken = env.SALLA_REFRESH_TOKEN;
          const clientId = env.SALLA_CLIENT_ID;
          const clientSecret = env.SALLA_CLIENT_SECRET;

          if (refreshToken && clientId && clientSecret && !validToken) {
            // جدد التوكن
            const params = new URLSearchParams();
            params.append('grant_type', 'refresh_token');
            params.append('refresh_token', refreshToken);
            params.append('client_id', clientId);
            params.append('client_secret', clientSecret);

            const refreshRes = await fetch('https://accounts.salla.sa/oauth2/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: params
            });
            const refreshData = await refreshRes.json();
            
            if (refreshData.access_token) {
              validToken = refreshData.access_token;
            }
          } else if (!validToken) {
            // استخدم التوكن من Env إذا موجود
            validToken = env.SALLA_ACCESS_TOKEN || null;
          }
        }

        // لو التوكن refresh (ory_rt_) جدده
        if (validToken && validToken.startsWith('ory_rt_')) {
          const clientId = env.SALLA_CLIENT_ID;
          const clientSecret = env.SALLA_CLIENT_SECRET;
          
          if (clientId && clientSecret) {
            const params = new URLSearchParams();
            params.append('grant_type', 'refresh_token');
            params.append('refresh_token', validToken);
            params.append('client_id', clientId);
            params.append('client_secret', clientSecret);

            const refreshRes = await fetch('https://accounts.salla.sa/oauth2/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: params
            });
            const refreshData = await refreshRes.json();
            
            if (refreshData.access_token) {
              validToken = refreshData.access_token;
            }
          }
        }

        if (!validToken) {
          return new Response(JSON.stringify({
            error: 'No valid token',
            hint: 'Add SALLA_REFRESH_TOKEN, SALLA_CLIENT_ID, SALLA_CLIENT_SECRET in Cloudflare Env Vars',
            usage: '/api?endpoint=products&token=ory_at_...'
          }), { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          });
        }

        // جيب البيانات من سلة
        const sallaUrl = `https://api.salla.dev/admin/v2/${endpoint}?per_page=100`;
        const sallaRes = await fetch(sallaUrl, {
          headers: { Authorization: `Bearer ${validToken}` }
        });
        
        const data = await sallaRes.json();
        
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: sallaRes.status
        });

      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        });
      }
    }

    return new Response('Not found - Use /api?endpoint=products', { 
      headers: corsHeaders,
      status: 404 
    });
  }
};
