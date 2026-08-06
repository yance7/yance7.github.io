export default function ArchiveFilter({ categories, counts = {}, active = 'all', onFilter }) {
  return (
    <div className="honor-filter" role="tablist" aria-label="荣誉分类筛选">
      {categories.map((cat) => (
        <button
          key={cat.key}
          className={`filter-btn ${active === cat.key ? 'active' : ''} ${cat.key}`}
          role="tab"
          aria-selected={active === cat.key}
          onClick={() => onFilter(cat.key)}
        >
          {cat.label}
          {counts[cat.key] ? <span className="filter-count">{counts[cat.key]}</span> : null}
        </button>
      ))}
    </div>
  )
}
