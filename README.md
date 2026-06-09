# Data Fuel ⛽️

**Data Fuel** es una plataforma de análisis y visualización de precios de carburantes en tiempo real en España. El proyecto combina la potencia de **Next.js 16** con una arquitectura de ingesta de datos en segundo plano para ofrecer información actualizada y análisis históricos precisos.

## 🚀 Características Principales

- **🗺️ Mapa Interactivo**: Visualización geolocalizada de estaciones de servicio utilizando **Leaflet**.
- **📊 Análisis Histórico**: Gráficos detallados de la evolución de precios mediante **ECharts**.
- **⚡️ Ingesta Inteligente**: Sistema de sincronización automática con la API REST oficial del Ministerio (MITECO) mediante *Worker Threads*.
- **🔍 Filtrado Avanzado**: Búsqueda por tipo de combustible, radio de distancia, marcas específicas y estado de apertura.
- **🌗 Interfaz Moderna**: Diseño responsive con soporte nativo para temas claro y oscuro utilizando **Tailwind CSS 4**.
- **📍 Geolocalización**: Detección automática de la ubicación del usuario para mostrar las estaciones más cercanas.

## 🛠️ Stack Tecnológico

- **Frontend**: [React 19](https://react.dev/), [Next.js 16 (App Router)](https://nextjs.org/), [Tailwind CSS 4](https://tailwindcss.com/).
- **Visualización**: [Leaflet](https://leafletjs.com/) (Mapas), [ECharts](https://echarts.apache.org/) (Gráficos).
- **Backend**: Next.js API Routes, Node.js Worker Threads.
- **Base de Datos**: [PostgreSQL](https://www.postgresql.org/).
- **Iconografía**: [Lucide React](https://lucide.dev/).

## ⚙️ Configuración y Requisitos

### Requisitos Previos

- **Node.js**: v20 o superior.
- **PostgreSQL**: Una instancia activa con las siguientes credenciales (ejemplo):
  - Base de datos: `data_fuel`
  - Usuario: `fuel_admin`
  - Password: `secure_password`
- **.ENV**: Crea un archivo ".env" a partir del ejemplo ".example-env" y completa con tus credenciales.

### Instalación

1. Clona el repositorio:
   ```bash
   git clone https://github.com/tu-usuario/data-fuel.git
   cd data-fuel
   ```

2. Instala las dependencias:
   ```bash
   pnpm install
   ```

3. Levanta el entorno de desarrollo o producción:
   ```bash
   pnpm dev # Desarrollo

   pnpm build # Producción
   pnpm start # Producción
   ```

4. Accede a la aplicación:
   - En el navegador: http://localhost:4000/


La aplicación iniciará automáticamente el proceso de ingesta de datos históricos y actuales en el primer arranque a través del sistema de `instrumentation` de Next.js.

## 🏗️ Arquitectura de Datos

El sistema utiliza un patrón de **Ingesta Desatendida**:
1. Al iniciar el servidor, `instrumentation.ts` dispara el proceso de sincronización.
2. Se descargan catálogos de Comunidades, Provincias y Municipios.
3. Se procesan los precios actuales y se mantiene un histórico detallado en PostgreSQL para análisis de tendencias.
4. Los datos se sirven a través de una API interna optimizada con soporte para caché y búsquedas geoespaciales.

## 📜 Licencia

Este proyecto está bajo la Licencia MIT.
