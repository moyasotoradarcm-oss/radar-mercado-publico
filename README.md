# Radar Mercado Público Chile

Plataforma para buscar licitaciones, convenio marco y compra ágil de Mercado Público, evaluar oportunidades con IA (Gemini) y gestionar postulaciones.

Los datos de licitaciones y órdenes de compra provienen **solo** de la API oficial `api.mercadopublico.cl`. Si la API falla o no hay ticket configurado, la app muestra un aviso y no rellena con datos de ejemplo.

## Requisitos

- Node.js 20+
- Ticket de la API de Mercado Público: https://api.mercadopublico.cl

## Desarrollo local

```bash
cp .env.example .env    # completa MERCADOPUBLICO_TICKET (y GEMINI_API_KEY si usarás IA)
npm install
npm run dev             # http://localhost:3000
```

En desarrollo, `APP_USER` y `APP_PASSWORD` son opcionales. Si los defines, el navegador pedirá usuario y contraseña.

## Variables de entorno

| Variable | Obligatoria | Uso |
|---|---|---|
| `MERCADOPUBLICO_TICKET` | Sí | Ticket de la API oficial. Solo vive en el servidor. |
| `APP_USER` / `APP_PASSWORD` | Sí en producción | Acceso a toda la app (HTTP Basic). La contraseña debe tener 12 caracteres o más. |
| `GEMINI_API_KEY` | No | Evaluaciones IA. Sin ella, se muestra una estimación marcada como "sin IA". |
| `DATABASE_URL`, `SUPABASE_*` | Recomendada | Persistencia. Sin ella, los datos se guardan en JSON locales, que se pierden al redesplegar. |
| `DATABASE_CA_CERT` | No | Certificado CA (PEM) para verificar el SSL de la base de datos. |
| `ENABLE_MP_SCRAPER` | No | `true` habilita la conexión ClaveÚnica/Puppeteer en producción. No se recomienda. |

## Producción con Docker (Google Cloud Run)

```bash
gcloud run deploy radar-mercado-publico \
  --source . \
  --region southamerica-west1 \
  --allow-unauthenticated \
  --set-secrets MERCADOPUBLICO_TICKET=mp-ticket:latest,APP_PASSWORD=app-password:latest,GEMINI_API_KEY=gemini-key:latest \
  --set-env-vars APP_USER=admin
```

Antes, crea los secretos en Secret Manager (`gcloud secrets create mp-ticket --data-file=-`). `--allow-unauthenticated` solo deja pasar el tráfico hasta la app; la app igual pide usuario y contraseña.

Para probar la imagen en tu equipo:

```bash
docker build -t radar-mp .
docker run --rm -p 8080:8080 --env-file .env -e APP_USER=admin -e APP_PASSWORD='una-clave-larga-segura' radar-mp
```

## Seguridad

- No subas `.env`, `session_mp.json` ni `storageState.json`; ya están en `.gitignore`.
- La conexión con ClaveÚnica (`/api/mp/connect`) está deshabilitada en producción. Úsala solo en tu equipo.
- El límite de peticiones es en memoria y por instancia. Si escalas a varias instancias, usa un límite compartido (por ejemplo, Cloud Armor).
