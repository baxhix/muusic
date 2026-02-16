# Deploy Automatico (GitHub + VPS)

## 1) Publicar no GitHub

No terminal local, dentro do projeto:

```bash
cd /Users/marcelodemaribaxhix/Documents/muusic2.0
git init
git add .
git commit -m "chore: prepare vps deploy"
git branch -M main
git remote add origin git@github.com:SEU_USUARIO/SEU_REPO.git
git push -u origin main
```

## 2) Preparar VPS (Ubuntu)

```bash
sudo apt update
sudo apt install -y nginx git
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm i -g pm2
```

Clone o projeto:

```bash
sudo mkdir -p /var/www
sudo chown -R $USER:$USER /var/www
cd /var/www
git clone git@github.com:SEU_USUARIO/SEU_REPO.git muusic2.0
cd muusic2.0
cp .env.example .env
```

Edite `.env` com valores de producao, principalmente:
- `PORT=3001`
- `FRONTEND_URL=https://SEU_DOMINIO`
- `FRONTEND_URLS=https://SEU_DOMINIO,https://painel.muusic.live`
- `ADMIN_EMAILS=admin@seu_dominio.com`
- `VITE_API_URL=https://SEU_DOMINIO`
- `DATABASE_URL=postgresql://...`
- `REDIS_URL=redis://127.0.0.1:6379`
- `SHOW_CACHE_TTL_MS=60000`
- `SPOTIFY_JWT_SECRET` forte
- `VITE_MAPBOX_TOKEN` valido

Primeira subida:

```bash
npm ci
npm run build
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup
```

## 3) Configurar Nginx

Crie `/etc/nginx/sites-available/muusic2.0`:

```nginx
server {
  server_name SEU_DOMINIO;

  root /var/www/muusic2.0/dist;
  index index.html;

  location /socket.io/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }

  location /auth/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location /admin/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location /health {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
  }

  location / {
    try_files $uri /index.html;
  }
}

server {
  server_name painel.muusic.live;

  root /var/www/muusic2.0/dist;
  index index.html;

  location /auth/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location /admin/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location /health {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
  }

  location / {
    try_files $uri /index.html;
  }
}
```

Ative:

```bash
sudo ln -s /etc/nginx/sites-available/muusic2.0 /etc/nginx/sites-enabled/muusic2.0
sudo nginx -t
sudo systemctl reload nginx
```

TLS (HTTPS):

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d SEU_DOMINIO
sudo certbot --nginx -d painel.muusic.live
```

## 3.1) Cache Cloudflare (recomendado)
- Configure regra para `https://muusic.live/index.html` e `https://painel.muusic.live/index.html` com `Cache Level: Bypass`.
- Para `/auth/*` e `/admin/*`, mantenha sem cache na borda.
- Arquivos versionados do Vite (`/assets/*.js` e `/assets/*.css`) podem ficar com cache normal.

## 4) Segredos no GitHub Actions

No repositório GitHub > Settings > Secrets and variables > Actions:

- `VPS_HOST` (IP ou dominio da VPS)
- `VPS_USER` (usuario SSH da VPS)
- `VPS_PORT` (geralmente `22`)
- `VPS_SSH_KEY` (chave privada completa, multiline)

## 5) Deploy automatico

O workflow `.github/workflows/deploy.yml` faz deploy a cada push na `main`.

Fluxo:
1. GitHub conecta na VPS via SSH.
2. Executa `scripts/deploy_vps.sh main`.
3. Atualiza codigo, instala deps, builda front e reinicia backend no PM2.
