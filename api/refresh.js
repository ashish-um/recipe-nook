export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const cookies = req.headers.cookie || '';
  const match = cookies.match(/(?:^|; )refresh_token=([^;]*)/);
  const refreshToken = match ? decodeURIComponent(match[1]) : null;

  if (!refreshToken) return res.status(401).json({ error: 'No refresh token' });

  // In production, move to Environment Variables
  const clientId = process.env.VITE_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token"
      })
    });

    const data = await tokenRes.json();
    if (data.error) return res.status(400).json(data);

    return res.status(200).json({
      access_token: data.access_token,
      expires_in: data.expires_in
    });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
