export default function StatusBadge({ status = 'active', label = '', children }) {
  return (
    <span className={`status-badge ${status}`}>
      <i className="status-dot" aria-hidden="true"></i>
      {label ? <span>{label}</span> : children}
    </span>
  )
}
