## Price Indicator Integration: ChinQue Exchange Chart

**Context**
The user requested a JavaScript function to draw horizontal price indicator lines (Stop Loss, Take Profit) on an SVG-based financial chart. The analysis focused on mapping numerical price values to the SVG's coordinate system.

**Diagnostics**
The chart's scale was determined by comparing SVG `viewBox` attributes with numerical labels found in the DOM.

| Metric | Value |
| :--- | :--- |
| **SVG ViewBox** | `0 0 900 320` |
| **Data Y-Range** | `30` (Top) to `290` (Bottom) |
| **Identified Price Range** | `9213.75` (Top) to `9132.5` (Bottom) |
| **Detected Colors** | `var(--up)` (Green), `var(--down)` (Red) |

**Actionable Findings**
*   **Coordinate Mapping:** A linear interpolation is required to translate a price value into a Y-coordinate within the `30-290` range.
*   **SVG Implementation:** Lines should be appended as `<g>` elements containing a `<line>` and a `<text>` node to ensure labels stay attached to their respective indicators.

**Code Fixes**
The following function was identified as a potential implementation for the live page. Note that the `pMin` and `pMax` constants may need adjustment if the chart's zoom level or price interval changes dynamically.


`````js
/**
 * Draws a price indicator line on the SVG chart.
 * Frames a price value to a Y-coordinate via linear interpolation.
 */
function drawPriceLine(price, label, color) {
  const svg = document.querySelector('svg');
  if (!svg) return;

  // Chart Coordinate Constants
  const pMin = 9132.5; 
  const pMax = 9213.75; 
  const yMin = 290;    
  const yMax = 30;     
  
  const y = yMin + (price - pMin) * (yMax - yMin) / (pMax - pMin);
  
  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  g.setAttribute("class", "price-checker-line");
  
  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", "0");
  line.setAttribute("x2", "900");
  line.setAttribute("y1", y);
  line.setAttribute("y2", y);
  line.setAttribute("stroke", color);
  line.setAttribute("stroke-width", "1");
  line.setAttribute("stroke-dasharray", "4");
  
  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
  text.setAttribute("x", "10");
  text.setAttribute("y", y - 5);
  text.setAttribute("fill", color);
  text.setAttribute("font-size", "12px");
  text.textContent = `${label}: ${price}`;
  
  g.appendChild(line);
  g.appendChild(text);
  svg.appendChild(g);
}
`````

*Note: The code fixes and findings above were identified on a live page in DevTools. When applying them to your codebase, please adapt them to your project's specific technical stack (e.g., Tailwind CSS classes, CSS modules, framework components) rather than applying them as literal CSS overrides.*
