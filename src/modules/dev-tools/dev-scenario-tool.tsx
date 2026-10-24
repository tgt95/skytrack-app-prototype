import { useState } from 'react'
import { createPortal } from 'react-dom'
import { CodeIcon } from '@phosphor-icons/react'
import { Button } from 'skytrack-ui/button'
import {
  Drawer,
  DrawerBackdrop,
  DrawerPopup,
  DrawerPortal,
  DrawerViewport,
} from 'skytrack-ui/drawer'
import DevScenarioDrawer from './dev-scenario-drawer'
import './dev-scenario-tool.css'

export default function DevScenarioTool() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {createPortal(
        <Button
          className="ms-dev-tool-trigger"
          size="icon"
          variant="default"
          aria-label="Open Dev Tool"
          aria-haspopup="dialog"
          aria-expanded={open}
          title="Dev Tool"
          onClick={() => setOpen(true)}
        >
          <CodeIcon aria-hidden="true" />
        </Button>,
        document.body,
      )}

      <Drawer open={open} onOpenChange={setOpen} swipeDirection="right">
        <DrawerPortal
          className="ms-dev-tool-portal"
          style={{ position: 'fixed', inset: 0, zIndex: 2_147_483_647 }}
        >
          <DrawerBackdrop className="ms-dev-tool-backdrop" />
          <DrawerViewport side="right" className="ms-dev-tool-viewport">
            <DrawerPopup side="right" className="ms-dev-tool-popup">
              <DevScenarioDrawer />
            </DrawerPopup>
          </DrawerViewport>
        </DrawerPortal>
      </Drawer>
    </>
  )
}
