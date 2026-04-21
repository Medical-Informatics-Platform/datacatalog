import * as d3 from 'd3';
import { HierarchyNode, HierarchyPointLink, HierarchyPointNode } from 'd3-hierarchy';

type TreeDatum = {
  name: string;
  code?: string;
  description?: string;
  type?: string;
  units?: string;
  methodology?: string;
  min?: string | number;
  max?: string | number;
  variableCount?: number;
  enumerations?: { label: string }[];
  children?: TreeDatum[];
};

const PALETTE = {
  root: {
    circleFill: '#2b33e9', // --mip-dark-blue
    circleStroke: '#eef2ff',
    labelFill: 'rgba(225, 233, 255, 0.96)',
    labelStroke: 'rgba(61, 88, 192, 0.24)',
    text: '#102544',
  },
  group: {
    circleFill: '#ffffff',
    circleStroke: '#4a67d6',
    labelFill: 'rgba(255, 255, 255, 0.98)',
    labelStroke: 'rgba(96, 122, 202, 0.18)',
    text: '#102544',
  },
  variable: {
    circleFill: '#7f9ce8', // --mip-light-blue
    circleStroke: '#ffffff',
    labelFill: 'rgba(239, 249, 255, 0.98)',
    labelStroke: 'rgba(127, 156, 232, 0.24)',
    text: '#102544',
  },
  highlight: {
    circleFill: '#ffba08', // --mip-orange
    circleStroke: '#2435aa',
    labelFill: 'rgba(255, 245, 221, 0.98)',
    labelStroke: 'rgba(246, 179, 77, 0.52)',
    text: '#15264d',
  },
  link: {
    group: 'rgba(61, 87, 178, 0.22)',
    variable: 'rgba(110, 138, 186, 0.14)',
    active: '#2b33e9', // --mip-dark-blue
    shadow: 'rgba(255, 255, 255, 0.88)',
  },
};

const NODE_RADIUS = {
  root: 12,
  group: 8.5,
  variable: 6,
  highlight: 9.5,
};

const isGroupNode = (node: TreeDatum | HierarchyNode<TreeDatum>): boolean =>
  Object.prototype.hasOwnProperty.call('data' in node ? node.data : node, 'variableCount');

const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const truncateLabel = (label: string, limit: number): string =>
  label.length > limit ? `${label.slice(0, Math.max(limit - 1, 1))}\u2026` : label;

