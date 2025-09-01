# Bienvenido a The Resolution Hub

## Acerca del Proyecto

**The Resolution Hub** es un sistema integral de gestión diseñado para optimizar y simplificar la organización de Modelos de Naciones Unidas (MUN). Nuestra plataforma está creada para gestionar todo el ciclo de vida de un evento MUN, desde el registro y la asignación de delegados hasta la creación de resoluciones y la votación.

El objetivo es proporcionar a los organizadores y participantes una herramienta poderosa y fácil de usar, eliminando las complejidades manuales y permitiendo que todos se concentren en lo que realmente importa: el debate y la diplomacia.

---

## Primeros Pasos

### Instalación Local

Para trabajar en el proyecto de forma local usando tu IDE preferido, sigue estos pasos. Asegúrate de tener **Node.js y npm** instalados en tu máquina.

1.  **Clona el repositorio**

    ```sh
    git clone <YOUR_GIT_URL>
    ```

2.  **Navega al directorio del proyecto**

    ```sh
    cd <YOUR_PROJECT_NAME>
    ```

3.  **Instala las dependencias necesarias**

    ```sh
    npm i
    ```

4.  **Inicia el servidor de desarrollo**

    ```sh
    npm run dev
    ```

### Configuración de la Base de Datos (Firestore)

**The Resolution Hub** utiliza **Firestore** para el almacenamiento de datos.

Para el desarrollo local, necesitarás configurar las variables de entorno de tu proyecto en un archivo `.env` en la raíz de tu directorio. Crea un archivo llamado `.env.local` con el siguiente contenido:

```env
VITE_APP_ID=
VITE_FIREBASE_CONFIG=
VITE_INITIAL_AUTH_TOKEN=
VITE_APP_ID: El ID de la aplicación.
VITE_FIREBASE_CONFIG: La configuración JSON de tu proyecto de Firebase.
VITE_INITIAL_AUTH_TOKEN: El token de autenticación inicial para la sesión.
```

### Métodos de Edición
Usa GitHub Codespaces
1. Navega a la página principal de tu repositorio.
2. Haz clic en el botón verde "Code".
3. Selecciona la pestaña "Codespaces".
4. Haz clic en "New codespace" para lanzar un nuevo entorno.


### Créditos y Derecho de Autor
Este proyecto es propiedad intelectual de Legalify Colombia.
Ha sido diseñado y arquitectado por Jose Gutierrez Contreras.
Cuenta con el patrocinio oficial de la Universidad de Santander.
Desarrollado con la ayuda de la plataforma de desarrollo Lovable.dev.
