import React from 'react'

export default function SearchBar({
  value,
  onChange,
  placeholder = 'Search',
  className = '',
  right = null,
}) {
  const id = React.useId()

  return (
    <div className={`search-shell ${className}`}>
      <label className="search-icon" htmlFor={id}>Search</label>
      <input
        id={id}
        className="search-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {value ? (
        <button type="button" className="search-clear" onClick={() => onChange('')}>
          Clear
        </button>
      ) : null}
      {right ? <div className="search-right">{right}</div> : null}
    </div>
  )
}
