module.exports = {
  apps: [{
    name: "terminal",
    script: "npm",
    cwd: "/home/khuchinque/0-TRADER-COMPANEY/apps/terminal",
    args: "start",
    env: {
      NODE_ENV: "production",
      PORT: 22220,
      API_INTERNAL_URL: "http://localhost:11110"
    }
  }]
}
