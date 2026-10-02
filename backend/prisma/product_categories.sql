-- Catálogo de categorías de productos.
-- Reemplaza el texto libre de products.category por una lista fija, así los
-- filtros y los reportes agrupan bien ("Lácteos", "lacteos" y "Lacteos " eran
-- tres categorías distintas). products.category se mantiene con el nombre de la
-- categoría para no romper consultas ni datos viejos.

CREATE TABLE IF NOT EXISTS product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug varchar(40) NOT NULL UNIQUE,
  name varchar(80) NOT NULL UNIQUE,
  is_perishable boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

INSERT INTO product_categories (slug, name, is_perishable, sort_order) VALUES
  ('almacen', 'Almacén', false, 10),
  ('lacteos', 'Lácteos', true, 20),
  ('frutas-verduras', 'Frutas y verduras', true, 30),
  ('panificados', 'Panificados', true, 40),
  ('carnes', 'Carnes y pescados', true, 50),
  ('congelados', 'Congelados', true, 60),
  ('conservas', 'Conservas y enlatados', false, 70),
  ('bebidas', 'Bebidas', false, 80),
  ('infantil', 'Alimentos infantiles', false, 90),
  ('higiene-limpieza', 'Higiene y limpieza', false, 100),
  ('ferreteria', 'Ferretería', false, 110),
  ('otros', 'Otros', false, 999)
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS category_id uuid
  REFERENCES product_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS products_category_id_idx ON products(category_id);

-- Vincula los productos existentes cuyo texto coincide con una categoría
-- (sin distinguir mayúsculas ni espacios). Los que no coinciden quedan con su
-- texto original y category_id NULL; se pueden reasignar editando el producto.
UPDATE products p
SET category_id = c.id,
    category = c.name
FROM product_categories c
WHERE p.category_id IS NULL
  AND lower(trim(p.category)) = lower(c.name);
