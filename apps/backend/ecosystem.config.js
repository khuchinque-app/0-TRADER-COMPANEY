module.exports = {
  apps: [{
    name: "backend",
    cwd: "/home/khuchinque/0-TRADER-COMPANEY/apps/backend",
    script: "npm",
    args: "start",
    env: {
      PORT: "11110",
      NODE_ENV: "production"
    }
  }]
};
