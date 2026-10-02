import { useEffect, useState } from "react";
import { getProductCategories } from "../services/productService";

// Catálogo de categorías (tabla product_categories).
function useProductCategories() {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    let cancelled = false;

    getProductCategories()
      .then((data) => {
        if (!cancelled) setCategories(data?.categories || []);
      })
      .catch((error) => {
        console.error("Error cargando categorías:", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return categories;
}

export default useProductCategories;
