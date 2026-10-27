export default function LibraryAnnounceRegion({ announce }: { announce: string }) {
  return (
    <p className='ms-sr' role='status' aria-live='polite' data-testid='ms-lib-announce'>
      {announce}
    </p>
  )
}
