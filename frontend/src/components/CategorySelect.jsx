import { findCategoryByName } from "../utils/categories";

// Selector de categoría para los formularios de producto. Si el producto tiene
// una categoría vieja (texto libre) que no está en el catálogo, se muestra como
// opción extra para no perderla al editar.
function CategorySelect({ categories, value, onChange, style }) {
  const isLegacyValue = value && !findCategoryByName(categories, value);

  return (
    <select style={style} name="category" value={value} onChange={onChange}>
      <option value="">Elegí una categoría</option>

      {isLegacyValue && <option value={value}>{value} (categoría anterior)</option>}

      {categories.map((category) => (
        <option key={category.slug} value={category.name}>
          {category.name}
        </option>
      ))}
    </select>
  );
}

export default CategorySelect;
