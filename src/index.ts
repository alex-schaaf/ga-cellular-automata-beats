import { SVG, Rect } from "@svgdotjs/svg.js"
import * as Tone from "tone"
import * as Scale from "@tonaljs/scale"
import { sleep, hsl2hex } from "./utils"

var svg = SVG()
  .addTo(document.getElementById("board") as HTMLElement)
  .size(900, 400)

let active = false
const btn = document.createElement("button")
btn.innerHTML = "Toggle"
btn.onclick = function toggleActive() {
  active = !active
}
document.body.appendChild(btn)

let sleepValue = 187.5
const sleepSlider = document.createElement("input")
sleepSlider.type = "range"
sleepSlider.min = "100"
sleepSlider.max = "500"
sleepSlider.value = sleepValue.toFixed(1)
sleepSlider.onmouseup = function changeSleepValue(e: MouseEvent) {
  sleepValue = e.target?.value
}

document.body.appendChild(sleepSlider)

/**
 *
 */
class Grid {
  nx: number
  dx: number
  ox: number
  ny: number
  dy: number
  oy: number

  cells: Rect[][]

  /**
   *
   * @param nx number of cells horizontally
   * @param ny number of cells vertically
   * @param dx width of a cell
   * @param dy height of a cell
   * @param ox horizontal padding between cells
   * @param oy vertical padding between cells
   */
  constructor(nx: number, ny: number, dx = 25, dy = 25, ox = 2, oy = 2) {
    this.nx = nx
    this.ny = ny
    this.dx = dx
    this.ox = ox
    this.dy = dy
    this.oy = oy

    this.cells = []

    // initialize grid cells
    for (let y = 0; y < this.ny; y++) {
      this.cells[y] = []
      for (let x = 0; x < this.nx; x++) {
        const rect = svg
          .rect(this.dx, this.dy)
          .move(x * (this.dx + this.ox), y * (this.dy + this.oy))
          .attr({ fill: "#f06" })

        // initial pattern
        if (y === 4) {
          rect.active = 1
        } else {
          rect.active = 0
        }

        this.cells[y][x] = rect
      }
    }
  }

  /**
   * Draw all cells in grid based on their active status.
   */
  draw(): void {
    this.cells.forEach((row) => {
      row.forEach((cell) => {
        if (cell.active == 0) {
          cell.attr({ fill: "#efefef" })
        } else {
          cell.attr({ fill: "#f06" })
        }
      })
    })
  }

  /**
   * Get number of active neighboring cells in grid.
   *
   * @param x horizontal coordinate in grid
   * @param y vertical coordinate in grid
   * @returns number of active neighbors
   */
  countActiveNeighbors(x: number, y: number): number {
    let count = 0

    for (let j = -1; j < 2; j++) {
      for (let i = -1; i < 2; i++) {
        const nx = x + i
        const ny = y + j
        if (i === 0 && j === 0) {
          continue
        }
        if (nx <= 0 || ny < 0 || nx >= this.nx || ny >= this.ny) {
          count++
        } else if (this.cells[ny][nx].active) {
          count++
        }
      }
    }

    return count
  }

  simulate() {
    this.cells.forEach((row, y) => {
      row.forEach((cell, x) => {
        const activeNeighbors = this.countActiveNeighbors(x, y)

        if (cell.active) {
          if (activeNeighbors < 2 || activeNeighbors > 3) {
            cell.active = 0
          } else if (activeNeighbors == 3) {
            cell.active = 1
          }
        } else {
          if (activeNeighbors == 2 || activeNeighbors == 3) {
            cell.active = 1
          }
        }
      })
    })
  }
}

const grid = new Grid(16, 9)
const synth = new Tone.Synth().toDestination()
const range = Scale.rangeOf("C pentatonic")("C4", "C6")
const line = svg
  .rect(grid.dx, grid.ny * (grid.dy + grid.oy))
  .attr({ fill: hsl2hex(150, 100, 50), opacity: 0.2 })

let i = 0

async function run() {
  while (true) {
    await sleep(sleepValue)

    if (!active) {
      continue
    }

    const x = i % grid.nx
    if (x == 0) {
      grid.simulate()
    }

    line.move(x * (grid.dx + grid.ox), 0)

    grid.draw()

    let notes: string[] = []
    grid.cells.forEach((row, y) => {
      if (row[x].active) {
        notes.push(range[y % range.length] as string)
      }
    })
    const now = Tone.now()
    notes.forEach((note, i) => {
      synth.triggerAttackRelease(note, "8n", now + i * 0.01)
    })

    i++
  }
}

run()
