import React from 'react'
export default function EmptyState({ title = 'Kosong', desc = 'Belum ada data.' }) {
  return <div className="px-4 py-8 text-center"><div className="font-semibold text-textc">{title}</div><div className="mt-1 text-sm text-faint">{desc}</div></div>
}
