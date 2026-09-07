export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return Response.json({ ok: true, service: "vaylento" });
    }

    if (url.pathname === "/api/contact") {
      if (request.method !== "POST") {
        return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
      }

      try {
        const body = await request.json();
        const token = typeof body.hcaptchaToken === "string" ? body.hcaptchaToken.trim() : "";
        const sitekey = typeof body.sitekey === "string" ? body.sitekey.trim() : "";

        if (!token) {
          return Response.json(
            { ok: false, error: "hCaptcha verification is required." },
            { status: 400 }
          );
        }

        if (!env.HCAPTCHA_SECRET) {
          return Response.json(
            { ok: false, error: "hCaptcha is not configured." },
            { status: 500 }
          );
        }

        const verifyData = new URLSearchParams();
        verifyData.set("secret", env.HCAPTCHA_SECRET);
        verifyData.set("response", token);
        if (sitekey) verifyData.set("sitekey", sitekey);

        const clientIp = request.headers.get("CF-Connecting-IP");
        if (clientIp) verifyData.set("remoteip", clientIp);

        const verifyResponse = await fetch("https://api.hcaptcha.com/siteverify", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: verifyData.toString()
        });

        const result = await verifyResponse.json();

        if (!verifyResponse.ok || !result.success) {
          return Response.json(
            { ok: false, error: "hCaptcha verification failed." },
            { status: 403 }
          );
        }

        // hCaptcha is verified successfully.
        // The next step can forward the validated contact data to your chosen inbox/CRM.
        return Response.json({ ok: true, verified: true });
      } catch {
        return Response.json(
          { ok: false, error: "Invalid request." },
          { status: 400 }
        );
      }
    }

    return env.ASSETS.fetch(request);
  }
};
