# Recomposición — plan personal

App de una sola página para seguir el plan de entrenamiento, movilidad, alimentación y progreso. Sin backend, sin cuentas, sin dependencias que instalar.

## Publicarla en GitHub Pages

1. En GitHub, crea un repositorio nuevo. Puede ser **privado**: Pages funciona igual en cuentas con plan gratuito para repos públicos; si lo quieres privado necesitas GitHub Pro. Si vas a usar repo público, ten en cuenta que el archivo del plan queda visible (no contiene datos personales, solo el plan).
2. Sube todos los archivos de esta carpeta a la raíz del repositorio: `index.html`, `app.jsx`, `manifest.webmanifest`, `sw.js` y los cuatro `.png`.
3. Ve a **Settings → Pages**. En *Source* elige **Deploy from a branch**, rama `main`, carpeta `/ (root)`. Guarda.
4. Espera 1–2 minutos. La URL queda en `https://TUUSUARIO.github.io/NOMBREDELREPO/`.
5. Abre esa URL en el celular, en Safari o Chrome.
6. **Safari (iPhone):** botón de compartir → *Añadir a pantalla de inicio*. **Chrome (Android):** menú de tres puntos → *Instalar aplicación* o *Añadir a pantalla de inicio*.

Queda con ícono propio, abre en pantalla completa sin barra del navegador y funciona sin conexión después de la primera visita.

## Probarla en tu computador antes de publicar

No abras `index.html` con doble clic: Babel no puede cargar `app.jsx` desde `file://`. Necesitas un servidor local:

```bash
cd plan-web
python3 -m http.server 8080
```

Y abre `http://localhost:8080`.

## Dónde quedan tus datos

En el `localStorage` del navegador donde uses la app, bajo la clave `fitplan:v2`. Eso significa:

- **No se sincronizan** entre el celular y el computador. Son dos copias independientes.
- Si borras los datos del sitio o desinstalas el navegador, se pierden.
- Usa **Progreso → Copia de seguridad → Exportar mis datos** una vez al mes. Guarda ese JSON en Drive. Para pasarlos a otro dispositivo, ábrelo allá con *Importar desde archivo*.

Si algún día quieres sincronización real, el camino más corto es Supabase o Firebase en plan gratuito: se reemplaza el objeto `window.storage` del inicio de `app.jsx` por llamadas a la base de datos y el resto del código no cambia.

## Cuando edites el plan

1. Modifica `app.jsx`. Los datos del plan están todos arriba, en constantes legibles: `WINDOWS`, `TARGETS`, `SESSIONS`, `STRETCH`, `RESTRICTIONS`, `RECIPES`, `MARKET`.
2. **Sube el número de versión del caché en `sw.js`** (`recomp-v1` → `recomp-v2`). Si no lo haces, el celular te va a seguir mostrando la versión anterior y vas a pensar que el cambio no funcionó.
3. Haz commit y push. GitHub Pages se actualiza solo en un par de minutos.

## Estructura

| Archivo | Qué hace |
|---|---|
| `index.html` | Carga React y Babel desde CDN y monta la app |
| `app.jsx` | Toda la aplicación: datos del plan, vistas y estilos |
| `manifest.webmanifest` | Nombre, colores e iconos para que se pueda instalar |
| `sw.js` | Caché para funcionar sin conexión |
| `*.png` | Iconos de la app |

## Nota

El plan es orientativo. Cualquier ejercicio nuevo, y sobre todo el trabajo de cadera y pierna, va primero por el fisioterapeuta.
