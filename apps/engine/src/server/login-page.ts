// Simple login page for the trading venue
// Served at GET / and POST /api/auth/login

import express, { type Request, type Response } from 'express';
import { createHash } from 'crypto';

const LOGIN_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ChinQue Trading — Login</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #090909;
    color: #f4f4f5;
    font-family: 'Inter', -apple-system, sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
  }
  .card {
    background: #101113;
    border: 1px solid #ffffff0d;
    border-radius: 16px;
    padding: 40px;
    width: 100%;
    max-width: 400px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.55);
  }
  .logo {
    font-size: 24px;
    font-weight: 700;
    margin-bottom: 8px;
    background: linear-gradient(135deg, #22c55e, #3080ff);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .subtitle {
    color: #ffffff9e;
    font-size: 13px;
    margin-bottom: 32px;
  }
  .field {
    margin-bottom: 20px;
  }
  .field label {
    display: block;
    font-size: 12px;
    color: #ffffff9e;
    margin-bottom: 6px;
  }
  .field input {
    width: 100%;
    padding: 12px 14px;
    background: #0b0b0c;
    border: 1px solid #ffffff0d;
    border-radius: 8px;
    color: #f4f4f5;
    font-size: 14px;
    outline: none;
    transition: border-color 0.15s;
  }
  .field input:focus {
    border-color: #3080ff80;
  }
  .btn {
    width: 100%;
    padding: 12px;
    background: linear-gradient(135deg, #22c55e, #16a34a);
    border: none;
    border-radius: 8px;
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.15s;
  }
  .btn:hover { opacity: 0.9; }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .msg {
    margin-top: 16px;
    font-size: 13px;
    text-align: center;
    min-height: 20px;
  }
  .msg.error { color: #ef4444; }
  .msg.success { color: #22c55e; }
  .dev-note {
    margin-top: 24px;
    padding: 12px;
    background: #0b0b0c;
    border-radius: 8px;
    font-size: 11px;
    color: #ffffff61;
    text-align: center;
  }
</style>
</head>
<body>
<div class="card">
  <div class="logo">ChinQue Trading</div>
  <div class="subtitle">Paper Trading Venue — Simulation Mode</div>
  <form id="loginForm">
    <div class="field">
      <label>Email / Username</label>
      <input type="text" id="email" placeholder="chinque" required autocomplete="username">
    </div>
    <div class="field">
      <label>Password</label>
      <input type="password" id="password" placeholder="••••••••" required autocomplete="current-password">
    </div>
    <button type="submit" class="btn" id="btn">Sign In</button>
  </form>
  <div class="msg" id="msg"></div>
  <div class="dev-note">
    Dev account: chinque / admin1<br>
    Or create new account via /api/auth/signup
  </div>
</div>
<script>
  const form = document.getElementById('loginForm');
  const msg = document.getElementById('msg');
  const btn = document.getElementById('btn');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    if (!email || !password) { msg.className = 'msg error'; msg.textContent = 'Please fill all fields'; return; }
    btn.disabled = true; btn.textContent = 'Signing in...'; msg.className = 'msg'; msg.textContent = '';
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.ok) {
        msg.className = 'msg success';
        msg.textContent = 'Login successful! Redirecting...';
        setTimeout(() => { window.location.href = '/dashboard'; }, 800);
      } else {
        msg.className = 'msg error';
        msg.textContent = data.message || 'Login failed';
      }
    } catch (err) {
      msg.className = 'msg error';
      msg.textContent = 'Network error';
    } finally {
      btn.disabled = false; btn.textContent = 'Sign In';
    }
  });
</script>
</body>
</html>`;

export function createLoginPage() {
  const router = express.Router();

  // GET / — serve login page
  router.get('/', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(LOGIN_HTML);
  });

  return router;
}
