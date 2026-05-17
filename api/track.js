import { createHash } from 'crypto';

const PIXEL_ID = process.env.META_PIXEL_ID;
const CAPI_TOKEN = process.env.META_CAPI_TOKEN;

function sha256(value) {
  return createHash('sha256').update((value || '').toLowerCase().trim()).digest('hex');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { eventName, email, phone, firstName, lastName, fbc, fbp, clientIp, userAgent } = req.body;

  const userData = {};
  if (email)     userData.em = [sha256(email)];
  if (phone)     userData.ph = [sha256(phone.replace(/\D/g, ''))];
  if (firstName) userData.fn = [sha256(firstName)];
  if (lastName)  userData.ln = [sha256(lastName)];
  if (fbc)       userData.fbc = fbc;
  if (fbp)       userData.fbp = fbp;
  if (clientIp)  userData.client_ip_address = clientIp;
  if (userAgent) userData.client_user_agent = userAgent;

  const payload = {
    data: [{
      event_name: eventName || 'Lead',
      event_time: Math.floor(Date.now() / 1000),
      action_source: 'website',
      event_source_url: req.headers.referer || 'https://jessica-casas-landing.vercel.app',
      user_data: userData,
    }],
  };

  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${CAPI_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );
    const data = await response.json();
    if (!response.ok) {
      console.error('Meta CAPI error:', data);
      return res.status(502).json({ error: 'CAPI error', detail: data });
    }
    return res.status(200).json({ ok: true, events_received: data.events_received });
  } catch (err) {
    console.error('CAPI fetch failed:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