const buildTooltipHtml = (node: TreeDatum): string => {
  const title = escapeHtml(node.name || 'Unnamed node');
  const tone = isGroupNode(node) ? 'Group' : 'Variable';

  const chips: string[] = [
    `<span style="display:inline-flex;align-items:center;padding:4px 10px;border-radius:999px;background:rgba(43,51,233,0.08);color:#2b33e9;font-size:0.72rem;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;">${tone}</span>`,
  ];

  if (node.code) {
    chips.push(
      `<span style="display:inline-flex;align-items:center;padding:4px 10px;border-radius:999px;background:rgba(16,37,68,0.06);color:#334765;font-size:0.74rem;font-weight:600;">${escapeHtml(node.code)}</span>`
    );
  }

  if (!isGroupNode(node) && node.type) {
    chips.push(
      `<span style="display:inline-flex;align-items:center;padding:4px 10px;border-radius:999px;background:rgba(127, 156, 232,0.18);color:#2b33e9;font-size:0.74rem;font-weight:600;">${escapeHtml(node.type)}</span>`
    );
  }

  if (isGroupNode(node) && typeof node.variableCount === 'number') {
    chips.push(
      `<span style="display:inline-flex;align-items:center;padding:4px 10px;border-radius:999px;background:rgba(74,103,214,0.1);color:#3550b3;font-size:0.74rem;font-weight:700;">${node.variableCount} variables</span>`
    );
  }

  const rows: string[] = [];
  const addRow = (label: string, value: unknown) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    rows.push(`
      <div style="display:grid;grid-template-columns:minmax(86px,auto) 1fr;gap:12px;margin-top:8px;align-items:start;">
        <span style="color:#6b7e9b;font-size:0.78rem;font-weight:600;">${escapeHtml(label)}</span>
        <span style="color:#102544;font-size:0.84rem;line-height:1.45;word-break:break-word;">${escapeHtml(value)}</span>
      </div>
    `);
  };

  addRow('Description', node.description);
  addRow('Units', node.units);
  addRow('Method', node.methodology);
  addRow('Minimum', node.min);
  addRow('Maximum', node.max);

  const enumerationMarkup =
    node.type === 'nominal' && node.enumerations?.length
      ? `
        <div style="margin-top:12px;">
          <div style="margin-bottom:8px;color:#6b7e9b;font-size:0.78rem;font-weight:600;">Enumerations</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${node.enumerations
              .slice(0, 8)
              .map(
                (item) =>
                  `<span style="display:inline-flex;align-items:center;padding:4px 10px;border-radius:999px;background:rgba(43,51,233,0.07);color:#2b33e9;font-size:0.74rem;font-weight:500;">${escapeHtml(item.label)}</span>`
              )
              .join('')}
            ${
              node.enumerations.length > 8
                ? `<span style="display:inline-flex;align-items:center;padding:4px 10px;border-radius:999px;background:rgba(18,32,63,0.06);color:#4b5f82;font-size:0.74rem;font-weight:600;">+${node.enumerations.length - 8} more</span>`
                : ''
            }
          </div>
        </div>
      `
      : '';

  return `
    <div style="display:flex;flex-direction:column;gap:10px;min-width:240px;max-width:320px;">
      <div style="display:flex;flex-wrap:wrap;gap:8px;">${chips.join('')}</div>
      <div>
        <div style="color:#102544;font-size:1rem;font-weight:800;line-height:1.3;">${title}</div>
      </div>
      ${rows.length ? `<div>${rows.join('')}</div>` : ''}
      ${enumerationMarkup}
    </div>
  `;
};

