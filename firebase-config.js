// =====================================================
// CONFIGURACIÓN DE FIREBASE
// -----------------------------------------------------
// 1. Ve a https://console.firebase.google.com
// 2. Crea un proyecto (nombre libre, ej. "conteo-actividades")
// 3. En el proyecto: Add app → Web ( </> )
// 4. Copia los valores de firebaseConfig y pégalos abajo.
// 5. Activa Firestore: Build → Firestore Database → Create database (modo producción).
// 6. Activa Authentication: Build → Authentication → Sign-in method → Email/Password (Enable).
// 7. Crea tu usuario admin: Authentication → Users → Add user (correo + contraseña).
// 8. Reglas de Firestore (ver más abajo en este archivo).
// =====================================================

export const firebaseConfig = {
    apiKey: "AIzaSyAlXjKy4PEoaWGyKE8y2BZB2h4Zdew4ihI",
    authDomain: "ramillete-espiritual-95828.firebaseapp.com",
    projectId: "ramillete-espiritual-95828",
    storageBucket: "ramillete-espiritual-95828.firebasestorage.app",
    messagingSenderId: "531016835362",
    appId: "1:531016835362:web:a34bcaf1b4a677949b457b",
    measurementId: "G-EY5V7HPN72"
};

// Nombre de la colección donde se guardan los registros.
export const COLLECTION_NAME = 'registros';

/* =====================================================
REGLAS DE FIRESTORE (cópialas en Firebase → Firestore → Rules)
=====================================================

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /registros/{doc} {
      // Cualquiera puede crear un registro nuevo desde el cuestionario
      allow create: if request.resource.data.keys().hasAll(['name', 'date', 'counts', 'total'])
                    && request.resource.data.name is string
                    && request.resource.data.name.size() >= 2
                    && request.resource.data.name.size() <= 80
                    && request.resource.data.total is int
                    && request.resource.data.total >= 0
                    && request.resource.data.total <= 100000;

      // Solo usuarios autenticados (admin) pueden leer / actualizar / borrar
      allow read, update, delete: if request.auth != null;
    }
  }
}

===================================================== */
