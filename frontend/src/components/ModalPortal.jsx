import { createPortal } from "react-dom";

// Monta los modales en <body> para que ningún elemento de la página
// (encabezados, menú lateral) quede por encima de la capa oscura.
function ModalPortal({ children }) {
  return createPortal(children, document.body);
}

export default ModalPortal;
