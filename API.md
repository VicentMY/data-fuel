# API Documentation: Data Fuel ⛽️

Este documento describe los endpoints disponibles en la API de Data Fuel.

## Endpoints

### 1. Gasolineras
Obtiene una lista de estaciones de servicio basadas en la ubicación del usuario.

*   **URL**: `/api/gasolineras`
*   **Método**: `GET`
*   **Parámetros de consulta (Query Params)**:
    *   `lat` (número, requerido): Latitud del usuario.
    *   `lon` (número, requerido): Longitud del usuario.
    *   `radius` (número, opcional, default: 5): Radio de búsqueda en kilómetros.
    *   `fuel` (string, opcional, default: 'G95'): Tipo de combustible. Opciones: `G95`, `G98`, `DIESEL`, `DIESEL_PLUS`, `GLP`.

*   **Respuesta Exitosa (200)**:
    ```json
    {
      "count": 10,
      "fuel": "G95",
      "stations": [
        {
          "id": "12345",
          "name": "Estación de Servicio Ejemplo",
          "brand": "Repsol",
          "address": "Calle Falsa 123",
          "locality": "Madrid",
          "dist": 1.2,
          "price": 1.549,
          "updatedAt": "2026-06-01T10:00:00Z"
        }
      ]
    }
    ```

### 2. Estado del Sistema
Obtiene el estado actual del proceso de ingesta de datos.

*   **URL**: `/api/status`
*   **Método**: `GET`
*   **Respuesta Exitosa (200)**:
    ```json
    {
      "status": "online",
      "lastSync": "2026-06-01T12:00:00Z"
    }
    ```

### 3. Detalle de Gasolinera
Obtiene la información detallada de una gasolinera específica.

*   **URL**: `/api/gasolineras/{id}`
*   **Método**: `GET`
*   **Respuesta Exitosa (200)**:
    ```json
    {
      "station": {
        "id": "12345",
        "name": "Estación Ejemplo",
        "prices": { "G95": 1.549, "DIESEL": 1.459, ... }
      }
    }
    ```

### 4. Predicciones de Precios
Obtiene predicciones de precios para provincias o estaciones.

*   **URL**: `/api/predicciones?id_provincia={id}`
*   **Método**: `GET`, `POST` (Trigger reentrenamiento)

*   **URL**: `/api/predicciones/station/{id}`
*   **Método**: `GET`
*   **Descripción**: Obtiene la predicción específica para una estación por su ID.

