// Controlador de productos
const { Pool } = require("pg");
const { isValidUUID } = require("../utils/validators");

// Conexión a la base de datos PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Estados permitidos para productos
const allowedProductStatuses = [
  "AVAILABLE",
  "RESERVED",
  "UNAVAILABLE"
];

// Crea un nuevo producto publicado por un supermercado
const createProduct = async (req, res) => {
  try {
    // Extrae los datos del cuerpo de la solicitud
    const {
      name,
      description,
      category,
      quantity,
      unit,
      expiration_date,
      low_rotation
    } = req.body || {};

    // El supermercado se obtiene desde el token JWT
    const supermarket_id = req.user.id;

    // Valida campos obligatorios
    if (!name || !quantity || !unit || !expiration_date) {
      return res.status(400).json({
        error: "Nombre, cantidad, unidad y fecha de vencimiento son obligatorios"
      });
    }

    // Convierte la cantidad a número
    const parsedQuantity = Number(quantity);

    // Valida que la cantidad sea numérica y mayor a cero
    if (Number.isNaN(parsedQuantity) || parsedQuantity <= 0) {
      return res.status(400).json({
        error: "La cantidad debe ser un número mayor a 0"
      });
    }

    // Convierte y valida la fecha de vencimiento
    const expirationDate = new Date(expiration_date);

    if (Number.isNaN(expirationDate.getTime())) {
      return res.status(400).json({
        error: "La fecha de vencimiento no es válida"
      });
    }

    // No permite cargar productos vencidos
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (expirationDate < today) {
      return res.status(400).json({
        error: "No se puede cargar un producto vencido"
      });
    }

    // Inserta el producto en la base de datos
    const result = await pool.query(
      `INSERT INTO products
      (supermarket_id, name, description, category, quantity, unit, expiration_date, low_rotation, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        supermarket_id,
        name,
        description || null,
        category || null,
        parsedQuantity,
        unit,
        expiration_date,
        low_rotation || false,
        "AVAILABLE"
      ]
    );

    // Responde con el producto creado
    res.status(201).json({
      message: "Producto creado correctamente",
      product: result.rows[0]
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error al crear producto"
    });
  }
};

// Obtiene los productos según el rol del usuario autenticado
const getProducts = async (req, res) => {
  try {
    // El usuario y el rol se obtienen desde el token JWT
    const userId = req.user.id;
    const userRole = req.user.role;

    let result;

    // Si es supermercado, ve únicamente sus propios productos
    if (userRole === "SUPERMARKET") {
      result = await pool.query(
        `SELECT
             p.*,
             s.name AS supermarket_name,
             s.organization_type AS supermarket_organization_type,
             s.role AS supermarket_role
           FROM products p
           LEFT JOIN users s ON p.supermarket_id = s.id
           WHERE p.supermarket_id = $1
           ORDER BY p.expiration_date ASC NULLS LAST, p.created_at DESC`,
        [userId]
      );
    }

    // Si es ONG, ve los productos disponibles de todos los supermercados
    else if (userRole === "ONG") {
      result = await pool.query(
        `SELECT
             p.*,
             s.name AS supermarket_name,
             s.organization_type AS supermarket_organization_type,
             s.role AS supermarket_role
           FROM products p
           LEFT JOIN users s ON p.supermarket_id = s.id
           WHERE p.status = $1
           ORDER BY p.expiration_date ASC NULLS LAST, p.created_at DESC`,
        ["AVAILABLE"]
      );
    }

    // Si es ADMIN, ve todos los productos
    else if (userRole === "ADMIN") {
      result = await pool.query(
        `SELECT
             p.*,
             s.name AS supermarket_name,
             s.organization_type AS supermarket_organization_type,
             s.role AS supermarket_role
           FROM products p
           LEFT JOIN users s ON p.supermarket_id = s.id
           ORDER BY p.expiration_date ASC NULLS LAST, p.created_at DESC`
      );
    }

    // Si el rol no está autorizado
    else {
      return res.status(403).json({
        error: "No tenés permisos para ver productos"
      });
    }

    // Responde con los productos encontrados
    res.json({
      message: "Productos obtenidos correctamente",
      products: result.rows
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error al obtener productos"
    });
  }
};

// Edita un producto existente
const updateProduct = async (req, res) => {
  try {
    // Extrae el ID del producto desde la URL
    const { id } = req.params;

    // Extrae los datos enviados en el body
    const {
      name,
      description,
      category,
      quantity,
      unit,
      expiration_date,
      low_rotation,
      status
    } = req.body || {};

    // El usuario y rol se obtienen desde el token JWT
    const userId = req.user.id;
    const userRole = req.user.role;

    // Valida que el ID tenga formato UUID
    if (!isValidUUID(id)) {
      return res.status(400).json({
        error: "El id del producto debe tener un formato válido"
      });
    }

    // Busca el producto existente
    const productResult = await pool.query(
      `SELECT *
       FROM products
       WHERE id = $1`,
      [id]
    );

    const product = productResult.rows[0];

    // Valida que el producto exista
    if (!product) {
      return res.status(404).json({
        error: "Producto no encontrado"
      });
    }

    // Las ONG no pueden editar productos
    if (userRole === "ONG") {
      return res.status(403).json({
        error: "Las organizaciones no pueden editar productos"
      });
    }

    // El supermercado solo puede editar sus propios productos
    if (userRole === "SUPERMARKET" && product.supermarket_id !== userId) {
      return res.status(403).json({
        error: "No tenés permisos para editar este producto"
      });
    }

    // Valida que al menos se envíe un campo para actualizar
    const hasFieldsToUpdate =
      name !== undefined ||
      description !== undefined ||
      category !== undefined ||
      quantity !== undefined ||
      unit !== undefined ||
      expiration_date !== undefined ||
      low_rotation !== undefined ||
      status !== undefined;

    if (!hasFieldsToUpdate) {
      return res.status(400).json({
        error: "No se enviaron datos para actualizar el producto"
      });
    }

    // Valida cantidad si fue enviada
    let parsedQuantity = product.quantity;

    if (quantity !== undefined && quantity !== null && quantity !== "") {
      parsedQuantity = Number(quantity);

      if (Number.isNaN(parsedQuantity) || parsedQuantity < 0) {
        return res.status(400).json({
          error: "La cantidad debe ser un número igual o mayor a 0"
        });
      }
    }

    // Valida fecha de vencimiento si fue enviada
    let parsedExpirationDate = product.expiration_date;

    if (
      expiration_date !== undefined &&
      expiration_date !== null &&
      expiration_date !== ""
    ) {
      const expirationDate = new Date(expiration_date);

      if (Number.isNaN(expirationDate.getTime())) {
        return res.status(400).json({
          error: "La fecha de vencimiento no es válida"
        });
      }

      parsedExpirationDate = expiration_date;
    }

    // Valida estado si fue enviado
    let parsedStatus = status !== undefined ? status : product.status;

    if (status && !allowedProductStatuses.includes(status)) {
      return res.status(400).json({
        error: "Estado de producto inválido",
        allowedStatuses: allowedProductStatuses
      });
    }

    // Si no se envió estado, se calcula automáticamente según la cantidad
    if (!status && parsedQuantity === 0) {
      parsedStatus = "RESERVED";
    }

    if (!status && parsedQuantity > 0) {
      parsedStatus = "AVAILABLE";
    }

    // Actualiza el producto
    const result = await pool.query(
      `UPDATE products
       SET
        name = $1,
        description = $2,
        category = $3,
        quantity = $4,
        unit = $5,
        expiration_date = $6,
        low_rotation = $7,
        status = $8
       WHERE id = $9
       RETURNING *`,
      [
        name !== undefined ? name : product.name,
        description !== undefined ? description : product.description,
        category !== undefined ? category : product.category,
        parsedQuantity,
        unit !== undefined ? unit : product.unit,
        parsedExpirationDate,
        low_rotation !== undefined ? low_rotation : product.low_rotation,
        parsedStatus,
        id
      ]
    );

    // Responde con el producto actualizado
    res.json({
      message: "Producto actualizado correctamente",
      product: result.rows[0]
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error al actualizar producto"
    });
  }
};
// Elimina un producto existente
const deleteProduct = async (req, res) => {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    await client.query("BEGIN");
    transactionStarted = true;

    // Extrae el ID del producto desde la URL
    const { id } = req.params;

    // El usuario y rol se obtienen desde el token JWT
    const userId = req.user.id;
    const userRole = req.user.role;

    // Valida que el ID tenga formato UUID
    if (!isValidUUID(id)) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "El id del producto debe tener un formato válido"
      });
    }

    // Busca el producto existente
    const productResult = await client.query(
      `SELECT *
       FROM products
       WHERE id = $1`,
      [id]
    );

    const product = productResult.rows[0];

    // Valida que el producto exista
    if (!product) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        error: "Producto no encontrado"
      });
    }

    // Las ONG no pueden eliminar productos
    if (userRole === "ONG") {
      await client.query("ROLLBACK");
      return res.status(403).json({
        error: "Las organizaciones no pueden eliminar productos"
      });
    }

    // El supermercado solo puede eliminar sus propios productos
    if (userRole === "SUPERMARKET" && product.supermarket_id !== userId) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        error: "No tenés permisos para eliminar este producto"
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expirationDate = product.expiration_date
      ? new Date(product.expiration_date)
      : null;

    if (expirationDate) {
      expirationDate.setHours(0, 0, 0, 0);
    }

    const isExpired = expirationDate ? expirationDate < today : false;

    // Verifica las reservas vinculadas al producto
    const reservationsResult = await client.query(
      `SELECT status
       FROM reservations
       WHERE product_id = $1`,
      [id]
    );

    const reservations = reservationsResult.rows || [];

    if (reservations.some((reservation) => reservation.status === "COMPLETED")) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "No se puede eliminar un producto que ya tiene entregas completadas."
      });
    }

    if (!isExpired) {
      if (
        reservations.some(
          (reservation) =>
            reservation.status === "PENDING" || reservation.status === "CONFIRMED"
        )
      ) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: "No se puede eliminar un producto que tiene reservas activas."
        });
      }
    }

    if (reservations.length > 0) {
      await client.query(
        `DELETE FROM reservations
         WHERE product_id = $1
           AND status != 'COMPLETED'`,
        [id]
      );
    }

    // Elimina el producto
    const result = await client.query(
      `DELETE FROM products
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    await client.query("COMMIT");

    // Responde con el producto eliminado
    res.json({
      message: "Producto eliminado correctamente",
      product: result.rows[0]
    });
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK");
    }
    console.error(error);

    res.status(500).json({
      error: "Error al eliminar producto"
    });
  } finally {
    client.release();
  }
};

module.exports = {
  createProduct,
  getProducts,
  updateProduct,
  deleteProduct
};