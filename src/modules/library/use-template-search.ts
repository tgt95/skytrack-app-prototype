import { useEffect, useMemo, useState } from 'react'
import type { LibTemplate } from './database/store'

export function templateSearchAnnouncement(count: number, query: string): string {
  const searchTerm = query.trim()
  return `${count} result${count === 1 ? '' : 's'} for "${searchTerm}".`
}

export function useTemplateSearch(templates: LibTemplate[]) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(query), 500)
    return () => window.clearTimeout(timeout)
  }, [query])

  const filteredTemplates = useMemo(() => {
    const normalizedQuery = debouncedQuery.trim().toLowerCase()
    if (!normalizedQuery) return templates
    return templates.filter((template) =>
      template.title.toLowerCase().includes(normalizedQuery)
      || template.desc.toLowerCase().includes(normalizedQuery)
    )
  }, [debouncedQuery, templates])

  return { query, setQuery, debouncedQuery, filteredTemplates }
}
