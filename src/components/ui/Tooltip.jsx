export default function Tooltip({ content, children }) {
  return (
    <span title={content} aria-label={content}>
      {children}
    </span>
  );
}
