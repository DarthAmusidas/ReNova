import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getProducts, deleteProduct } from "../services/productService";
import { createReservation } from "../services/reservationService";
import AppSidebar from "../components/AppSidebar";
import HeaderUserCard from "../components/HeaderUserCard";
import NotificationBell from "../components/NotificationBell";
import { pageStyles as styles } from "../styles/pageStyles";

const PRODUCTS_PER_PAGE = 4;

function Products() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productToDelete, setProductToDelete] = useState(null);
  const [reservationQuantity, setReservationQuantity] = useState(1);
  const [pickupPersonName, setPickupPersonName] = useState("");
  const [pickupPersonDni, setPickupPersonDni] = useState("");
  const [pickupPersonPhone, setPickupPersonPhone] = useState("");
  const [pickupNotes, setPickupNotes] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [error, setError] = useState("");
  const [reservationError, setReservationError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("AVAILABLE");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentProductPage, setCurrentProductPage] = useState(1);
  const [expirationSort, setExpirationSort] = useState("ASC");

  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;

  const userName = user?.name || "Usuario";
  const userRole = user?.role || "";

  const isSupermarket = userRole === "SUPERMARKET";
  const isOng = userRole === "ONG";
  const isAdmin = userRole === "ADMIN";

  const userRoleLabel = isSupermarket
    ? "Supermercado"
    : isAdmin
    ? "Administrador"
    : "Comedor";

  const getUserInitials = (name = "Usuario") =>
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();

  const getMaxReservableQuantity = (stock) => {
    const availableStock = Number(stock || 0);

    if (availableStock <= 0) return 0;
    if (availableStock <= 10) return availableStock;

    return Math.ceil(availableStock * 0.5);
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getProducts();

      const productList = Array.isArray(data)
        ? data
        : data.products || data.data || [];

      setProducts(productList);
    } catch (err) {
      console.error("Error cargando productos:", err);
      setError("No se pudieron cargar los productos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    setCurrentProductPage(1);
  }, [selectedFilter, searchTerm, expirationSort]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("es-AR");
  };

  const getDaysUntilExpiry = (expirationDate) => {
    if (!expirationDate) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expDate = new Date(expirationDate);
    expDate.setHours(0, 0, 0, 0);

    return Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
  };

  const formatRemainingDays = (expirationDate) => {
    const days = getDaysUntilExpiry(expirationDate);

    if (days === null) return "-";
    if (days < 0) return "Vencido";
    if (days === 0) return "Hoy";
    if (days === 1) return "1 día";
    if (days < 365) return `${days} días`;

    const years = Math.floor(days / 365);
    return years === 1 ? "1 año" : `${years} años`;
  };

  const isProductExpired = (expirationDate) => {
    const days = getDaysUntilExpiry(expirationDate);
    return days !== null && days < 0;
  };

  const isProductSoonToExpire = (expirationDate) => {
    const days = getDaysUntilExpiry(expirationDate);
    return days !== null && days > 0 && days <= 7;
  };

  const getProductStatusLabel = (status) => {
    if (status === "AVAILABLE") return "Disponible";
    if (status === "UNAVAILABLE") return "No disponible";
    return status || "Disponible";
  };

  const getPublisherName = (product) => {
    const possibleNames = [
      product.supermarket_name,
      product.supermarket?.name,
      product.organization_name,
      product.organization?.name,
      product.provider_name,
      product.provider?.name,
      product.supplier_name,
      product.supplier?.name,
      product.company_name,
      product.business_name,
      product.user_name,
      product.created_by_name,
      product.owner_name,
      product.publisher_name,
    ].filter(Boolean);

    return possibleNames[0] || "Proveedor no informado";
  };

  const getPublisherDisplay = (product) => {
    const name = product.supermarket_name;
    const type = product.supermarket_organization_type || product.supermarket_role;

    if (!name && !type) return null;

    const displayName = name || "No informado";

    return type ? `${displayName} (${type})` : displayName;
  };

  const getPublisherInitials = (product) => {
    const name = getPublisherName(product);

    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  };

  const getSearchableProductText = (product, normalizedSearch) => {
    if (!normalizedSearch) return true;

    const directValues = Object.values(product || {})
      .filter((value) => {
        const valueType = typeof value;
        return (
          value !== null &&
          value !== undefined &&
          (valueType === "string" ||
            valueType === "number" ||
            valueType === "boolean")
        );
      })
      .join(" ");

    const explicitValues = [
      product.name,
      product.description,
      product.category,
      product.unit,
      product.status,
      product.supermarket_name,
      product.supermarket_organization_type,
      product.supermarket_role,
      product.organization_name,
      product.provider_name,
      product.supplier_name,
      product.company_name,
      product.business_name,
      product.user_name,
      product.created_by_name,
      product.owner_name,
      product.publisher_name,
      product.supermarket?.name,
      product.supermarket?.organization_type,
      product.organization?.name,
      product.provider?.name,
      product.supplier?.name,
      getPublisherName(product),
      getPublisherDisplay(product),
      directValues,
    ];

    return explicitValues
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(normalizedSearch);
  };
  const handleOpenReservation = (product) => {
    if (isProductExpired(product.expiration_date)) {
      setError("No se puede reservar un producto vencido.");
      return;
    }

    setSelectedProduct(product);
    setReservationQuantity(1);
    setPickupPersonName("");
    setPickupPersonDni("");
    setPickupPersonPhone("");
    setPickupNotes("");
    setPickupTime("");
    setReservationError("");
    setError("");
    setSuccess("");
  };

  const handleReserve = async () => {
    if (!selectedProduct) return;

    const quantity = Number(reservationQuantity);

    if (!pickupPersonName.trim()) {
      setReservationError("Ingresá el nombre de la persona que retira.");
      return;
    }

    if (!pickupPersonDni.trim()) {
      setReservationError("Ingresá el DNI de la persona que retira.");
      return;
    }

    if (!quantity || quantity <= 0) {
      setReservationError("Ingresá una cantidad válida.");
      return;
    }

    const maxReservable = getMaxReservableQuantity(selectedProduct.quantity);

    if (quantity > maxReservable) {
      setReservationError("La cantidad solicitada supera el stock disponible.");
      return;
    }

    try {
      setReservationError("");
      setError("");
      setSuccess("");

      await createReservation({
        product_id: selectedProduct.id,
        quantity_reserved: quantity,
        pickup_person_name: pickupPersonName.trim(),
        pickup_person_dni: pickupPersonDni.trim(),
        pickup_person_phone: pickupPersonPhone.trim(),
        pickup_notes: pickupNotes.trim(),
        pickup_time: pickupTime.trim(),
      });

      setSuccess("Reserva creada correctamente.");
      setReservationError("");
      setSelectedProduct(null);
      await loadProducts();
    } catch (err) {
      console.error("Error creando reserva:", err);
      setReservationError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "No se pudo crear la reserva."
      );
    }
  };

  const handleDelete = async () => {
    if (!productToDelete) return;

    try {
      setError("");
      setSuccess("");
      await deleteProduct(productToDelete.id);
      setProductToDelete(null);
      setSuccess("Producto eliminado correctamente.");
      await loadProducts();
    } catch (err) {
      console.error("Error eliminando producto:", err);
      setProductToDelete(null);
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "No se pudo eliminar el producto."
      );
    }
  };

  const getProductCounts = () => {
    const counts = {
      ALL: products.length,
      AVAILABLE: 0,
      UNAVAILABLE: 0,
      LOW_ROTATION: 0,
      SOON_TO_EXPIRE: 0,
      EXPIRED: 0,
    };

    products.forEach((product) => {
      const status = product.status || "AVAILABLE";
      const isAvailable = status === "AVAILABLE";
      const isExpired = isProductExpired(product.expiration_date);

      if (isAvailable && !isExpired) counts.AVAILABLE++;
      if (!isAvailable && !isExpired) counts.UNAVAILABLE++;
      if (product.low_rotation === true && !isExpired) counts.LOW_ROTATION++;
      if (isProductSoonToExpire(product.expiration_date)) counts.SOON_TO_EXPIRE++;
      if (isExpired) counts.EXPIRED++;
    });

    return counts;
  };

  const productCounts = getProductCounts();

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return products
      .filter((product) => {
        const status = product.status || "AVAILABLE";
        const isAvailable = status === "AVAILABLE";
        const isExpired = isProductExpired(product.expiration_date);

        if (selectedFilter === "AVAILABLE") return isAvailable && !isExpired;
        if (selectedFilter === "UNAVAILABLE") return !isAvailable && !isExpired;
        if (selectedFilter === "LOW_ROTATION") {
          return product.low_rotation === true && !isExpired;
        }
        if (selectedFilter === "SOON_TO_EXPIRE") {
          return isProductSoonToExpire(product.expiration_date);
        }
        if (selectedFilter === "EXPIRED") return isExpired;

        return true;
      })
      .filter((product) => getSearchableProductText(product, normalizedSearch))
      .sort((a, b) => {
        const dateA = a.expiration_date
          ? new Date(a.expiration_date).getTime()
          : Number.MAX_SAFE_INTEGER;
        const dateB = b.expiration_date
          ? new Date(b.expiration_date).getTime()
          : Number.MAX_SAFE_INTEGER;

        const diff = dateA - dateB;
        return expirationSort === "DESC" ? -diff : diff;
      });
  }, [products, selectedFilter, searchTerm, expirationSort]);

  const totalProductPages = Math.max(
    1,
    Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE)
  );
  const safeCurrentProductPage = Math.min(
    currentProductPage,
    totalProductPages
  );
  const productStartIndex =
    (safeCurrentProductPage - 1) * PRODUCTS_PER_PAGE;
  const productEndIndex = productStartIndex + PRODUCTS_PER_PAGE;
  const paginatedProducts = filteredProducts.slice(
    productStartIndex,
    productEndIndex
  );

  const getPageTitle = () => {
    if (isAdmin) return "Productos registrados";
    if (isSupermarket) return "Mis productos publicados";
    return "Productos disponibles";
  };

  const getPageSubtitle = () => {
    if (isAdmin) {
      return "Consultá los productos registrados en la plataforma.";
    }

    if (isSupermarket) {
      return "Administrá los productos disponibles para donar y revisá su estado.";
    }

    return "Consultá productos disponibles y realizá reservas para tu organización.";
  };

  const filters = [
    { key: "ALL", label: "Todas", count: productCounts.ALL },
    { key: "AVAILABLE", label: "Disponibles", count: productCounts.AVAILABLE },
    {
      key: "LOW_ROTATION",
      label: "Baja rotación",
      count: productCounts.LOW_ROTATION,
      title: "Productos con poco movimiento de venta",
    },
    {
      key: "SOON_TO_EXPIRE",
      label: "Próx. a vencer",
      count: productCounts.SOON_TO_EXPIRE,
      title: "Productos que vencen en los próximos 7 días",
    },
    {
      key: "EXPIRED",
      label: "Vencidos",
      count: productCounts.EXPIRED,
      title: "Productos cuyo vencimiento ya pasó",
    },
  ];

  const kpis = [
    {
      label: "Productos",
      value: productCounts.ALL,
      helper: "Total publicados",
      tone: "green",
    },
    {
      label: "Disponibles",
      value: productCounts.AVAILABLE,
      helper: "Listos para reservar",
      tone: "green",
    },
    {
      label: "Baja rotación",
      value: productCounts.LOW_ROTATION,
      helper: "Prioridad de donación",
      tone: "warning",
    },
    {
      label: "Próx. a vencer",
      value: productCounts.SOON_TO_EXPIRE,
      helper: "En los próximos 7 días",
      tone: "orange",
    },
    {
      label: "Vencidos",
      value: productCounts.EXPIRED,
      helper: "No disponibles",
      tone: "danger",
    },
  ];

  return (
    <div className="renova-app-shell">
      <AppSidebar
        active="products"
        user={user}
        isAdmin={isAdmin}
        navigate={navigate}
        onLogout={handleLogout}
      />

      <main className="renova-products-main">
        <header className="renova-products-header">
          <div>

            <span className="renova-section-badge">
              {isAdmin ? "Administración de productos" : "Gestión de productos"}
            </span>

            <h1>
              {getPageTitle().replace("disponibles", "")}
              {getPageTitle().includes("disponibles") && (
                <span>disponibles</span>
              )}
            </h1>

            <p>{getPageSubtitle()}</p>
          </div>
          <div className="renova-header-actions">
            <HeaderUserCard user={user} />
            <NotificationBell />
          </div>
        </header>

        {isAdmin && (
          <div className="renova-admin-note">
            El administrador puede consultar productos, pero no modifica ni
            realiza reservas desde esta vista.
          </div>
        )}

        {error && <div style={styles.errorBox}>{error}</div>}
        {success && <div style={styles.successBox}>{success}</div>}

        <section className="renova-products-kpis">
          {kpis.map((kpi) => (
            <article key={kpi.label} className={`renova-kpi-card ${kpi.tone}`}>
              <div className="renova-kpi-icon" />
              <div>
                <strong>{kpi.value}</strong>
                <span>{kpi.label}</span>
                <p>{kpi.helper}</p>
              </div>
            </article>
          ))}
        </section>

        <section className="renova-products-toolbar">
          <div className="renova-products-toolbar-left">
            <div className="renova-filter-row renova-filter-pills">
              {filters.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  className={
                    selectedFilter === filter.key
                      ? "renova-filter-pill renova-filter-pill-active"
                      : "renova-filter-pill"
                  }
                  onClick={() => setSelectedFilter(filter.key)}
                  title={filter.title}
                >
                  {filter.label}
                  <span>{filter.count}</span>
                </button>
              ))}
            </div>

            <p className="renova-products-result-count">
              {filteredProducts.length} productos · ordenados por fecha de vencimiento
            </p>
          </div>

          <label className="renova-sort-control">
            <span>Ordenar</span>

            <select
              value={expirationSort}
              onChange={(e) => setExpirationSort(e.target.value)}
            >
              <option value="ASC">Vence antes</option>
              <option value="DESC">Vence después</option>
            </select>
          </label>

          <label className="renova-search-box renova-search-box-inline">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>

            <input
              type="search"
              placeholder="Buscar producto o proveedor"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </label>

          {isSupermarket && (
            <button
              type="button"
              className="renova-publish-button"
              onClick={() => navigate("/products/create")}
            >
              + Publicar producto
            </button>
          )}
        </section>

        
        {filteredProducts.length > PRODUCTS_PER_PAGE && (
          <nav
            className="renova-products-pagination renova-products-pagination-top"
            aria-label="Paginación de productos"
          >
            <button
              type="button"
              className="renova-pagination-control"
              disabled={safeCurrentProductPage === 1}
              onClick={() =>
                setCurrentProductPage(Math.max(1, safeCurrentProductPage - 1))
              }
            >
              Anterior
            </button>

            <div className="renova-pagination-numbers">
              {Array.from(
                { length: totalProductPages },
                (_, index) => index + 1
              ).map((page) => (
                <button
                  key={page}
                  type="button"
                  className={
                    page === safeCurrentProductPage
                      ? "renova-pagination-page renova-pagination-page-active"
                      : "renova-pagination-page"
                  }
                  onClick={() => setCurrentProductPage(page)}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="renova-pagination-control"
              disabled={safeCurrentProductPage === totalProductPages}
              onClick={() =>
                setCurrentProductPage(
                  Math.min(totalProductPages, safeCurrentProductPage + 1)
                )
              }
            >
              Siguiente
            </button>
          </nav>
        )}

        {loading ? (
          <section className="renova-empty-state">
            <h2>Cargando productos...</h2>
            <p>Estamos consultando la información disponible.</p>
          </section>
        ) : filteredProducts.length === 0 ? (
          <section className="renova-empty-state">
            <h2>No hay productos para mostrar</h2>
            <p>
              {selectedFilter !== "ALL"
                ? "No encontramos productos para el filtro seleccionado."
                : isSupermarket
                ? "Todavía no cargaste productos disponibles para donar."
                : "Por el momento no hay productos disponibles para visualizar."}
            </p>
          </section>
        ) : (
          <section className="renova-products-grid">
            {paginatedProducts.map((product) => {
              const isAvailable =
                !product.status || product.status === "AVAILABLE";
              const isExpired = isProductExpired(product.expiration_date);
              const publisher = getPublisherDisplay(product) || getPublisherName(product);

              return (
                <article
                  key={product.id}
                  className={
                    isExpired
                      ? "renova-product-card renova-product-card-expired"
                      : "renova-product-card"
                  }
                >
                  <div className="renova-product-card-top">
                    <div>
                      <h2>{product.name}</h2>
                      <p>{product.category || "Sin categoría"}</p>
                    </div>

                    <div className="renova-product-quantity">
                      <strong>{product.quantity}</strong>
                      <span>{product.unit || "unidades"}</span>
                    </div>
                  </div>

                  <div className="renova-product-status-row">
                    {isExpired ? (
                      <span className="renova-status-pill danger">
                        Vencido
                      </span>
                    ) : (
                      <>
                        <span
                          className={
                            isAvailable
                              ? "renova-status-pill available"
                              : "renova-status-pill muted"
                          }
                        >
                          {getProductStatusLabel(product.status || "AVAILABLE")}
                        </span>

                        {product.low_rotation && (
                          <span className="renova-status-pill warning">
                            Baja rotación
                          </span>
                        )}

                        {isProductSoonToExpire(product.expiration_date) && (
                          <span className="renova-status-pill orange">
                            Próx. a vencer
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  <div className="renova-product-date-row">
                    <div>
                      <span>Vencimiento</span>
                      <strong>{formatDate(product.expiration_date)}</strong>
                    </div>

                    <div>
                      <span>Restan</span>
                      <strong>{formatRemainingDays(product.expiration_date)}</strong>
                    </div>
                  </div>

                  <div className="renova-product-meta-list">
                    <span>Cantidad: {product.quantity} {product.unit || "unidades"}</span>
                    <span>Categoría: {product.category || "-"}</span>
                    <span>Baja rotación: {product.low_rotation ? "Sí" : "No"}</span>
                  </div>

                  <div className="renova-product-publisher">
                    <div>{getPublisherInitials(product)}</div>
                    <span>{publisher}</span>
                  </div>

                  <div className="renova-product-actions">
                    {isAdmin && (
                      <button type="button" className="renova-disabled-button" disabled>
                        Solo consulta
                      </button>
                    )}

                    {isSupermarket && (
                      <>
                        <button
                          type="button"
                          className="renova-outline-button"
                          onClick={() => navigate(`/products/${product.id}/edit`)}
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          className="renova-danger-button"
                          onClick={() => {
                            setError("");
                            setSuccess("");
                            setProductToDelete(product);
                          }}
                        >
                          Eliminar
                        </button>
                      </>
                    )}

                    {isOng && isExpired && (
                      <button
                        type="button"
                        className="renova-disabled-button"
                        disabled
                        title="Este producto está vencido y no puede reservarse."
                      >
                        No disponible
                      </button>
                    )}

                    {isOng && !isExpired && isAvailable && Number(product.quantity) > 0 && (
                      <button
                        type="button"
                        className="renova-reserve-button"
                        onClick={() => handleOpenReservation(product)}
                      >
                        Reservar
                      </button>
                    )}

                    {isOng && !isExpired && (!isAvailable || Number(product.quantity) <= 0) && (
                      <button type="button" className="renova-disabled-button" disabled>
                        No disponible
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        )}

        {selectedProduct && (
          <div style={styles.modalOverlay}>
            <div style={styles.modalCard}>
              <h2 style={styles.modalTitle}>Reservar producto</h2>

              <p style={styles.modalText}>
                Vas a reservar <strong>{selectedProduct.name}</strong>. Stock
                disponible:{" "}
                <strong>
                  {selectedProduct.quantity} {selectedProduct.unit || "unidades"}
                </strong>
                .
              </p>

              {reservationError && (
                <div className="renova-modal-error">{reservationError}</div>
              )}

              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Cantidad a reservar</label>
                <input
                  style={styles.input}
                  type="number"
                  min="1"
                  max={getMaxReservableQuantity(selectedProduct.quantity)}
                  value={reservationQuantity}
                  onChange={(e) => {
                    setReservationQuantity(e.target.value);
                    setReservationError("");
                  }}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Nombre de la persona que retira</label>
                <input
                  style={styles.input}
                  type="text"
                  value={pickupPersonName}
                  onChange={(e) => {
                    setPickupPersonName(e.target.value);
                    setReservationError("");
                  }}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>DNI de la persona que retira</label>
                <input
                  style={styles.input}
                  type="text"
                  value={pickupPersonDni}
                  onChange={(e) => {
                    setPickupPersonDni(e.target.value);
                    setReservationError("");
                  }}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Teléfono de la persona que retira (opcional)</label>
                <input
                  style={styles.input}
                  type="text"
                  value={pickupPersonPhone}
                  onChange={(e) => {
                    setPickupPersonPhone(e.target.value);
                    setReservationError("");
                  }}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Horario estimado de retiro (opcional)</label>
                <input
                  style={styles.input}
                  type="text"
                  placeholder="Ej: Entre las 10:00 y las 13:00"
                  value={pickupTime}
                  onChange={(e) => {
                    setPickupTime(e.target.value);
                    setReservationError("");
                  }}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Notas de retiro (opcional)</label>
                <textarea
                  style={{
                    ...styles.input,
                    minHeight: "110px",
                    padding: "14px 16px",
                    resize: "vertical",
                  }}
                  value={pickupNotes}
                  onChange={(e) => {
                    setPickupNotes(e.target.value);
                    setReservationError("");
                  }}
                />
              </div>

              <div style={styles.modalActions}>
                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={() => {
                    setReservationError("");
                    setSelectedProduct(null);
                  }}
                >
                  Cancelar
                </button>

                <button type="button" style={styles.primaryButton} onClick={handleReserve}>
                  Confirmar reserva
                </button>
              </div>
            </div>
          </div>
        )}

        {productToDelete && (
          <div style={styles.modalOverlay}>
            <div style={styles.modalCard}>
              <h2 style={styles.modalTitle}>Eliminar producto</h2>

              <p style={styles.modalText}>
                ¿Seguro que querés eliminar{" "}
                <strong>{productToDelete.name}</strong>? Esta acción no se puede
                deshacer.
              </p>

              <div style={styles.modalActions}>
                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={() => setProductToDelete(null)}
                >
                  Cancelar
                </button>

                <button type="button" style={styles.dangerButton} onClick={handleDelete}>
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Products;







