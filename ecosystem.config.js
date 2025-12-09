module.exports = {
  apps: [
    {
      name: "thinkcyber-admin",
      script: "npm",
      args: "run start",
      cwd: "/var/www/java/ThinkCyber/admin",
      env: {
        NODE_ENV: "production",
        NEXTAUTH_URL: "https://admin.thinkcyber.info",
        NEXTAUTH_SECRET: "6b7f8e2c9a1d4e5f3c2b8a7d9e0f1c4b"
      }
    }
  ]
};