export function createTidyTree(
  providedPath: string[],
  data: TreeDatum,
  container: HTMLElement,
  onBreadcrumbUpdate: (path: string[]) => void,
  onAvailableDepthsUpdate: (newAvailableDepths: number) => void,
  highlightedNode: TreeDatum | null = null,
  maxDepth: number | null,
  isZoomEnabled: boolean = true,
  onNodeClick?: (node: TreeDatum) => void
): void {
  const originalData = JSON.parse(JSON.stringify(data)) as TreeDatum;

  let tooltip: d3.Selection<HTMLDivElement, unknown, null, undefined> | null = null;

  const createTooltipElement = () => {
    tooltip?.remove();
    tooltip = d3
      .select(container)
      .append('div')
      .attr('class', 'chart-tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('pointer-events', 'none')
      .style('z-index', '1000')
      .style('max-width', '320px')
      .style('padding', '14px 16px')
      .style('border', '1px solid rgba(43, 51, 233, 0.16)')
      .style('border-radius', '18px')
      .style('background', 'rgba(255, 255, 255, 0.96)')
      .style('backdrop-filter', 'blur(14px)')
      .style('box-shadow', '0 24px 48px rgba(43, 51, 233, 0.12)');
  };

  const ensureTooltip = () => {
    if (!tooltip) {
      createTooltipElement();
    }
  };

  const positionTooltip = (event: MouseEvent) => {
    if (!tooltip) {
      return;
    }

    const tooltipNode = tooltip.node();
    if (!tooltipNode) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const tooltipRect = tooltipNode.getBoundingClientRect();

    let left = event.clientX - containerRect.left + 16;
    let top = event.clientY - containerRect.top + 16;

    if (left + tooltipRect.width + 12 > containerRect.width) {
      left = Math.max(8, containerRect.width - tooltipRect.width - 12);
    }

    if (top + tooltipRect.height + 12 > containerRect.height) {
      top = Math.max(8, containerRect.height - tooltipRect.height - 12);
    }

    tooltip.style('left', `${left}px`).style('top', `${top}px`);
  };

  const showTooltip = (event: MouseEvent, node: HierarchyPointNode<TreeDatum>) => {
    ensureTooltip();
    tooltip?.html(buildTooltipHtml(node.data)).style('visibility', 'visible');
    positionTooltip(event);
  };

  const hideTooltip = () => {
    tooltip?.style('visibility', 'hidden');
  };

  const pruneTreeToDepth = (node: HierarchyNode<TreeDatum>, depth: number, targetDepth: number | null): void => {
    if (targetDepth !== null && depth >= targetDepth) {
      delete node.children;
      return;
    }

    node.children?.forEach((child) => pruneTreeToDepth(child, depth + 1, targetDepth));
  };

  const calculateMaxDepth = (node: TreeDatum): number => {
    let currentMaxDepth = 0;
    d3.hierarchy(node).each((entry) => {
      currentMaxDepth = Math.max(currentMaxDepth, entry.depth);
    });
    return currentMaxDepth;
  };

  const findNodeInOriginalTree = (originalNode: TreeDatum, targetNode: TreeDatum): TreeDatum | null => {
    if (originalNode.name === targetNode.name) {
      return originalNode;
    }

    for (const child of originalNode.children || []) {
      const found = findNodeInOriginalTree(child, targetNode);
      if (found) {
        return found;
      }
    }

    return null;
  };

  const getPathFromOriginalRootToNode = (targetNode: TreeDatum): string[] => {
    const path: string[] = [];

    const walk = (node: TreeDatum): boolean => {
      path.push(node.name);
      if (node.name === targetNode.name) {
        return true;
      }

      for (const child of node.children || []) {
        if (walk(child)) {
          return true;
        }
      }

      path.pop();
      return false;
    };

    walk(originalData);
    return path;
  };

  const tooltipWrapper = () => {
    container.style.position = 'relative';
    createTooltipElement();
  };

  const renderTree = (rootData: TreeDatum, targetDepth: number | null) => {
    container.innerHTML = '';
    container.scrollTo({ left: 0, top: 0 });
    tooltipWrapper();

    const root = d3.hierarchy<TreeDatum>(rootData);
    onAvailableDepthsUpdate(calculateMaxDepth(rootData));

    pruneTreeToDepth(root, 0, targetDepth);

    const tree = d3
      .tree<TreeDatum>()
      .nodeSize([52, 280])
      .separation((a, b) => (a.parent === b.parent ? 1.15 : 1.45));

    root.sort((a, b) => d3.ascending(a.data.name, b.data.name));
    const laidOutRoot = tree(root);

    let x0 = Number.POSITIVE_INFINITY;
    let x1 = Number.NEGATIVE_INFINITY;
    let y0 = Number.POSITIVE_INFINITY;
    let y1 = Number.NEGATIVE_INFINITY;

    laidOutRoot.each((entry) => {
      x0 = Math.min(x0, entry.x);
      x1 = Math.max(x1, entry.x);
      y0 = Math.min(y0, entry.y);
      y1 = Math.max(y1, entry.y);
    });

    const containerWidth = Math.max(container.clientWidth - 24, 960);
    const margins = { top: 72, right: 240, bottom: 72, left: 56 };
    const width = Math.max(containerWidth, y1 - y0 + margins.left + margins.right);
    const height = Math.max(720, x1 - x0 + margins.top + margins.bottom);

    const svg = d3
      .create('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('role', 'img')
      .attr('aria-label', `Pathology hierarchy for ${rootData.name}`)
      .style('display', 'block')
      .style('width', `${width}px`)
      .style('height', `${height}px`)
      .style('max-width', 'none')
      .style('overflow', 'visible')
      .style('cursor', isZoomEnabled ? 'grab' : 'default');

    const defs = svg.append('defs');

    defs
      .append('filter')
      .attr('id', 'node-shadow')
      .attr('x', '-40%')
      .attr('y', '-40%')
      .attr('width', '180%')
      .attr('height', '180%')
      .html(`
        <feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="#102544" flood-opacity="0.12"></feDropShadow>
      `);

    const canvas = svg.append('g');
    const chart = canvas
      .append('g')
      .attr('transform', `translate(${margins.left - y0}, ${margins.top - x0})`);

    if (isZoomEnabled) {
      const zoom = d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.65, 2.4])
        .on('start', () => svg.style('cursor', 'grabbing'))
        .on('end', () => svg.style('cursor', 'grab'))
        .on('zoom', (event) => canvas.attr('transform', event.transform.toString()));

      svg.call(zoom as never);
    }

    const selectedNodeName = highlightedNode?.name ?? null;
    const highlightedHierarchyNode = selectedNodeName
      ? laidOutRoot.descendants().find((entry) => entry.data.name === selectedNodeName) ?? null
      : null;
    const highlightedPath = new Set(
      highlightedHierarchyNode ? highlightedHierarchyNode.ancestors().map((entry) => entry.data.name) : []
    );

    const linkGenerator = d3
      .linkHorizontal<HierarchyPointLink<TreeDatum>, HierarchyPointNode<TreeDatum>>()
      .x((entry) => entry.y)
      .y((entry) => entry.x);

    const links = laidOutRoot.links();

    chart
      .append('g')
      .attr('fill', 'none')
      .selectAll('path.link-shadow')
      .data(links)
      .join('path')
      .attr('class', 'link-shadow')
      .attr('d', linkGenerator as never)
      .attr('stroke', PALETTE.link.shadow)
      .attr('stroke-linecap', 'round')
      .attr('stroke-width', (entry) => (highlightedPath.has(entry.target.data.name) ? 6 : 4))
      .attr('opacity', (entry) => (highlightedPath.has(entry.target.data.name) ? 0.95 : 0.65));

    chart
      .append('g')
      .attr('fill', 'none')
      .selectAll('path.link-main')
      .data(links)
      .join('path')
      .attr('class', 'link-main')
      .attr('d', linkGenerator as never)
      .attr('stroke-linecap', 'round')
      .attr('stroke', (entry) => {
        if (highlightedPath.has(entry.target.data.name)) {
          return PALETTE.link.active;
        }
        return isGroupNode(entry.target) ? PALETTE.link.group : PALETTE.link.variable;
      })
      .attr('stroke-width', (entry) => {
        if (highlightedPath.has(entry.target.data.name)) {
          return 3.2;
        }
        return isGroupNode(entry.target) ? 2.3 : 1.6;
      })
      .attr('opacity', (entry) => (highlightedPath.has(entry.target.data.name) ? 1 : 0.95));

    const node = chart
      .append('g')
      .selectAll<SVGGElement, HierarchyPointNode<TreeDatum>>('g.node')
      .data(laidOutRoot.descendants())
      .join('g')
      .attr('class', (entry) => {
        const type = entry.depth === 0 ? 'root' : isGroupNode(entry) ? 'group' : 'variable';
        return `node node-${type}`;
      })
      .attr('transform', (entry) => `translate(${entry.y},${entry.x})`)
      .style('cursor', (entry) => (isGroupNode(entry) && entry.depth > 0 ? 'zoom-in' : 'pointer'))
      .on('mouseover', (event, entry) => showTooltip(event as MouseEvent, entry))
      .attr('fill', 'transparent')
      .on('mousemove', (event) => positionTooltip(event as MouseEvent))
      .on('mouseleave', hideTooltip)
      .on('click', (_event, entry) => {
        const pathNodes = new Set<string>();
        entry.ancestors().forEach((a) => pathNodes.add(a.data.name));

        chart
          .selectAll<SVGPathElement, HierarchyPointLink<TreeDatum>>('path')
          .transition()
          .duration(300)
          .attr('stroke', (d) =>
            pathNodes.has(d.target.data.name) ? PALETTE.link.active : PALETTE.link.variable
          )
          .attr('stroke-width', (d) => (pathNodes.has(d.target.data.name) ? 3.5 : 1.2))
          .attr('opacity', (d) => (pathNodes.has(d.target.data.name) ? 1 : 0.8));

        chart
          .selectAll<SVGGElement, HierarchyPointNode<TreeDatum>>('g.node')
          .selectAll<SVGTextElement, HierarchyPointNode<TreeDatum>>('text')
          .transition()
          .duration(300)
          .attr('font-weight', (d) =>
            pathNodes.has(d.data.name) ? 800 : d.depth === 0 ? 800 : isGroupNode(d) ? 700 : 600
          )
          .attr('fill', (d) => {
            if (d.data.name === entry.data.name) return PALETTE.highlight.text;
            if (d.depth === 0) return PALETTE.root.text;
            return isGroupNode(d) ? PALETTE.group.text : PALETTE.variable.text;
          });

        if (onNodeClick) {
          onNodeClick(entry.data);
        }
      })
      .on('dblclick', (_event, entry) => {
        tooltip?.style('visibility', 'hidden');

        if (originalData === entry.data || !isGroupNode(entry)) {
          return;
        }

        const originalSubtree = findNodeInOriginalTree(originalData, entry.data);
        if (!originalSubtree) {
          return;
        }

        const newAvailableDepths = calculateMaxDepth(originalSubtree);
        providedPath.pop();
        const path = [...providedPath, ...getPathFromOriginalRootToNode(entry.data)];
        onAvailableDepthsUpdate(newAvailableDepths);
        onBreadcrumbUpdate(path);
        renderTree(entry.data, newAvailableDepths);
      });

    node
      .filter((entry) => selectedNodeName !== null && entry.data.name === selectedNodeName)
      .append('circle')
      .attr('r', NODE_RADIUS.highlight + 4.5)
      .attr('fill', 'rgba(246, 179, 77, 0.16)')
      .attr('stroke', 'rgba(246, 179, 77, 0.42)')
      .attr('stroke-width', 1.4);

    node
      .append('circle')
      .attr('r', (entry) => {
        if (selectedNodeName && entry.data.name === selectedNodeName) {
          return NODE_RADIUS.highlight;
        }
        if (entry.depth === 0) {
          return NODE_RADIUS.root;
        }
        return isGroupNode(entry) ? NODE_RADIUS.group : NODE_RADIUS.variable;
      })
      .attr('fill', (entry) => {
        if (selectedNodeName && entry.data.name === selectedNodeName) {
          return PALETTE.highlight.circleFill;
        }
        if (entry.depth === 0) {
          return PALETTE.root.circleFill;
        }
        return isGroupNode(entry) ? PALETTE.group.circleFill : PALETTE.variable.circleFill;
      })
      .attr('stroke', (entry) => {
        if (selectedNodeName && entry.data.name === selectedNodeName) {
          return PALETTE.highlight.circleStroke;
        }
        if (entry.depth === 0) {
          return PALETTE.root.circleStroke;
        }
        return isGroupNode(entry) ? PALETTE.group.circleStroke : PALETTE.variable.circleStroke;
      })
      .attr('stroke-width', (entry) => (selectedNodeName && entry.data.name === selectedNodeName ? 2.8 : 2))
      .attr('paint-order', 'stroke');

    const labelGroups = node.append('g').attr('transform', 'translate(22,0)');

    labelGroups
      .append('text')
      .text((entry) => truncateLabel(entry.data.name, isGroupNode(entry) ? 26 : 22))
      .attr('dominant-baseline', 'middle')
      .attr('font-size', (entry) => (entry.depth === 0 ? 15 : isGroupNode(entry) ? 13 : 12))
      .attr('font-weight', (entry) => (entry.depth === 0 ? 800 : isGroupNode(entry) ? 700 : 600))
      .attr('fill', (entry) => {
        if (selectedNodeName && entry.data.name === selectedNodeName) {
          return PALETTE.highlight.text;
        }
        if (entry.depth === 0) {
          return PALETTE.root.text;
        }
        return isGroupNode(entry) ? PALETTE.group.text : PALETTE.variable.text;
      })
      .style('font-family', 'inherit');

    labelGroups.each(function (entry) {
      const labelGroup = d3.select(this);
      const labelText = labelGroup.select('text');
      const textNode = labelText.node() as SVGTextElement | null;
      if (!textNode) {
        return;
      }

      const bbox = textNode.getBBox();
      labelGroup.attr('class', 'label-group');
    });

    if (svg.node()) {
      container.appendChild(svg.node() as Node);
    }
  };

  renderTree(data, maxDepth);
}
