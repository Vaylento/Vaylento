export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return Response.json({ ok: true, service: "vaylento" });
    }

    const response = await env.ASSETS.fetch(request);
    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("text/html") || (url.pathname !== "/" && url.pathname !== "/index.html")) {
      return response;
    }

    const html = await response.text();

    const mobileNav = `
      <style>
        .mobile-menu-toggle{
          display:none;
          width:44px;
          height:44px;
          padding:0;
          border:1px solid #dfe9f2;
          border-radius:12px;
          background:#fff;
          color:#0b1c33;
          cursor:pointer;
          align-items:center;
          justify-content:center;
          flex-direction:column;
          gap:5px;
        }
        .mobile-menu-toggle span{
          display:block;
          width:20px;
          height:2px;
          border-radius:99px;
          background:currentColor;
          transition:.2s ease;
        }
        .mobile-menu-toggle[aria-expanded="true"] span:nth-child(1){transform:translateY(7px) rotate(45deg)}
        .mobile-menu-toggle[aria-expanded="true"] span:nth-child(2){opacity:0}
        .mobile-menu-toggle[aria-expanded="true"] span:nth-child(3){transform:translateY(-7px) rotate(-45deg)}
        .mobile-nav{
          display:none;
          position:absolute;
          top:calc(100% + 10px);
          left:4%;
          right:4%;
          padding:12px;
          background:#fff;
          border:1px solid #dfe9f2;
          border-radius:18px;
          box-shadow:0 20px 50px rgba(11,28,51,.16);
        }
        .mobile-nav.open{display:flex;flex-direction:column}
        .mobile-nav a{
          padding:13px 14px;
          border-radius:12px;
          color:#38516a;
          font-weight:700;
        }
        .mobile-nav a:hover{background:#f4f8fc;color:#1e8bff}
        .mobile-nav .mobile-nav-cta{margin-top:4px;background:#0b1c33;color:#fff;text-align:center}
        body.mobile-nav-open{overflow:hidden}
        @media(max-width:900px){
          .site-header{position:sticky}
          .nav{position:relative}
          .nav-cta{display:none}
          .mobile-menu-toggle{display:flex}
        }
        @media(min-width:901px){
          .mobile-nav{display:none!important}
        }
      </style>

      <button
        class="mobile-menu-toggle"
        id="mobileMenuToggle"
        type="button"
        aria-label="Open navigation"
        aria-expanded="false"
        aria-controls="mobileNav"
      >
        <span></span><span></span><span></span>
      </button>

      <nav class="mobile-nav" id="mobileNav" aria-label="Mobile navigation">
        <a href="#top">Home</a>
        <a href="#services">Services</a>
        <a href="#process">How It Works</a>
        <a href="#about">About</a>
        <a href="#contact">Contact</a>
        <button class="mobile-nav-cta open-contact" type="button">Book a 15-Minute Call</button>
      </nav>

      <script>
        (() => {
          const toggle = document.getElementById("mobileMenuToggle");
          const nav = document.getElementById("mobileNav");
          if (!toggle || !nav) return;

          const closeMenu = () => {
            nav.classList.remove("open");
            toggle.setAttribute("aria-expanded", "false");
            toggle.setAttribute("aria-label", "Open navigation");
            document.body.classList.remove("mobile-nav-open");
          };

          toggle.addEventListener("click", () => {
            const open = nav.classList.toggle("open");
            toggle.setAttribute("aria-expanded", String(open));
            toggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
            document.body.classList.toggle("mobile-nav-open", open);
          });

          nav.querySelectorAll("a").forEach(link => link.addEventListener("click", closeMenu));
          document.addEventListener("keydown", event => {
            if (event.key === "Escape") closeMenu();
          });

          window.addEventListener("resize", () => {
            if (window.innerWidth > 900) closeMenu();
          });
        })();
      </script>
    `;

    const updatedHtml = html.replace("</body>", `${mobileNav}</body>`);
    const headers = new Headers(response.headers);
    headers.set("content-type", "text/html; charset=UTF-8");

    return new Response(updatedHtml, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
};
