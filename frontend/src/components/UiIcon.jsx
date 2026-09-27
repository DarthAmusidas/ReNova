// Íconos de línea con el mismo trazo que los del menú lateral.
const paths = {
  package: (
    <>
      <path d="M21 8.5 12 3 3 8.5" />
      <path d="M21 8.5v7L12 21l-9-5.5v-7" />
      <path d="M12 12 3 8.5" />
      <path d="M12 12l9-3.5" />
      <path d="M12 12v9" />
    </>
  ),

  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </>
  ),

  shield: (
    <>
      <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),

  store: (
    <>
      <path d="M3 9 5 4h14l2 5" />
      <path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" />
      <path d="M5 12v8h14v-8" />
      <path d="M10 20v-5h4v5" />
    </>
  ),

  heartHand: (
    <>
      <path d="M12 12.5 8.6 9.2a2.3 2.3 0 0 1 3.4-3.1 2.3 2.3 0 0 1 3.4 3.1Z" />
      <path d="M3 15h3l3 2h4a1.5 1.5 0 0 0 0-3h-2" />
      <path d="m13 17 5.5-2.5a1.6 1.6 0 0 1 1.5 2.8L13 21H3" />
    </>
  ),

  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c.5-4.3 3.3-7 8-7s7.5 2.7 8 7" />
    </>
  ),

  heart: (
    <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
  ),
};

function UiIcon({ name, size = 24, strokeWidth = 2, className, style }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={style}
    >
      {paths[name] || paths.package}
    </svg>
  );
}

export default UiIcon;
