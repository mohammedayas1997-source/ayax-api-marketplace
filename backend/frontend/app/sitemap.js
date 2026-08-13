export default function sitemap() {
  const baseUrl = "https://ayax-api-marketplace.vercel.app";

  const routes = [
    "",
    "/about",
    "/pricing",
    "/docs",
    "/contact",
    "/privacy",
    "/terms",
    "/faq",
    "/refund-policy",
    "/security",
    "/status",
    "/partners",
    "/careers",
    "/cookies",
    "/changelog",
    "/login",
    "/register",
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: route === "" ? 1 : 0.8,
  }));
}