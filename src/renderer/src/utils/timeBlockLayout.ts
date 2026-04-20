export interface LayoutInput {
  id: string
  start: Date
  end: Date
}

export interface LayoutEntry {
  id: string
  column: number  // 0-indexed column within the cluster
  columns: number // total columns in the cluster
}

/**
 * Compute column layout for overlapping time blocks.
 * Same algorithm Google Calendar uses: pack into the lowest-index free column,
 * then resize every block in a cluster to match the cluster's column count.
 */
export function layoutOverlappingBlocks(blocks: LayoutInput[]): LayoutEntry[] {
  if (blocks.length === 0) return []

  // Sort: start ascending, then end descending (tie-break: longer first)
  const sorted = [...blocks].sort((a, b) => {
    const s = a.start.getTime() - b.start.getTime()
    if (s !== 0) return s
    return b.end.getTime() - a.end.getTime()
  })

  // Sweep: assign columns, group into clusters
  type Assigned = LayoutInput & { column: number; clusterId: number }
  const assigned: Assigned[] = []
  const activeColumnEnds: number[] = [] // end time of last block per column
  let clusterId = 0
  let clusterEnd = 0 // max end time within the current cluster

  for (const block of sorted) {
    // Start a new cluster if this block starts at or after clusterEnd
    if (block.start.getTime() >= clusterEnd && assigned.length > 0) {
      clusterId++
      activeColumnEnds.length = 0
      clusterEnd = 0
    }

    // Find lowest-index column whose last end <= block.start
    let col = activeColumnEnds.findIndex((e) => e <= block.start.getTime())
    if (col === -1) {
      col = activeColumnEnds.length
      activeColumnEnds.push(block.end.getTime())
    } else {
      activeColumnEnds[col] = block.end.getTime()
    }

    assigned.push({ ...block, column: col, clusterId })
    if (block.end.getTime() > clusterEnd) clusterEnd = block.end.getTime()
  }

  // Per-cluster column counts
  const clusterCols = new Map<number, number>()
  for (const a of assigned) {
    const cur = clusterCols.get(a.clusterId) ?? 0
    if (a.column + 1 > cur) clusterCols.set(a.clusterId, a.column + 1)
  }

  return assigned.map((a) => ({
    id: a.id,
    column: a.column,
    columns: clusterCols.get(a.clusterId)!
  }))
}
