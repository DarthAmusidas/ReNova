# Esquema de la base de datos (Supabase / PostgreSQL)

Relevado desde `information_schema` el 2026-09-27. Todos los `id` son `uuid` con `gen_random_uuid()`.

## users
| Columna | Tipo | Nulo | Default |
|---|---|---|---|
| id | uuid (PK) | no | gen_random_uuid() |
| name | varchar | no | |
| email | varchar (UNIQUE) | no | |
| password | varchar (hash bcrypt) | no | |
| role | varchar (`SUPERMARKET`, `ONG`, `ADMIN`) | no | |
| phone | varchar | sí | |
| address | text | sí | |
| organization_type | varchar | sí | |
| email_verified_at | timestamptz | sí | |
| created_at | timestamp | sí | CURRENT_TIMESTAMP |
| terms_accepted_at | timestamptz | sí | — requiere `prisma/terms_acceptance.sql` |
| terms_version | varchar(20) | sí | — requiere `prisma/terms_acceptance.sql` |

## products
| Columna | Tipo | Nulo | Default |
|---|---|---|---|
| id | uuid (PK) | no | gen_random_uuid() |
| supermarket_id | uuid → users.id | no | |
| name | varchar | no | |
| description | text | sí | |
| category | varchar | sí | |
| quantity | integer | no | |
| unit | varchar | sí | |
| expiration_date | date | sí | |
| low_rotation | boolean | sí | false |
| status | varchar (`AVAILABLE`, `UNAVAILABLE`; `RESERVED` es un valor viejo) | sí | 'AVAILABLE' |
| created_at | timestamp | sí | CURRENT_TIMESTAMP |

## reservations
| Columna | Tipo | Nulo | Default |
|---|---|---|---|
| id | uuid (PK) | no | gen_random_uuid() |
| product_id | uuid → products.id | no | |
| ong_id | uuid → users.id | no | |
| quantity_reserved | integer | no | |
| status | varchar (`PENDING`, `CONFIRMED`, `COMPLETED`, `CANCELLED`) | sí | 'PENDING' |
| reserved_at | timestamp | sí | CURRENT_TIMESTAMP |
| ong_completed | boolean | sí | false |
| supermarket_completed | boolean | sí | false |
| order_code | varchar (`RN-AAAA-NNNNNN`) | sí | |
| pickup_person_name | varchar | sí | |
| pickup_person_dni | varchar | sí | |
| pickup_person_phone | varchar | sí | |
| pickup_time | varchar | sí | |
| pickup_notes | text | sí | |

## notifications
| Columna | Tipo | Nulo | Default |
|---|---|---|---|
| id | uuid (PK) | no | gen_random_uuid() |
| user_id | uuid → users.id | no | |
| title | varchar | no | |
| message | text | no | |
| type | varchar (`NEW_PRODUCT`, `RESERVATION_REQUEST`, `RESERVATION_UPDATE`, `RESERVATION_CANCELLED`, `SYSTEM`) | no | |
| is_read | boolean | sí | false |
| created_at | timestamp | sí | CURRENT_TIMESTAMP |

## auth_tokens
| Columna | Tipo | Nulo | Default |
|---|---|---|---|
| id | uuid (PK) | no | gen_random_uuid() |
| user_id | uuid → users.id | no | |
| token_hash | text (sha256) | no | |
| type | varchar (`EMAIL_VERIFICATION`, `PASSWORD_RESET`) | no | |
| expires_at | timestamptz | no | |
| used_at | timestamptz | sí | |
| created_at | timestamptz | sí | now() |

## Migraciones en el repo
- `prisma/auth_email_password_recovery.sql`: `email_verified_at` y `auth_tokens`.
- `prisma/terms_acceptance.sql`: `terms_accepted_at` y `terms_version` en `users`.
- `../DATABASE_MIGRATIONS.sql`: `order_code` y datos de retiro en `reservations` (la columna `validation_code` que menciona no existe y no se usa).
