# AccessScan — deploy quickstart (Fedora)

```bash
cd ~/Projects/AccessScan
npm install                      # postinstall runs: npx playwright install chromium
# if chromium system deps are missing on Fedora:
#   sudo dnf install nss nspr atk at-spi2-atk cups-libs libdrm libxkbcommon \
#     libXcomposite libXdamage libXrandr mesa-libgbm alsa-lib pango cairo

# --- systemd (system unit) ---
sudo cp deploy/accessscan.service /etc/systemd/system/accessscan.service
# edit User=/WorkingDirectory= paths if the checkout lives elsewhere
sudo systemctl daemon-reload && sudo systemctl enable --now accessscan
systemctl status accessscan      # should show "listening on http://localhost:3000"

# --- or user unit (no sudo for the service itself) ---
# systemctl --user link ~/Projects/AccessScan/deploy/accessscan.service
#   (rename to accessscan.service in ~/.config/systemd/user/ first)

# --- HTTPS via Caddy ---
sudo dnf install caddy
# edit deploy/Caddyfile: set your domain, then:
sudo caddy run --config /etc/caddy/Caddyfile   # or copy deploy/Caddyfile there

# --- HTTPS via nginx instead ---
sudo dnf install nginx certbot python3-certbot-nginx
sudo cp deploy/nginx.conf /etc/nginx/conf.d/accessscan.conf
# set ssl_certificate paths after: sudo certbot --nginx -d accessscan.example.com
sudo nginx -t && sudo systemctl reload nginx
```

Notes: server binds 127.0.0.1:3000 (hardcoded) — proxies are required for
public access. Scans run in-memory only; restarting loses history. Rate
limits are in-app (RATE_LIMIT_* env vars, see deploy/.env.example).
