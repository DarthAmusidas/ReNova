import { useEffect } from "react";
import { createPortal } from "react-dom";
import { TERMS_VERSION } from "../utils/terms";

const generalSections = [
  {
    title: "1. Objeto",
    body: [
      "ReNova es una plataforma que conecta comercios que tienen alimentos y productos aptos para consumo o uso, próximos a vencer o con excedente, con organizaciones sociales que pueden aprovecharlos. ReNova actúa únicamente como intermediario tecnológico y no compra, vende, almacena ni transporta productos.",
    ],
  },
  {
    title: "2. Cuenta y datos de registro",
    body: [
      "Te comprometés a brindar información veraz, completa y actualizada sobre tu organización, y a mantener la confidencialidad de tu contraseña. Sos responsable de toda actividad realizada desde tu cuenta.",
      "ReNova puede suspender o dar de baja cuentas con datos falsos, uso indebido o incumplimiento de estos términos.",
    ],
  },
  {
    title: "3. Gratuidad y prohibición de reventa",
    body: [
      "Las donaciones gestionadas a través de ReNova son gratuitas. Está prohibido cobrar, revender o comercializar los productos obtenidos mediante la plataforma.",
    ],
  },
  {
    title: "4. Datos personales",
    body: [
      "Los datos que cargás se usan para operar la plataforma: gestionar publicaciones y reservas, enviar notificaciones y generar reportes de impacto. No se venden a terceros. Podés solicitar el acceso, la rectificación o la eliminación de tus datos en cualquier momento, conforme a la Ley 25.326 de Protección de Datos Personales.",
    ],
  },
  {
    title: "5. Responsabilidad",
    body: [
      "ReNova no garantiza la disponibilidad permanente del servicio ni la calidad de los productos publicados, que es responsabilidad de quien los dona. Cada organización es responsable del cumplimiento de la normativa bromatológica y sanitaria que le corresponda.",
    ],
  },
  {
    title: "6. Modificaciones",
    body: [
      "Estos términos pueden actualizarse. Si hay cambios relevantes te lo vamos a informar y podremos pedirte que los aceptes nuevamente para seguir usando la plataforma.",
    ],
  },
];

const audienceSections = {
  SUPERMARKET: {
    label: "Comercios donantes",
    sections: [
      {
        title: "7. Obligaciones del comercio donante",
        list: true,
        body: [
          "Publicar únicamente productos aptos para consumo o uso, en buen estado de conservación y dentro de su fecha de vencimiento al momento de la entrega.",
          "Informar con exactitud el producto, la cantidad, la unidad de medida y la fecha de vencimiento.",
          "Respetar la cadena de frío y las condiciones de almacenamiento exigidas para cada producto hasta su retiro.",
          "Mantener actualizado el estado de las publicaciones y confirmar o cancelar las reservas en tiempo razonable.",
          "Validar la entrega con el código de reserva y los datos de la persona que retira.",
        ],
      },
    ],
  },
  ONG: {
    label: "Organizaciones sociales",
    sections: [
      {
        title: "7. Obligaciones de la organización receptora",
        list: true,
        body: [
          "Reservar solo los productos que la organización pueda retirar y utilizar, evitando reservas que luego no se concreten.",
          "Retirar las donaciones en el horario acordado, con una persona identificada y el código de reserva correspondiente.",
          "Transportar y conservar los productos en condiciones adecuadas, respetando la cadena de frío cuando corresponda.",
          "Destinar los productos exclusivamente a los fines sociales de la organización, sin comercializarlos.",
          "Revisar los productos al momento del retiro y rechazar los que no se encuentren en condiciones.",
        ],
      },
    ],
  },
};

function TermsModal({ open, audience, onClose, onAccept }) {
  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const specific = audienceSections[audience];
  const sections = specific
    ? [...generalSections, ...specific.sections]
    : generalSections;

  return createPortal(
    <div className="auth-terms-overlay" onClick={onClose}>
      <div
        className="auth-terms-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-terms-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="auth-terms-header">
          <div>
            <h3 id="auth-terms-title">Términos y condiciones</h3>
            <p>
              {specific ? specific.label : "Condiciones generales"} · Versión{" "}
              {TERMS_VERSION}
            </p>
          </div>

          <button
            type="button"
            className="auth-terms-close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ×
          </button>
        </header>

        <div className="auth-terms-body">
          {sections.map((section) => (
            <section key={section.title}>
              <h4>{section.title}</h4>

              {section.list ? (
                <ul>
                  {section.body.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))
              )}
            </section>
          ))}
        </div>

        <footer className="auth-terms-footer">
          <button
            type="button"
            className="auth-terms-secondary"
            onClick={onClose}
          >
            Cerrar
          </button>

          <button
            type="button"
            className="btn-login-modern auth-terms-accept"
            onClick={onAccept}
          >
            Acepto los términos
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}

export default TermsModal;
