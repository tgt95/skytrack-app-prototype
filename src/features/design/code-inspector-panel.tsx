import { PackageIcon } from '@phosphor-icons/react'
import { Button } from 'skytrack-ui/button'
import {
  Select,
  SelectIcon,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectList,
  SelectPopup,
  SelectPortal,
  SelectPositioner,
  SelectTrigger,
  SelectValue
} from 'skytrack-ui/select'
import {
  Tooltip,
  TooltipArrow,
  TooltipPopup,
  TooltipPortal,
  TooltipPositioner,
  TooltipProvider,
  TooltipTrigger
} from 'skytrack-ui/tooltip'
import { SkyTooltip } from '../../ui/components/sky-tooltip'
import { PythonEditor } from './python-editor'

export interface CodeInspectorPanelProps {
  codeLang: 'python' | 'json'
  codeDraft: string
  jsonDraft: string
  jsonError: string | null
  aiModelsOpen: boolean
  onCodeLangChange: (lang: 'python' | 'json') => void
  onAIModelsOpenChange: (open: boolean) => void
  onCodeDraftChange: (text: string) => void
  onJsonDraftChange: (text: string) => void
  onApplyJson: () => void
  onExportJson: () => void
}

export default function CodeInspectorPanel ({
  codeLang,
  codeDraft,
  jsonDraft,
  jsonError,
  aiModelsOpen,
  onCodeLangChange,
  onAIModelsOpenChange,
  onCodeDraftChange,
  onJsonDraftChange,
  onApplyJson,
  onExportJson
}: CodeInspectorPanelProps) {
  return (
    <section
      className='ms-code-inspector flex flex-[1_1_auto] min-h-0 h-full min-w-0 flex-col overflow-hidden bg-(--card)'
      aria-label='Mission script'
    >
      <div
        className='flex flex-row justify-between items-center gap-3 p-3 border-b border-border'
        data-testid='ms-python-head'
      >
        <label
          htmlFor={codeLang === 'json' ? 'ms-json-editor' : 'ms-code-editor'}
          className='h6'
        >
          {codeLang === 'json' ? 'Mission JSON' : 'Mission script'}
        </label>
        <div
          className='flex items-center gap-2'
          role='group'
          aria-label='Mission script actions'
        >
          <SkyTooltip>
            <Button
              size='icon'
              variant='ghost'
              aria-label={aiModelsOpen ? 'Close AI models' : 'Open AI models'}
              title={aiModelsOpen ? 'Close AI models' : 'Open AI models'}
              aria-pressed={aiModelsOpen}
              onClick={() => onAIModelsOpenChange(!aiModelsOpen)}
            >
              <PackageIcon aria-hidden='true' className='size-5' />
            </Button>
          </SkyTooltip>
          <Select<'python' | 'json'>
            items={[
              { value: 'python', label: 'Python' },
              { value: 'json', label: 'JSON' }
            ]}
            value={codeLang}
            onValueChange={(next: unknown) => {
              if (next === 'python') onCodeLangChange(next)
            }}
          >
            <SelectTrigger aria-label='Code language' className='w-32'>
              <SelectValue />
              <SelectIcon />
            </SelectTrigger>
            <SelectPortal>
              <SelectPositioner side='bottom' align='end' sideOffset={4}>
                <SelectPopup>
                  <SelectList>
                    <SelectItem value='python'>
                      <SelectItemIndicator />
                      <SelectItemText>Python</SelectItemText>
                    </SelectItem>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <SelectItem
                              value='json'
                              disabled
                              className='data-[disabled]:pointer-events-auto cursor-help'
                            />
                          }
                        >
                          <SelectItemIndicator />
                          <SelectItemText>JSON</SelectItemText>
                        </TooltipTrigger>
                        <TooltipPortal>
                          <TooltipPositioner side='right' sideOffset={6}>
                            <TooltipPopup>
                              <TooltipArrow />
                              Coming soon
                            </TooltipPopup>
                          </TooltipPositioner>
                        </TooltipPortal>
                      </Tooltip>
                    </TooltipProvider>
                  </SelectList>
                </SelectPopup>
              </SelectPositioner>
            </SelectPortal>
          </Select>
        </div>
      </div>
      <div className='flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden'>
        {codeLang === 'json' ? (
          <>
            <textarea
              id='ms-json-editor'
              className='w-full box-border font-[ui-monospace,SFMono-Regular,Menlo,monospace] text-xs leading-[1.5] text-(--foreground) bg-(--card) border border-border rounded-(--radius) p-2 resize-y outline-none'
              aria-label='Mission JSON draft'
              aria-describedby='ms-json-hint'
              aria-invalid={jsonError ? true : undefined}
              value={jsonDraft}
              onChange={event => onJsonDraftChange(event.target.value)}
              spellCheck={false}
              rows={18}
            />
            {jsonError ? (
              <p className='ms-issue is-error' role='alert' id='ms-json-error'>
                {jsonError}
              </p>
            ) : null}
            <div className='ms-btnrow'>
              <Button
                size='sm'
                variant='outline'
                onClick={onExportJson}
                aria-label='Refresh Mission JSON from current mission'
              >
                Refresh from mission
              </Button>
              <Button
                size='sm'
                variant='default'
                onClick={onApplyJson}
                aria-label='Apply Mission JSON to visual mission'
              >
                Apply JSON
              </Button>
            </div>
            <p className='ms-python-limit' id='ms-json-hint'>
              Mission JSON round-trips the visual mission, including generated
              Area/Avoid provenance. Applying valid JSON updates the visual
              route and can be undone. Invalid JSON leaves the mission
              unchanged.
            </p>
          </>
        ) : (
          <>
            <PythonEditor value={codeDraft} onChange={onCodeDraftChange} />
            {/* <p className="ms-python-limit" id="ms-code-limit">
              Local draft only. Python does not execute or update the visual
              route. Mission save does not include this draft.
            </p> */}
          </>
        )}
      </div>
    </section>
  )
}
