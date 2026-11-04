export default function LibraryAnnounceRegion({ announce }: { announce: string }) {
  return (
    <p className='ms-sr absolute w-px h-px overflow-hidden [clip:rect(0_0_0_0)] whitespace-nowrap' role='status' aria-live='polite' data-testid='ms-lib-announce'>
      {announce}
    </p>
  )
}
