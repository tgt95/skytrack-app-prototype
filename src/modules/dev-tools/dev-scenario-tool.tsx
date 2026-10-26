import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from 'skytrack-ui/button'
import {
  Drawer,
  DrawerBackdrop,
  DrawerPopup,
  DrawerPortal,
  DrawerViewport
} from 'skytrack-ui/drawer'
import DevScenarioDrawer from './dev-scenario-drawer'
import skyTrackUiLogo from '../../assets/skytrack-logo-outline.svg?raw'

export default function DevScenarioTool () {
  const [open, setOpen] = useState(false)

  return (
    <>
      {createPortal(
        <Button
          className='fixed right-1 bottom-1 z-2147483646 size-[2.75rem] max-[40rem]:right-0.5 max-[40rem]:bottom-0.5'
          size='icon-xs'
          variant='secondary'
          aria-label='Open Dev Tool'
          aria-haspopup='dialog'
          aria-expanded={open}
          title='Dev Tool'
          onClick={() => setOpen(true)}
        >
          <span
            className='inline-flex size-5 [&>svg]:size-full'
            aria-hidden='true'
            dangerouslySetInnerHTML={{ __html: skyTrackUiLogo }}
          />
        </Button>,
        document.body
      )}

      <Drawer open={open} onOpenChange={setOpen} swipeDirection='right'>
        <DrawerPortal className='fixed inset-0 z-2147483647'>
          <DrawerBackdrop className='z-2147483646' />
          <DrawerViewport
            side='right'
            className='z-2147483647 pointer-events-none'
          >
            <DrawerPopup side='right' className='pointer-events-auto'>
              <DevScenarioDrawer />
            </DrawerPopup>
          </DrawerViewport>
        </DrawerPortal>
      </Drawer>
    </>
  )
}
