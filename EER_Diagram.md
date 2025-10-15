# Diagrama EER - Base de Datos Hotel MP

## Descripción General
Este documento describe el diagrama Entidad-Relación Extendida (EER) de la base de datos del sistema de gestión hotelera HOTEL-MP, desarrollado con PostgreSQL en Supabase.

## Entidades y Atributos

### 1. **roles**
Entidad que define los diferentes roles de usuario en el sistema.

| Atributo | Tipo | Restricciones | Descripción |
|----------|------|---------------|-------------|
| `id_rol` | SERIAL | PRIMARY KEY | Identificador único del rol |
| `nombre` | VARCHAR(50) | UNIQUE, NOT NULL | Nombre del rol (admin, encargado, cliente) |

### 2. **usuarios**
Entidad que representa a los usuarios del sistema.

| Atributo | Tipo | Restricciones | Descripción |
|----------|------|---------------|-------------|
| `id_usuario` | SERIAL | PRIMARY KEY | Identificador único del usuario |
| `nombre` | VARCHAR(200) | NOT NULL | Nombre completo del usuario |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | Correo electrónico del usuario |
| `password` | VARCHAR(255) | NOT NULL | Contraseña encriptada |
| `rol` | INTEGER | FOREIGN KEY → roles.id_rol | Rol del usuario |

### 3. **categorias_habitaciones**
Entidad que clasifica las habitaciones por tipo/categoría.

| Atributo | Tipo | Restricciones | Descripción |
|----------|------|---------------|-------------|
| `id_categoria` | SERIAL | PRIMARY KEY | Identificador único de la categoría |
| `nombre` | VARCHAR(200) | NOT NULL | Nombre de la categoría (Estándar, Matrimonial, etc.) |

### 4. **habitaciones**
Entidad principal que representa las habitaciones del hotel.

| Atributo | Tipo | Restricciones | Descripción |
|----------|------|---------------|-------------|
| `id_habitacion` | SERIAL | PRIMARY KEY | Identificador único de la habitación |
| `numero_habitacion` | VARCHAR(50) | - | Número de habitación |
| `tipo` | VARCHAR(100) | - | Tipo de habitación |
| `disponible` | BOOLEAN | DEFAULT TRUE | Estado de disponibilidad |
| `id_categoria` | INTEGER | FOREIGN KEY → categorias_habitaciones.id_categoria | Categoría de la habitación |
| `precio_por_hora` | NUMERIC | - | Precio por hora |
| `precio_por_dia` | NUMERIC | - | Precio por día |
| `piso` | VARCHAR(50) | - | Piso donde se encuentra |
| `capacidad` | INTEGER | - | Número máximo de personas |

### 5. **habitaciones_fotos**
Entidad que almacena las rutas de las fotos de las habitaciones.

| Atributo | Tipo | Restricciones | Descripción |
|----------|------|---------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Identificador único de la foto |
| `id_habitacion` | INTEGER | FOREIGN KEY → habitaciones.id_habitacion | Habitación a la que pertenece |
| `ruta_foto` | VARCHAR(500) | - | Ruta del archivo de imagen |

### 6. **reservas**
Entidad que registra las reservas de habitaciones.

| Atributo | Tipo | Restricciones | Descripción |
|----------|------|---------------|-------------|
| `id_reserva` | SERIAL | PRIMARY KEY | Identificador único de la reserva |
| `id_usuario` | INTEGER | FOREIGN KEY → usuarios.id_usuario | Usuario que realiza la reserva |
| `id_habitacion` | INTEGER | FOREIGN KEY → habitaciones.id_habitacion | Habitación reservada |
| `fecha_creacion` | TIMESTAMP | DEFAULT now() | Fecha de creación de la reserva |
| `fecha_checkin` | TIMESTAMP | - | Fecha y hora de entrada |
| `fecha_checkout` | TIMESTAMP | - | Fecha y hora de salida |
| `estado_reserva` | VARCHAR(50) | DEFAULT 'pendiente' | Estado (pendiente, completada, etc.) |
| `monto_total` | DECIMAL(10,2) | DEFAULT 0 | Monto total de la reserva |
| `monto_pagado` | DECIMAL(10,2) | DEFAULT 0 | Monto ya pagado |
| `monto_pendiente` | DECIMAL(10,2) | DEFAULT 0 | Monto pendiente de pago |
| `porcentaje_pagado` | DECIMAL(5,2) | DEFAULT 0 | Porcentaje pagado |
| `estado_pago` | VARCHAR(20) | DEFAULT 'pendiente' | Estado del pago |

