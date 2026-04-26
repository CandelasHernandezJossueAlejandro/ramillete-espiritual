# Conteo de Actividades Espirituales

Web responsiva con dos partes:

- **`index.html`** — Cuestionario público (cualquiera lo llena, sin login).
- **`admin.html`** — Panel administrativo privado (solo tú, con login).

Los registros se guardan en **Firebase Firestore** y el panel los muestra agrupados por persona, por actividad y por fecha.

---

## Estructura de archivos

```
.
├── index.html            # Cuestionario público
├── admin.html            # Panel administrativo
├── styles.css            # Estilos compartidos
├── script.js             # Lógica del cuestionario + guarda en Firestore
├── admin.js              # Lógica del panel (auth + queries + render)
├── firebase-config.js    # Tus credenciales de Firebase (debes editar)
└── README.md             # Este archivo
```

Sin frameworks, sin build. HTML/CSS/JS plano + Firebase desde CDN.

---

## Configuración de Firebase (5 minutos)

### 1. Crear proyecto

1. Abre <https://console.firebase.google.com> y entra con tu cuenta de Google.
2. Click **Add project** (o **Agregar proyecto**) y dale un nombre, p.ej. `conteo-actividades`.
3. Acepta los términos. Puedes desactivar Google Analytics si quieres (no es necesario).

### 2. Registrar la app web

1. En el dashboard del proyecto, click el icono **`</>`** (Web).
2. Ponle un nick (ej. `Web`). **No** marques "Firebase Hosting" — usaremos GitHub Pages.
3. Aparecerá un objeto `firebaseConfig` con tus credenciales. **Copia esos valores**.
4. Pégalos en `firebase-config.js`, reemplazando los valores `TU_API_KEY`, etc.

### 3. Activar Firestore (base de datos)

1. Menú lateral → **Build → Firestore Database** → **Create database**.
2. Elige **Start in production mode** (modo producción).
3. Selecciona la región (ej. `us-central` o la más cercana). Click **Enable**.
4. Una vez creada, ve a la pestaña **Rules** y pega esto:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /registros/{doc} {
         allow create: if request.resource.data.keys().hasAll(['name', 'date', 'counts', 'total'])
                       && request.resource.data.name is string
                       && request.resource.data.name.size() >= 2
                       && request.resource.data.name.size() <= 80
                       && request.resource.data.total is int
                       && request.resource.data.total >= 0
                       && request.resource.data.total <= 100000;

         allow read, update, delete: if request.auth != null;
       }
     }
   }
   ```

5. Click **Publish**.

Esto permite que cualquiera **cree** un registro desde el cuestionario, pero solo usuarios autenticados (tú) pueden **leer / borrar** desde el panel admin.

### 4. Activar Authentication (login del admin)

1. Menú lateral → **Build → Authentication** → **Get started**.
2. Pestaña **Sign-in method** → habilita **Email/Password**. Save.
3. Pestaña **Users** → **Add user**. Crea tu correo + contraseña admin.
   - Esta es la cuenta con la que entrarás en `admin.html`.

### 5. Autorizar tu dominio (importante)

En **Authentication → Settings → Authorized domains** asegúrate de que aparezcan:

- `localhost` (para pruebas)
- `<tu-usuario>.github.io` (cuando subas a GitHub Pages)

Firebase suele añadirlos automáticamente, pero conviene verificar.

---

## Probar en local

Como `script.js` usa `import` (ES modules), **no funciona** abriendo `index.html` directo con doble clic. Necesitas un servidor local.

Opciones rápidas:

```bash
# Si tienes Python:
python -m http.server 8000

# O con Node:
npx http-server -p 8000

# O VS Code: extensión "Live Server" → click derecho → Open with Live Server
```

Luego abre <http://localhost:8000> en el navegador.

---

## Subir a GitHub Pages

1. Crea un repositorio público nuevo en GitHub (ej. `conteo-actividades`).
2. Sube todos los archivos a la rama `main`:

   ```bash
   git init
   git add .
   git commit -m "Versión inicial"
   git branch -M main
   git remote add origin https://github.com/<tu-usuario>/<tu-repo>.git
   git push -u origin main
   ```

3. En GitHub → **Settings → Pages** → Source: **Deploy from a branch** → rama `main`, carpeta `/ (root)` → Save.
4. Espera ~1 minuto. Tu sitio quedará en:

   - Cuestionario: `https://<tu-usuario>.github.io/<tu-repo>/`
   - Panel admin: `https://<tu-usuario>.github.io/<tu-repo>/admin.html`

⚠️ **Recuerda añadir el dominio** `<tu-usuario>.github.io` a *Authorized domains* en Firebase Authentication, si no, no podrás iniciar sesión en el panel.

---

## Estructura de los registros en Firestore

Colección: **`registros`**

```json
{
  "name":      "Juan Pérez",
  "nameLower": "juan pérez",
  "date":      "2026-04-25",
  "counts": {
    "padresnuestros": 5,
    "avesmarias": 50,
    "rosarios": 1,
    "ayunos": 0,
    "apostolados": 1,
    "horas": 8,
    "oraciones": 3,
    "comuniones": 1,
    "confesiones": 0,
    "misas": 1
  },
  "total":     70,
  "timestamp": <serverTimestamp>
}
```

---

## Personalización

- **Lista de actividades**: edita el arreglo `ACTIVITIES` al inicio de `script.js` *y* `admin.js` (deben coincidir).
- **Colores**: variables CSS en `:root` dentro de `styles.css`.
- **Texto de la introducción**: directamente en `index.html`, sección `#screenIntro`.

---

## Funcionamiento sin Firebase

Si dejas `firebase-config.js` con los valores `TU_API_KEY`, el cuestionario sigue funcionando localmente: la gente puede llenarlo y compartir su resumen por WhatsApp/correo, pero **no se guardará** en la nube. El panel admin mostrará un aviso indicando que falta la configuración.
