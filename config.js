// ============================================================
//  CONFIGURACIÓN CANIRAC LAGUNA
//  Aquí controlas Firebase y el acceso del administrador.
// ============================================================

// ---- Firebase (proyecto canirac-2f1a4) ----
// Estos valores NO son secretos: van del lado del cliente. La seguridad
// se controla con las Reglas de Firestore (ver README).
export const firebaseConfig = {
  apiKey: "AIzaSyBQfqXwOGRSo1manTh6y_ouyfE_wY9UrVM",
  authDomain: "canirac-2f1a4.firebaseapp.com",
  projectId: "canirac-2f1a4",
  storageBucket: "canirac-2f1a4.firebasestorage.app",
  messagingSenderId: "115819887894",
  appId: "1:115819887894:web:5e3ca8de54c36832482437",
  measurementId: "G-NM08HT0Y96"
};

// Pon en false si quisieras trabajar solo con guardado local (sin nube).
export const USE_FIREBASE = true;

// ---- Acceso del administrador ----
// El usuario escribe "canirac" y su contraseña en el panel.
// En la nube, el sistema inicia sesión en Firebase Auth con ADMIN_EMAIL.
// Debes crear ESE usuario una sola vez en Firebase (ver README, paso 3).
export const ADMIN = {
  usuario: "canirac",
  // Correo interno usado para Firebase Authentication (Email/Password).
  email: "canirac@caniraclaguna.mx",
  // Contraseña de respaldo para el modo local (sin nube).
  passwordLocal: "Ul1979_*"
};

// ---- Datos de contacto de la Cámara (inicio) ----
export const CONTACTO = {
  instagram: "https://www.instagram.com/caniraclaguna",
  whatsapp: "5218717342078", // +52 1 871 734 2078
  // Mensaje predeterminado al dar clic en el WhatsApp de la Cámara (inicio)
  whatsappMensaje: "Hola, te vi en tu sitio web. Me interesa ser parte de la Cámara (CANIRAC Laguna). ¿Me podrían dar más información, por favor?"
};

// ---- Mensaje predeterminado al contactar a un PROVEEDOR ----
export const MENSAJE_PROVEEDOR =
  "Hola, te vi en Proveedores CANIRAC. Me interesa tu producto/servicio. ¿Me podrías dar más información, por favor?";