### 7. **reclamos**
Entidad que registra los reclamos/comentarios de los clientes.

| Atributo | Tipo | Restricciones | Descripción |
|----------|------|---------------|-------------|
| `id_reclamo` | SERIAL | PRIMARY KEY | Identificador único del reclamo |
| `id_usuario` | INTEGER | FOREIGN KEY → usuarios.id_usuario | Usuario que hace el reclamo |
| `id_habitacion` | INTEGER | FOREIGN KEY → habitaciones.id_habitacion | Habitación relacionada (opcional) |
| `descripcion` | TEXT | NOT NULL | Descripción del reclamo |
| `estado` | VARCHAR(50) | DEFAULT 'pendiente' | Estado del reclamo |
| `fecha_creacion` | TIMESTAMP | DEFAULT now() | Fecha de creación |

### 8. **pagos**
Entidad que registra los pagos realizados por las reservas.

| Atributo | Tipo | Restricciones | Descripción |
|----------|------|---------------|-------------|
| `id_pago` | SERIAL | PRIMARY KEY | Identificador único del pago |
| `id_reserva` | INTEGER | FOREIGN KEY → reservas.id_reserva, ON DELETE CASCADE | Reserva asociada |
| `monto` | DECIMAL(10,2) | NOT NULL | Monto del pago |
| `metodo_pago` | VARCHAR(50) | NOT NULL | Método de pago |
| `tipo_pago` | VARCHAR(20) | NOT NULL | Tipo de pago |
| `comprobante` | TEXT | - | Comprobante del pago |
| `estado` | VARCHAR(20) | DEFAULT 'completado' | Estado del pago |
| `fecha_pago` | TIMESTAMP WITH TIME ZONE | DEFAULT CURRENT_TIMESTAMP | Fecha del pago |
| `notas` | TEXT | - | Notas adicionales |
| `created_at` | TIMESTAMP WITH TIME ZONE | DEFAULT CURRENT_TIMESTAMP | Fecha de creación |

### 9. **hotel_config**
Entidad que almacena la configuración general del hotel.

| Atributo | Tipo | Restricciones | Descripción |
|----------|------|---------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Identificador único |
| `num_pisos` | INTEGER | NOT NULL, DEFAULT 1 | Número de pisos del hotel |
| `habitaciones_por_piso` | INTEGER | NOT NULL, DEFAULT 10 | Habitaciones por piso |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Fecha de creación |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Fecha de actualización |

## Relaciones

### Relaciones Principales

1. **usuarios → roles** (N:1)
   - Un usuario tiene un rol
   - Un rol puede tener muchos usuarios
   - Cardinalidad: N:1

2. **habitaciones → categorias_habitaciones** (N:1)
   - Una habitación pertenece a una categoría
   - Una categoría puede tener muchas habitaciones
   - Cardinalidad: N:1

3. **habitaciones_fotos → habitaciones** (N:1)
   - Una foto pertenece a una habitación
   - Una habitación puede tener muchas fotos
   - Cardinalidad: N:1

4. **reservas → usuarios** (N:1)
   - Una reserva es realizada por un usuario
   - Un usuario puede tener muchas reservas
   - Cardinalidad: N:1

5. **reservas → habitaciones** (N:1)
   - Una reserva es para una habitación
   - Una habitación puede tener muchas reservas (en diferentes fechas)
   - Cardinalidad: N:1

6. **reclamos → usuarios** (N:1)
   - Un reclamo es hecho por un usuario
   - Un usuario puede tener muchos reclamos
   - Cardinalidad: N:1

