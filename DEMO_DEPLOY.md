# Deploy Guide — Render + Custom Domain

## 1. Probar localmente

```bash
# Construir el frontend
cd frontend && npm run build && cd ..

# Arrancar en demo mode (sin MongoDB, sin API keys)
cd backend
DEMO_MODE=true node src/index.js
```

Abrir `http://localhost:3000`. Hacer clic en **"Run Demo"** para lanzar una evaluación con 10 test cases adaptativos.

Verificar que:
- Los judges aparecen escalonados con animación en tiempo real
- Los test cases de alto riesgo (médico, legal, químico) usan **council** (3 judges)
- Los de riesgo medio (finanzas, redes, ML) usan **hybrid** (deterministic + 1 judge)
- Los simples (capital de Japón, inventor del teléfono) usan **single** (1 judge)
- El historial muestra la evaluación completada
- La ruta `/health` devuelve `"mongodb": "demo_mode"`

## 2. Deployar en Render

1. Ir a [dashboard.render.com](https://dashboard.render.com)
2. **New** → **Blueprint** → conectar el repo de GitHub
3. Render detecta `render.yaml` y crea el servicio automáticamente
4. Las variables de entorno ya están configuradas en el yaml:
   - `DEMO_MODE=true` — mock judges, sin MongoDB
   - `NODE_ENV=production`
   - `PORT=3000`
   - `NODE_VERSION=20`
5. Esperar el build (~2–3 min)
6. La URL pública queda tipo `https://quorum.onrender.com`

**Nota:** El free tier de Render duerme el servicio tras 15 min de inactividad. La primera visita tarda ~30s en despertar. Para evitarlo, upgradealo a Starter ($7/mo).

## 3. Conectar dominio personalizado

### En tu proveedor de DNS (Namecheap, Cloudflare, GoDaddy, etc.)

| Tipo    | Host / Name | Valor / Target                |
| ------- | ----------- | ----------------------------- |
| `CNAME` | `@` o `www` | `quorum.onrender.com`         |

> Si tu proveedor no permite CNAME en el apex (`@`), usa un ALIAS/ANAME record o configura solo `www.testquorum.com` como CNAME y redirige el apex a `www`.

### En Render Dashboard

1. Ir a tu servicio → **Settings** → **Custom Domains**
2. Click **Add Custom Domain**
3. Escribir tu dominio: `testquorum.com` (y/o `www.testquorum.com`)
4. Render verifica el DNS y provisiona un certificado TLS automáticamente (~2-5 min)
5. Una vez verificado, el candado verde aparece y tu dominio está activo

### Verificar

- Abrir `https://testquorum.com` — debería cargar la landing page
- Abrir `https://testquorum.com/health` — debería devolver `{"status":"ok","mongodb":"demo_mode"}`

## 4. Variables de entorno por modo

### DEMO_MODE (actual — sin DB, mock judges)

| Variable       | Valor         | Ya en render.yaml |
| -------------- | ------------- | :---: |
| `DEMO_MODE`    | `true`        | ✅ |
| `NODE_ENV`     | `production`  | ✅ |
| `PORT`         | `3000`        | ✅ |
| `NODE_VERSION` | `20`          | ✅ |

### Producción completa (futuro — DB real, judges reales)

| Variable                       | Descripción                                    | Requerida |
| ------------------------------ | ---------------------------------------------- | :---: |
| `MONGODB_URI`                  | Connection string de MongoDB Atlas (con TLS)   | ✅ |
| `JWT_SECRET`                   | String de ≥32 caracteres                       | ✅ |
| `API_KEY_ENCRYPTION_SECRET`    | String hex de 64 caracteres                    | ✅ |
| `OPENAI_API_KEY`               | API key de OpenAI                              | ✅ |
| `ANTHROPIC_API_KEY`            | API key de Anthropic                           | ✅ |
| `GOOGLE_API_KEY`               | API key de Google AI                           | ✅ |
| `FRONTEND_URL`                 | URL del frontend (para CORS)                   | ✅ |
| `COOKIE_SAME_SITE`             | `strict` (same-origin) o `lax`                 | |
| `JWT_EXPIRES_IN`               | Default: `7d`                                  | |
| `EVALUATION_TIMEOUT`           | Default: `30000`                               | |
| `ADAPTIVE_MODE`                | Default: `true`                                | |
| `LOG_PERSIST`                  | Default: `false`                               | |
| `OPENAI_MAX_CONCURRENCY`       | Default: `2`                                   | |
| `ANTHROPIC_MAX_CONCURRENCY`    | Default: `2`                                   | |
| `GEMINI_MAX_CONCURRENCY`       | Default: `2`                                   | |

## 5. Grabar GIFs (opcional, para portfolio)

1. **SSE streaming** — Click en "Run Demo", grabar judges apareciendo con scores animados
2. **Routing adaptativo** — Mostrar council/hybrid/single por tipo de test case
3. **Cost dashboard** — Historial → desglose de costos → ahorro vs all-council

Herramientas: [ScreenToGif](https://www.screentogif.com/) (Windows), [Kap](https://getkap.co/) (Mac)
