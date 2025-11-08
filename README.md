# Taller Manager

Aplicación web para gestionar las operaciones de un taller de chapa y pintura: presupuestos, órdenes de trabajo, egresos, ingresos y reportes. Está pensada como un MVP fácilmente extensible y optimizada para usarse desde escritorio o dispositivos móviles.

## Índice
- [Tecnologías](#tecnologías)
- [Arquitectura](#arquitectura)
- [Características principales](#características-principales)
- [Modelo de datos](#modelo-de-datos)
- [Requerimientos previos](#requerimientos-previos)
- [Configuración inicial](#configuración-inicial)
- [Scripts disponibles](#scripts-disponibles)
- [Flujos de trabajo](#flujos-de-trabajo)
  - [Clientes](#clientes)
  - [Presupuestos](#presupuestos)
  - [Órdenes de trabajo](#órdenes-de-trabajo)
  - [Ingresos y egresos](#ingresos-y-egresos)
  - [Reportes](#reportes)
- [Adjuntos y almacenamiento](#adjuntos-y-almacenamiento)
- [Recomendaciones de seguridad](#recomendaciones-de-seguridad)
- [Mejoras futuras sugeridas](#mejoras-futuras-sugeridas)

## Tecnologías
- **Frontend**: [React 18](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Routing**: [React Router DOM v6](https://reactrouter.com/en/main)
- **Estado**: hooks (`useState`, `useEffect`, `useMemo`)
- **CSS**: estilos propios (CSS puro) con enfoque responsive
- **Backend as a Service**: [Firebase](https://firebase.google.com/)
  - Firestore (NoSQL) para datos
  - Storage para adjuntos
  - Hosting / Authentication (opcional a futuro)
- **Herramientas de desarrollo**: ESLint (config estándar de Vite + React)

## Arquitectura
```
src/
├── components/       # Layout principal y elementos compartidos
├── lib/              # Inicialización de Firebase
├── pages/            # Vistas principales (Dashboard, Clientes, etc.)
├── services/         # CRUD y helpers contra Firestore / Storage
├── assets/           # Recursos estáticos
└── main.jsx          # Punto de entrada
```
Cada módulo (p. ej. `clientes`, `presupuestos`, `ordenes`, `reportes`) vive dentro de `src/pages` y utiliza servicios específicos para acceder a Firestore.

## Características principales
- **Dashboard responsive** con métricas mensuales (ingresos, egresos, órdenes) y accesos rápidos.
- **Gestión de clientes**: múltiples vehículos por cliente, notas internas, historial de presupuestos y órdenes.
- **Presupuestos avanzados**: creación rápida de cliente, ítems con cálculo de paños de pintura, campos para aseguradora/póliza/siniestro, adjuntos con fotos, envío por WhatsApp.
- **Órdenes de trabajo**: conversión desde presupuesto (el estado pasa a aprobado), vista detallada con ingresos y egresos relacionados, balance automático.
- **Ingresos con aplicaciones múltiples**: un pago puede aplicarse a varias órdenes y se distribuye en reportes/balances.
- **Egresos (gastos + sueldos)** clasificados por tipo, opción de vincularlos a una orden.
- **Reportes**: sección dedicada con submenús (deudas, órdenes, finanzas) y filtros comunes (mes actual / últimos 12 meses).
- **Adjuntos**: soporte para subir imágenes a presupuestos (Firebase Storage).

## Modelo de datos
Las colecciones principales en Firestore:

| Colección | Campos relevantes |
|-----------|-------------------|
| `clientes` | `nombre`, `telefono`, `email`, `direccion`, `vehiculos[]`, `notas`, `trabajosActivos`, timestamps |
| `presupuestos` | `clienteId`, `clienteNombre`, `estado`, `vehiculo`, `items[]`, `subtotalManoObra`, `subtotalMateriales`, `aseguradora`, `numeroPoliza`, `numeroSiniestro`, `adjuntos[]`, timestamps |
| `ordenes` | `clienteId`, `clienteNombre`, `estado`, `vehiculo`, `presupuestoId`, `fechaInicio`, `fechaEntregaEstimada`, `totalEstimado`, `notas`, timestamps |
| `egresos` | `tipo`, `descripcion`, `monto`, `fecha`, `metodoPago`, `ordenId`, `periodo`, timestamps |
| `pagosSueldos` (opcional heredado) | *No utilizado actualmente, se unificó en `egresos`.* |
| `ingresos` | `tipo`, `descripcion`, `monto`, `fecha`, `metodoPago`, `clienteId`, `aplicaciones[]`, `saldoDisponible`, `periodo`, timestamps |
| `configuracion` | espacio reservado para ajustes futuros |

> **Adjuntos**: cada objeto contiene `url`, `storagePath`, `nombre`, `size`, `contentType`, `subidoEn`.

## Requerimientos previos
- [Node.js](https://nodejs.org/) 18+ (incluye npm)
- Cuenta de Firebase con un proyecto creado
- Firestore habilitado en modo producción o prueba
- Storage habilitado (para adjuntos de presupuestos)

## Configuración inicial
1. Clonar el repositorio.
2. Instalar dependencias:
   ```bash
   npm install
   ```
3. Crear un archivo `.env.local` en la raíz del proyecto con las credenciales de Firebase:
   ```env
   VITE_FIREBASE_API_KEY=tuApiKey
   VITE_FIREBASE_AUTH_DOMAIN=tuProyecto.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=tuProyecto
   VITE_FIREBASE_STORAGE_BUCKET=tuProyecto.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=xxxxxxxxxxxx
   VITE_FIREBASE_APP_ID=1:xxxxxxxxxxxx:web:xxxxxxxxxxxx
   ```
4. Reemplazar con los valores reales desde la consola de Firebase (`Configuración del proyecto` → `Tus apps`).

### Reglas de Firestore
Para desarrollo se usó un modo abierto. Antes de ir a producción definir reglas acorde a roles/usuarios. Ejemplo básico para permitir solo usuarios autenticados:
```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Reglas de Storage
Configurar Storage para permitir lectura pública de adjuntos o restringirlo según la estrategia de autenticación.

## Scripts disponibles
- `npm run dev`: ejecuta la app en modo desarrollo (`http://localhost:5173`).
- `npm run build`: genera el build para producción.
- `npm run preview`: sirve el build localmente.
- `npm run lint`: revisa el código con ESLint.

## Flujos de trabajo

### Clientes
- Alta con múltiples vehículos, notas internas y datos de contacto.
- Edición desde el detalle.
- Historial: se listan presupuestos y órdenes asociados, ordenados de más reciente a más antiguo.

### Presupuestos
1. Buscar un cliente existente o crear uno nuevo desde el formulario.
2. Cargar ítems: mano de obra, materiales y, si aplica, paños de pintura (cantidad x precio).
3. Adjuntar fotos (se suben a Firebase Storage).
4. Guardar → se calcula subtotal por rubro y total general.
5. Desde el detalle se puede enviar por WhatsApp y ver adjuntos.

> Al generar una orden desde este presupuesto (o vincularlo en una orden), el estado cambia automáticamente a **aprobado**.

### Órdenes de trabajo
- Creación manual o a partir de un presupuesto.
- Balance directo: gastos asociados (egresos con `ordenId`) + cobros aplicados.
- Estados disponibles: pendiente, en proceso, terminada, entregada, cancelada.

### Ingresos y egresos
- **Ingresos**: cada registro puede distribuirse entre múltiples órdenes (campo `aplicaciones`). El saldo restante se conserva para futuros repartos.
- **Egresos**: incluyen gastos generales y sueldos (tipo `sueldos`). Los sueldos se reflejan en el dashboard y reportes financieros.

### Reportes
Ubicados en `/reportes` con submenús:
- **Deudas**: aging de órdenes con saldo pendiente (0-15, 16-30, 31-60, +60 días). Acceso directo a la orden.
- **Órdenes**: métricas por estado y ciclo promedio.
- **Finanzas**: resultado mensual ingreso-egreso, balance acumulado.

Todas las vistas comparten filtros globales: *Mes actual* (seleccionable) o *Últimos 12 meses*.

## Adjuntos y almacenamiento
- Se utilizan URLs temporales (`URL.createObjectURL`) para previsualizar imágenes antes de subirlas.
- Una vez guardadas, se obtiene `downloadURL` desde Firebase Storage.
- Se guarda `storagePath` para poder eliminar el archivo cuando el usuario lo solicite.

## Recomendaciones de seguridad
- Implementar autenticación (Firebase Auth) y reglas de Firestore/Storage basadas en roles.
- Validar campos en el backend (reglas) para evitar escrituras inconsistentes.
- Habilitar HTTPS en el despliegue (Firebase Hosting ya lo hace).
- Usar Cloud Functions o extensiones si se requiere lógica del lado servidor (automatizaciones, notificaciones).

## Mejoras futuras sugeridas
- Autenticación y roles (administrador, operador).
- Exportación a CSV/PDF de reportes.
- Notificaciones automáticas (recordatorios de cobro por correo o WhatsApp API oficial).
- Control de versiones / auditoría de cambios en presupuestos y órdenes.
- Módulo de inventario o compras.
- Automatización de reglas o filtros por rango de fechas en las vistas principales.

---
Para cualquier duda o nueva funcionalidad, abrí un issue o comentá la idea para priorizarla. 🚀