7. **reclamos → habitaciones** (N:1, opcional)
   - Un reclamo puede estar relacionado con una habitación
   - Una habitación puede tener muchos reclamos
   - Cardinalidad: N:1 (opcional)

8. **pagos → reservas** (N:1)
   - Un pago pertenece a una reserva
   - Una reserva puede tener muchos pagos
   - Cardinalidad: N:1
   - ON DELETE CASCADE: Si se elimina la reserva, se eliminan sus pagos

## Diagrama Visual (Texto)

```
┌─────────────────┐       ┌─────────────────┐
│     roles       │       │    usuarios     │
├─────────────────┤       ├─────────────────┤
│ id_rol (PK)     │◄──────┤ id_usuario (PK) │
│ nombre          │ 1     │ nombre          │
└─────────────────┘       │ email           │
                          │ password        │
                          │ rol (FK)        │
                          └─────────────────┘
                                   │
                                   │ 1
                                   ▼
                          ┌─────────────────┐
                          │   categorias_   │
                          │   habitaciones  │
                          ├─────────────────┤
                          │ id_categoria(PK)│
                          │ nombre          │
                          └─────────────────┘
                                   │
                                   │ 1
                                   ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ habitaciones_   │       │  habitaciones   │       │   reservas      │
│    fotos        │       ├─────────────────┤       ├─────────────────┤
├─────────────────┤       │ id_habitacion(PK│◄──────┤ id_reserva (PK) │
│ id (PK)         │◄──────┤ numero_habitacion│       │ id_usuario (FK) │
│ id_habitacion(FK│ N     │ disponible      │       │ id_habitacion(FK│
│ ruta_foto       │       │ id_categoria(FK)│ N     │ fecha_checkin   │
└─────────────────┘       │ precio_por_dia  │       │ fecha_checkout  │
                          │ capacidad       │       │ estado_reserva  │
                          └─────────────────┘       │ monto_total     │
                                                   │ estado_pago     │
                                                   └─────────────────┘
                                                           │
                                                           │ 1
                                                           ▼
                                                  ┌─────────────────┐
                                                  │     pagos       │
                                                  ├─────────────────┤
                                                  │ id_pago (PK)    │
                                                  │ id_reserva (FK) │
                                                  │ monto           │
                                                  │ metodo_pago     │
                                                  │ fecha_pago      │
                                                  └─────────────────┘

┌─────────────────┐       ┌─────────────────┐
│    reclamos     │       │  hotel_config   │
├─────────────────┤       ├─────────────────┤
│ id_reclamo (PK) │       │ id (PK)         │
│ id_usuario (FK) │       │ num_pisos       │
│ id_habitacion(FK│       │ hab_por_piso    │
│ descripcion     │       └─────────────────┘
│ estado          │
│ fecha_creacion  │
└─────────────────┘
```

## Reglas de Negocio Importantes

1. **Disponibilidad de Habitaciones**: Una habitación solo puede estar en una reserva activa a la vez (estado_reserva ≠ 'completada')

2. **Pagos**: Los pagos se dividen en múltiples transacciones por reserva, permitiendo pagos parciales

3. **Estados**: Las reservas tienen estados que afectan la disponibilidad de habitaciones

4. **Roles**: Tres tipos de usuarios con diferentes permisos (admin, encargado, cliente)

5. **Configuración**: La tabla hotel_config permite configurar la estructura física del hotel

## Índices Recomendados

- `reservas(fecha_checkin, fecha_checkout)` - Para consultas de disponibilidad
- `reservas(id_habitacion, estado_reserva)` - Para verificar conflictos
- `usuarios(email)` - Para login rápido
- `habitaciones(disponible, id_categoria)` - Para búsquedas de habitaciones disponibles

## Triggers y Constraints

- **ON DELETE CASCADE** en pagos: Elimina pagos cuando se elimina una reserva
- **UNIQUE** en email de usuarios
- **UNIQUE** en nombre de roles
- **DEFAULT** values en timestamps y estados
- **CHECK** constraints implícitos en tipos de datos

---

*Documento generado automáticamente basado en la estructura de la base de datos HOTEL-MP*
*Fecha: Octubre 2025*