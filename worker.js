const HCAPTCHA_SITEKEY = "e0a4faba-9608-4680-968e-6ae6af5ef476";

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
        const contentType = request.headers.get("content-type") || "";
        let body = {};

        if (contentType.includes("application/json")) {
          body = await request.json();
        } else if (contentType.includes("application/x-www-form-urlencoded")) {
          const params = await request.formData();
          body = Object.fromEntries(params.entries());
        } else if (contentType.includes("multipart/form-data")) {
          const params = await request.formData();
          body = Object.fromEntries(params.entries());
        } else {
          return Response.json({ ok: false, error: "Unsupported content type." }, { status: 415 });
        }

        const token = typeof body.hcaptchaToken === "string" ? body.hcaptchaToken.trim() : "";
        const submittedSitekey = typeof body.sitekey === "string" ? body.sitekey.trim() : "";
        const sitekey = submittedSitekey || HCAPTCHA_SITEKEY;
        const accessKey = typeof body.access_key === "string" ? body.access_key.trim() : "";

        if (!token) {
          return Response.json(
            { ok: false, error: "Please complete the hCaptcha verification." },
            { status: 400 }
          );
        }

        if (!env.HCAPTCHA_SECRET) {
          return Response.json(
            { ok: false, error: "hCaptcha is not configured." },
            { status: 500 }
          );
        }

        if (!accessKey) {
          return Response.json(
            { ok: false, error: "Form configuration is missing." },
            { status: 400 }
          );
        }

        const verifyData = new URLSearchParams();
        verifyData.set("secret", env.HCAPTCHA_SECRET);
        verifyData.set("response", token);
        verifyData.set("sitekey", sitekey);

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
            { ok: false, error: "hCaptcha verification failed. Please try again." },
            { status: 403 }
          );
        }

        const web3FormData = new URLSearchParams();

        for (const [key, value] of Object.entries(body)) {
          if (key === "hcaptchaToken" || key === "sitekey") continue;
          if (typeof value === "string") web3FormData.set(key, value);
        }

        web3FormData.set("access_key", accessKey);

        const web3Response = await fetch("https://api.web3forms.com/submit", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: web3FormData.toString()
        });

        const web3Result = await web3Response.json();

        if (!web3Response.ok || !web3Result.success) {
          return Response.json(
            { ok: false, error: "Your message could not be sent. Please try again." },
            { status: 502 }
          );
        }

        return Response.json({
          ok: true,
          verified: true,
          message: "Your message has been sent successfully."
        });
      } catch {
        return Response.json(
          { ok: false, error: "Invalid request." },
          { status: 400 }
        );
      }
    }

    const response = await env.ASSETS.fetch(request);

    // Inject hCaptcha into the existing contact form without changing the site's layout/files.
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      return response;
    }

    const html = await response.text();

    if (!html.includes('id="contactForm"')) {
      return new Response(html, response);
    }

    const hcaptchaScript = '<script src="https://js.hcaptcha.com/1/api.js" async defer></script>';

    const hcaptchaWidget = `
      <div class="h-captcha" data-sitekey="${HCAPTCHA_SITEKEY}" style="margin-top:16px"></div>
    `;

    const protectionScript = `
<script>
(() => {
  const form = document.getElementById("contactForm");
  if (!form || form.dataset.vaylentoProtected === "true") return;

  form.dataset.vaylentoProtected = "true";

  const formStatus = document.getElementById("formStatus");
  const submitBtn = document.getElementById("submitBtn");
  const successBox = document.getElementById("successBox");
  const hcaptchaContainer = form.querySelector(".h-captcha");

  const showStatus = (message, type = "error") => {
    if (!formStatus) return;
    formStatus.textContent = message;
    formStatus.className = "form-status " + type;
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();

    const invalid = [...form.querySelectorAll("[required]")].find((field) => {
      if (field.type === "checkbox") return !field.checked;
      return !String(field.value || "").trim();
    });

    if (invalid) {
      invalid.focus();
      showStatus("Please complete the required fields.");
      return;
    }

    const hcaptchaToken = window.hcaptcha && hcaptchaContainer
      ? hcaptcha.getResponse(hcaptchaContainer.dataset.hcaptchaWidgetId)
      : "";

    if (!hcaptchaToken) {
      showStatus("Please complete the hCaptcha verification.");
      return;
    }

    if (submitBtn) submitBtn.disabled = true;
    showStatus("Sending your message…", "success");

    const payload = Object.fromEntries(new FormData(form).entries());
    payload.hcaptchaToken = hcaptchaToken;
    payload.sitekey = "${HCAPTCHA_SITEKEY}";

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Unable to send your message.");
      }

      form.style.display = "none";
      if (successBox) successBox.style.display = "block";
    } catch (error) {
      showStatus(error.message || "Unable to send your message.");
      if (window.hcaptcha) hcaptcha.reset();
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  }, true);
})();
</script>`;

    let updatedHtml = html.replace("</head>", `${hcaptchaScript}</head>`);
    updatedHtml = updatedHtml.replace("</form>", `${hcaptchaWidget}</form>`);
    updatedHtml = updatedHtml.replace("</body>", `${protectionScript}</body>`);

    return new Response(updatedHtml, response);
  }
};
