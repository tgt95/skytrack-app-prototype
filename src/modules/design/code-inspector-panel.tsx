import { BrainIcon, CaretDownIcon, SparkleIcon } from '@phosphor-icons/react'
import { Button } from 'skytrack-ui/button'
import { SkyTooltip } from '../../shared/sky-tooltip'
import { PythonEditor } from './python-editor'

export interface CodeInspectorPanelProps {
  codeLang: 'python' | 'json'
  codeDraft: string
  jsonDraft: string
  jsonError: string | null
  onCodeLangChange: (lang: 'python' | 'json') => void
  onCodeDraftChange: (text: string) => void
  onJsonDraftChange: (text: string) => void
  onApplyJson: () => void
  onExportJson: () => void
}

export default function CodeInspectorPanel({
  codeLang, codeDraft, jsonDraft, jsonError, onCodeLangChange,
  onCodeDraftChange, onJsonDraftChange, onApplyJson, onExportJson
}: CodeInspectorPanelProps) {
  return (
    <section className='ms-python-card' aria-label='Mission script'>
      <div className='ms-python-head'>
        <label htmlFor={codeLang === 'json' ? 'ms-json-editor' : 'ms-code-editor'}>{codeLang === 'json' ? 'Mission JSON' : 'Mission script'}</label>
        <div className='ms-python-actions'>
          <SkyTooltip><Button className='ms-python-ai' size='icon-xs' variant='ghost' disabled title='AI script assistance unavailable in this prototype' aria-label='AI script assistance unavailable in this prototype'><BrainIcon aria-hidden='true' /><SparkleIcon aria-hidden='true' /></Button></SkyTooltip>
          <div role='group' aria-label='Code language'>
            <Button size='sm' variant={codeLang === 'python' ? 'default' : 'outline'} aria-label='Show Python draft' onClick={() => onCodeLangChange('python')}>Python</Button>
            <Button size='sm' variant={codeLang === 'json' ? 'default' : 'outline'} aria-label='Show Mission JSON' onClick={() => onCodeLangChange('json')}>JSON <CaretDownIcon aria-hidden='true' /></Button>
          </div>
        </div>
      </div>
      {codeLang === 'json' ? <>
        <textarea id='ms-json-editor' className='ms-code' aria-label='Mission JSON draft' aria-describedby='ms-json-hint' aria-invalid={jsonError ? true : undefined} value={jsonDraft} onChange={(event) => onJsonDraftChange(event.target.value)} spellCheck={false} rows={18} />
        {jsonError ? <p className='ms-issue is-error' role='alert' id='ms-json-error'>{jsonError}</p> : null}
        <div className='ms-btnrow'><Button size='sm' variant='outline' onClick={onExportJson} aria-label='Refresh Mission JSON from current mission'>Refresh from mission</Button><Button size='sm' variant='default' onClick={onApplyJson} aria-label='Apply Mission JSON to visual mission'>Apply JSON</Button></div>
        <p className='ms-python-limit' id='ms-json-hint'>Mission JSON round-trips the visual mission, including generated Area/Avoid provenance. Applying valid JSON updates the visual route and can be undone. Invalid JSON leaves the mission unchanged.</p>
      </> : <><PythonEditor value={codeDraft} onChange={onCodeDraftChange} /><p className='ms-python-limit' id='ms-code-limit'>Local draft only. Python does not execute or update the visual route. Mission save does not include this draft.</p></>}
    </section>
  )
}
