export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Placeholder Worker entry point.
    // Static assets are served by the Workers Assets binding configured in wrangler.jsonc.
    // hCaptcha verification will be added to the form endpoint once the frontend form is wired to it.
    if (url.pathname === "/api/health") {
      return Response.json({ ok: true, service: "vaylento" });
    }

    return env.ASSETS.fetch(request);
  }
};
