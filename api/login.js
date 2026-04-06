export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'No code provided' });

  // In production, these should be securely stored in Vercel Environment Variables
  const clientId = process.env.VITE_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        // 'postmessage' is required for GIS initCodeClient popup flow
        redirect_uri: "postmessage"
      })
    });

    const data = await tokenRes.json();
    if (data.error) return res.status(400).json(data);

    let setCookieHeader = [];
    if (data.refresh_token) {
      // Create a secure HttpOnly cookie containing the refresh token.
      setCookieHeader.push(`refresh_token=${data.refresh_token}; HttpOnly; Secure; Path=/; SameSite=Strict; Max-Age=31536000`);
      res.setHeader("Set-Cookie", setCookieHeader);
    }

    return res.status(200).json({
      access_token: data.access_token,
      expires_in: data.expires_in
    });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
