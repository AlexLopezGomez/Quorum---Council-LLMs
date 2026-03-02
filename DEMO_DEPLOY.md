# Siguientes Pasos — Demo Mode

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

## 2. Verificar que el modo real no se rompió

```bash
# Con MongoDB corriendo y .env con API keys reales
cd backend
node src/index.js
```

Sin la variable `DEMO_MODE`, todo funciona igual que antes — judges reales, MongoDB real.

## 3. Deployar en Render

1. Ir a [dashboard.render.com](https://dashboard.render.com)
2. **New** → **Blueprint** → conectar el repo de GitHub
3. Render detecta `render.yaml` y crea el servicio automáticamente
4. Las variables de entorno (`DEMO_MODE=true`, `NODE_ENV=production`, `PORT=3000`) ya están configuradas en el yaml
5. Esperar el build (~2–3 min)
6. La URL pública queda tipo `https://quorum.onrender.com`

**Nota:** El free tier de Render duerme el servicio tras 15 min de inactividad. La primera visita tarda ~30s en despertar.

## 4. Actualizar el README con la URL real

Una vez que tengas la URL de Render, reemplazar en `README.md`:

```
> **[Live Demo](https://quorum.onrender.com)**
```

Por la URL real que te asigne Render.

## 5. Grabar GIFs (opcional, para el portfolio)

Tres grabaciones recomendadas:

1. **SSE streaming** — Hacer clic en "Run Demo" y grabar cómo los judges aparecen escalonados con scores animándose
2. **Routing adaptativo** — Mostrar cómo distintos test cases reciben council/hybrid/single
3. **Cost dashboard** — Ir al historial, abrir el desglose de costos, mostrar el ahorro vs all-council

Herramientas: [Kap](https://getkap.co/) (Mac), [ScreenToGif](https://www.screentogif.com/) (Windows), o `ffmpeg` desde terminal.

## 6. Compartir

- Actualizar el repo en GitHub (push de los cambios)
- Poner la URL del demo en la bio/descripción del repo
- Agregar el GIF al README si lo grabaste
