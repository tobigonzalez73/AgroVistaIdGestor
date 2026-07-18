# AgroVistaIdGestor (AgroTrials)

**AgroVistaIdGestor** (también conocido como **AgroTrials**) es una plataforma web completa para la gestión integral de ensayos agronómicos. La aplicación centraliza y optimiza todo el ciclo de vida de un ensayo, desde la planificación y cotización hasta la recolección de datos y el análisis final.

## ✨ Características Principales

*   **Gestión de Ensayos:** Creación y configuración detallada de ensayos.
*   **Planificación y Tratamientos:** Diseño de protocolos, productos y aplicaciones.
*   **Catálogos Centralizados:** Vademécum de productos, clientes y lotes.
*   **Módulos Financieros:** Generación de cotizaciones, seguimiento de comprobantes y cuentas corrientes.
*   **Seguridad y Permisos:** Sistema de roles para controlar el acceso a los distintos módulos.

## 🚀 Tecnologías Utilizadas

*   **Vite:** Entorno de desarrollo y empaquetado de frontend de nueva generación.
*   **React:** Biblioteca para construir la interfaz de usuario.
*   **TypeScript:** Superset de JavaScript que añade tipado estático.
*   **Firebase:** Backend como servicio para autenticación, base de datos (Firestore) y hosting.
*   **Tailwind CSS:** Framework de CSS "utility-first" para un diseño rápido y moderno.
*   **Lucide React:** Paquete de íconos simple y elegante.

## ⚙️ Primeros Pasos

Para levantar el proyecto en tu entorno local, necesitarás tener instalado Node.js (versión 18 o superior). Asegúrate de que las credenciales de Firebase estén configuradas en `src/firebase.ts`.

### 2. Instalación de Dependencias

Abre una terminal en la carpeta del proyecto y ejecuta:
```bash
npm install
```

### 3. Scripts Disponibles

Una vez instaladas las dependencias, puedes usar los siguientes comandos:

*   **Para iniciar el servidor de desarrollo:**
    ```bash
    npm run dev
    ```
    La aplicación estará disponible en `http://localhost:5173` (o el puerto que indique Vite).

*   **Para compilar el proyecto para producción:**
    ```bash
    npm run build
    ```
    Los archivos compilados se generarán en la carpeta `dist`.

*   **Para desplegar en Firebase Hosting:**
    Asegúrate de haber iniciado sesión en Firebase (`firebase login`). Luego, ejecuta:
    ```bash
    npm run deploy
    ```
    Este comando compilará el proyecto y lo subirá a tu hosting de Firebase.
