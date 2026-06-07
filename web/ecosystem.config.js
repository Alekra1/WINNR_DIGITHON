// PM2 process config for the winnr box.
// Usage on winnr:  pm2 start ecosystem.config.js  &&  pm2 save
module.exports = {
  apps: [
    {
      name: "winnr-meeting-intel",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      env: { NODE_ENV: "production", PORT: "3000" },
      instances: 1,
      autorestart: true,
      max_restarts: 10,
    },
  ],
};
