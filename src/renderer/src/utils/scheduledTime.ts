/**
 * Snap an ISO local datetime string to the nearest 15-minute grid point
 * (round-half-up). Input format: "YYYY-MM-DDTHH:mm:ss".
 */
export function snapTo15Min(iso: string): string {
  const d = new Date(iso)
  const minutes = d.getMinutes()
  const snapped = Math.round(minutes / 15) * 15
  d.setMinutes(snapped, 0, 0)
  return toLocalIso(d)
}

function toLocalIso(d: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0')
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  )
}
