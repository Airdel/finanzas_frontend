# Finanzas Quincenales v2 · Frontend

App (React 19 + Vite + Tailwind + zustand) que se empaqueta como APK de Android con [Capacitor](https://capacitorjs.com). Base visual de monmoncafé: temas fresa, matcha, lavanda, café y noche, con panel de vidrio.

## Desarrollo web

```bash
npm install
npm run dev        # http://localhost:5173
```

La URL de la API sale de `VITE_API_URL` (por defecto `http://localhost:3101/api`) y se cambia en el login, en **Servidor**. Se guarda en el dispositivo.

## App Android (S24 FE y Tab S10+)

La app no trae el backend: habla con la API de la PC de oficina **por Tailscale**.

### 1. Obtener el APK

**Desde GitHub:** cada push a `main` y cada PR corre el job `android` del CI y publica `finanzas-debug-apk` (pestaña *Actions* → la corrida → *Artifacts*). Descarga el zip y extrae `app-debug.apk`.

**En la PC:** con Android Studio y JDK 21, `npm run android:apk`. Queda en `android/app/build/outputs/apk/debug/app-debug.apk`.

### 2. Instalar y conectar

1. Instala Tailscale en el teléfono/tablet con la misma cuenta que la PC.
2. Abre `http://<IP-Tailscale-de-la-PC>:3101/api/health` en el navegador del teléfono: debe responder `"status":"ok"`.
3. Instala `app-debug.apk` (Android pedirá permitir origen desconocido).
4. En el login escribe en **Servidor** la IP de Tailscale (`100.x.y.z` basta; se completa como `http://100.x.y.z:3101/api`) y entra.

Si aparece *No se pudo conectar con el servidor*: revisa que Tailscale esté activo en ambos lados, que la API corra y que el firewall de Windows permita el puerto 3101.

### Notas técnicas

- `capacitor.config.ts` sirve la app como `http://localhost` y permite tráfico sin cifrar: la API es HTTP dentro del túnel de Tailscale (que ya va cifrado). Por eso el backend debe incluir `http://localhost` en `FRONTEND_URL`.
- `allowBackup="false"`: los tokens de sesión no se copian al respaldo de Google.
- El APK de debug va firmado con la llave de debug: sirve para instalarlo a mano, no para Play Store.
