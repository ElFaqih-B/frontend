import React from 'react'
import Icon from './Icons.jsx'
export default function SearchBar({ value, onChange, placeholder = 'Search...', className = '' }) {
  return (
    <label className={`flex min-h-[34px] min-w-0 items-center gap-2 rounded-panel border border-borderc bg-raised px-2.5 ${className}`}>
      <Icon name="search" className="h-3.5 w-3.5 shrink-0 text-faint" />
      <input className="min-w-0 flex-1 bg-transparent text-[12.5px] text-textc outline-none placeholder:text-faint" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      {value ? <button type="button" className="text-faint hover:text-textc" onClick={() => onChange('')}>×</button> : null}
    </label>
  )
}
