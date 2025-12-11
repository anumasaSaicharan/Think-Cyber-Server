module.exports = {
  apps: [
    {
      name: "thinkcyber-api",
      script: "npm",
      args: "run start",
      cwd: "/var/www/java/ThinkCyber/server",
      env: {
        NODE_ENV: "production",
        NEXTAUTH_URL: "https://api.thinkcyber.info",
        NEXTAUTH_SECRET: "6b7f8e2c9a1d4e50ds5f2b8a7d9e0f1c4b"
      }
    }
  ]
};

