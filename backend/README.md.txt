# Backend ReNova

## Descripción

Backend desarrollado para ReNova, una plataforma de enlace de donaciones entre supermercados y ONGs.

El objetivo del sistema es permitir que supermercados publiquen productos disponibles para donar, especialmente productos próximos a vencer o de baja rotación, y que ONGs puedan consultar, reservar y coordinar el retiro de esos productos.

Este backend cubre el flujo principal del MVP:

1. Registro y login de usuarios.
2. Gestión de roles.
3. Carga de productos por supermercados.
4. Consulta de productos disponibles.
5. Reserva de productos por ONGs.
6. Confirmación, finalización y cancelación de reservas.
7. Descuento y restauración automática de stock.
8. Notificaciones automáticas.
9. Resumen para dashboard.

---

## Tecnologías y herramientas utilizadas

- Node.js
- Express
- PostgreSQL
- Supabase
- JWT
- bcrypt
- pg
- dotenv
- nodemon
- Postman

---

## Roles del sistema

Actualmente el sistema contempla los siguientes roles:

- `SUPERMARKET`
- `ONG`
- `ADMIN`

### SUPERMARKET

Puede:

- Crear productos.
- Ver reservas sobre sus productos.
- Confirmar reservas.
- Completar reservas.
- Cancelar reservas relacionadas a sus productos.
- Ver sus notificaciones.
- Ver su dashboard.

### ONG

Puede:

- Ver productos disponibles.
- Crear reservas.
- Cancelar sus reservas.
- Ver sus notificaciones.
- Marcar notificaciones como leídas.
- Ver su dashboard.

### ADMIN

Rol reservado para consultas generales o administración.

---

## Instalación

Instalar dependencias:

```bash
npm install

## Estructura del proyecto
backend/
│
├── src/
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── productController.js
│   │   ├── reservationController.js
│   │   ├── notificationController.js
│   │   └── dashboardController.js
│   │
│   ├── middlewares/
│   │   ├── authMiddleware.js
│   │   └── roleMiddleware.js
│   │
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── productRoutes.js
│   │   ├── reservationRoutes.js
│   │   ├── notificationRoutes.js
│   │   └── dashboardRoutes.js
│   │
│   └── index.js
│
├── .env
├── package.json
└── README.md