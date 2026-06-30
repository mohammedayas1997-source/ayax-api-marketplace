export default function robots() {
  const baseUrl = "https://ayax-api-marketplace.vercel.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/super-admin",
          "/dashboard",
          "/customer-service",
          "/staff-admin",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}