import { Fragment } from 'react'
import { ArrowLeftIcon } from '@phosphor-icons/react'
import { Button } from 'skytrack-ui/button'
import { FieldControl, FieldLabel, FieldRoot } from 'skytrack-ui/field'
import { LibraryEmptyState, LibraryPageHeader } from '../library-presentation'
import { getTemplateThumbnail } from '../template-thumbnails'
import type { LibTemplate } from '../database/store'

export default function TemplatesPage({ activeTemplate, templates, query, debouncedQuery, renderTemplate, onQueryChange, onBack, onUseTemplate, onOpenTemplate }: {
  activeTemplate: LibTemplate | null
  templates: LibTemplate[]
  query: string
  debouncedQuery: string
  renderTemplate: (template: LibTemplate, testId: string, onOpen: () => void, hideMeta?: boolean) => React.ReactNode
  onQueryChange: (query: string) => void
  onBack: () => void
  onUseTemplate: (template: LibTemplate) => void
  onOpenTemplate: (id: string) => void
}) {
  if (activeTemplate) return (
    <section aria-labelledby='ms-lib-template-title'>
      <LibraryPageHeader titleId='ms-lib-template-title' title={activeTemplate.title} description={<p className='ms-lib-sub'>{activeTemplate.byline} · full template content arrives with backend templates</p>} context={<button type='button' className='ms-lib-back' onClick={onBack}><ArrowLeftIcon aria-hidden='true' /> Mission templates</button>} actions={<Button size='sm' variant='default' onClick={() => onUseTemplate(activeTemplate)}>Use template</Button>} />
      <div className='ms-lib-detail'><span className={`ms-lib-thumb is-template large tint-${activeTemplate.id.charCodeAt(1) % 6}`} aria-hidden='true'><img src={getTemplateThumbnail(activeTemplate.id)} alt='' className='ms-template-thumbnail' /></span><div className='ms-lib-detail-body'><p className='ms-lib-desc'>{activeTemplate.desc}</p></div></div>
    </section>
  )

  return (
    <section aria-labelledby='ms-lib-templates-page-title'>
      <LibraryPageHeader titleId='ms-lib-templates-page-title' title='Mission templates' description={<p className='ms-lib-sub'>Learn SkyTrack with Mission templates</p>} footer={<div className='ms-lib-search'><FieldRoot name='template-search'><FieldLabel className='ms-sr'>Search templates</FieldLabel><FieldControl value={query} onValueChange={(value) => onQueryChange(typeof value === 'string' ? value : '')} placeholder='Search templates' aria-label='Search templates' /></FieldRoot></div>} />
      {debouncedQuery.trim() ? <p className='ms-lib-sub'>{templates.length} result{templates.length === 1 ? '' : 's'} for &ldquo;{debouncedQuery.trim()}&rdquo;</p> : null}
      {templates.length === 0 ? <LibraryEmptyState title='No templates found' description={`No templates match "${debouncedQuery.trim()}" in this mock list.`} /> :
        <div className='ms-lib-grid is-templates' aria-label='Mission templates'>{templates.map((template) => <Fragment key={template.id}>{renderTemplate(template, `ms-lib-template-${template.id}`, () => onOpenTemplate(template.id))}</Fragment>)}</div>}
    </section>
  )
}
