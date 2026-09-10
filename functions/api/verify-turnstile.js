export async function onRequestPost(context) {
    const { request, env } = context;
    const body = await request.json();
    const token = body.token;
    const ip = request.headers.get('CF-Connecting-IP');

    if (!token) {
        return new Response(JSON.stringify({ success: false, message: 'Missing token' }), { 
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const formData = new FormData();
    formData.append('secret', env.TURNSTILE_SECRET_KEY);
    formData.append('response', token);
    if (ip) formData.append('remoteip', ip);

    const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: formData,
    });

    const outcome = await result.json();

    if (outcome.success) {
        return new Response(JSON.stringify({ success: true }), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } else {
        return new Response(JSON.stringify({ success: false, error: outcome['error-codes'] }), { 
            status: 403,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}