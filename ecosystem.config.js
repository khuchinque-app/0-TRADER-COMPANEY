module.exports = {
  apps: [
    {
      name: "backend",
      script: "./apps/backend/dist/index.js",
      cwd: "/home/khuchinque/0-TRADER-COMPANEY",
      env: {
        NODE_ENV: "production",
        PORT: 11110
      }
    },
    {
      name: "terminal",
      script: "next",
      args: "start -p $PORT_TERMINAL",
      cwd: "/home/khuchinque/0-TRADER-COMPANEY/apps/terminal",
      env: {
        NODE_ENV: "production",
        PORT: 22220,
        API_INTERNAL_URL: "http://localhost:11110"
      }
    }
  ]
};
