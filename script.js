let THREE = null;
let OrbitControls = null;
let RoomEnvironment = null;

const state = {
  segments: 18,
  opening: 1.05,
  height: 48,
  tilt: 18,
  irregularity: 4,
  thickness: 6,
  radius: 128,
  cutoutScale: 14,
  cutoutSharpness: 46,
  cutoutBand: 50,
};

const elements = {
  topViewSurface: document.getElementById("topViewSurface"),
  threeView: document.getElementById("threeView"),
  statusLine: document.getElementById("statusLine"),
  assemblyValue: document.getElementById("assemblyValue"),
  diameterValue: document.getElementById("diameterValue"),
  openingValue: document.getElementById("openingValue"),
  frameWidthValue: document.getElementById("frameWidthValue"),
  totalPrice: document.getElementById("totalPrice"),
  materialCost: document.getElementById("materialCost"),
  cuttingCost: document.getElementById("cuttingCost"),
  assemblyCost: document.getElementById("assemblyCost"),
  designCost: document.getElementById("designCost"),
  generateButton: document.getElementById("generateButton"),
  exportButton: document.getElementById("exportButton"),
  buyButton: document.getElementById("buyButton"),
  assistantFeed: document.getElementById("assistantFeed"),
  aiPrompt: document.getElementById("aiPrompt"),
  aiApplyButton: document.getElementById("aiApplyButton"),
  aiClearButton: document.getElementById("aiClearButton"),
  values: {
    segments: document.getElementById("segmentsValue"),
    opening: document.getElementById("openingValueLabel"),
    height: document.getElementById("heightValue"),
    tilt: document.getElementById("tiltValue"),
    irregularity: document.getElementById("irregularityValue"),
    thickness: document.getElementById("thicknessValue"),
    radius: document.getElementById("radiusValue"),
    cutoutScale: document.getElementById("cutoutScaleValue"),
    cutoutSharpness: document.getElementById("cutoutSharpnessValue"),
    cutoutBand: document.getElementById("cutoutBandValue"),
  },
  sliders: {
    segments: document.getElementById("segments"),
    opening: document.getElementById("opening"),
    height: document.getElementById("height"),
    tilt: document.getElementById("tilt"),
    irregularity: document.getElementById("irregularity"),
    thickness: document.getElementById("thickness"),
    radius: document.getElementById("radius"),
    cutoutScale: document.getElementById("cutoutScale"),
    cutoutSharpness: document.getElementById("cutoutSharpness"),
    cutoutBand: document.getElementById("cutoutBand"),
  },
};

const threeState = {
  ready: false,
  scene: null,
  camera: null,
  renderer: null,
  controls: null,
  bowlGroup: null,
  modelResources: [],
  environmentTarget: null,
};

const assistantMessages = [
  {
    role: "assistant",
    text:
      "可以直接描述你想要的效果，例如“更锋利、镂空更大、整体更浅但底座更稳，半径 150”。我会把需求映射成参数并立即更新模型。",
  },
];

let currentSvgMarkup = "";

function formatRmb(value) {
  return `￥${Math.round(value)}`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function updateSliderFill(slider) {
  const min = Number(slider.min);
  const max = Number(slider.max);
  const value = Number(slider.value);
  const fill = ((value - min) / (max - min)) * 100;
  slider.style.setProperty("--fill", `${fill}%`);
}

function polygonPath(points) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ")
    .concat(" Z");
}

function projectTop(point, centerX, centerY) {
  return {
    x: centerX + point.x,
    y: centerY + point.z,
  };
}

function signedArea2D(points) {
  let area = 0;
  for (let index = 0; index < points.length; index += 1) {
    const next = points[(index + 1) % points.length];
    area += points[index].x * next.y - next.x * points[index].y;
  }
  return area / 2;
}

function ensureWinding(points, clockwise) {
  const area = signedArea2D(points);
  const isClockwise = area < 0;
  if (isClockwise === clockwise) {
    return points.map((point) => ({ ...point }));
  }
  return points
    .slice()
    .reverse()
    .map((point) => ({ ...point }));
}

function blendColor(colorA, colorB, ratio) {
  const amount = clamp(ratio, 0, 1);
  const from = colorA.replace("#", "");
  const to = colorB.replace("#", "");
  const fromRgb = {
    r: Number.parseInt(from.slice(0, 2), 16),
    g: Number.parseInt(from.slice(2, 4), 16),
    b: Number.parseInt(from.slice(4, 6), 16),
  };
  const toRgb = {
    r: Number.parseInt(to.slice(0, 2), 16),
    g: Number.parseInt(to.slice(2, 4), 16),
    b: Number.parseInt(to.slice(4, 6), 16),
  };
  const mixed = {
    r: Math.round(fromRgb.r + (toRgb.r - fromRgb.r) * amount),
    g: Math.round(fromRgb.g + (toRgb.g - fromRgb.g) * amount),
    b: Math.round(fromRgb.b + (toRgb.b - fromRgb.b) * amount),
  };

  return `#${[mixed.r, mixed.g, mixed.b]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")}`;
}

function getSignature(index, segments) {
  const angle = (index / segments) * Math.PI * 2;
  const alternating = index % 2 === 0 ? 1 : -1;
  const triad = ((index % 3) - 1) * 0.22;
  const raw =
    alternating * 0.46 +
    Math.sin(angle * 3.1 + 0.4) * 0.34 +
    Math.cos(angle * 5.2 - 0.72) * 0.24 +
    triad;

  return clamp(raw, -1.1, 1.1);
}

function clampToSlider(key, value) {
  const slider = elements.sliders[key];
  const min = Number(slider.min);
  const max = Number(slider.max);
  const step = Number(slider.step) || 1;
  const clampedValue = clamp(value, min, max);
  const stepped = min + Math.round((clampedValue - min) / step) * step;

  if (step < 1) {
    return Number(stepped.toFixed(2));
  }
  return Math.round(stepped);
}

function setStateValue(key, value) {
  state[key] = clampToSlider(key, value);
}

function syncSlidersFromState() {
  Object.entries(elements.sliders).forEach(([key, slider]) => {
    slider.value = Number(state[key]).toFixed(Number(slider.step) < 1 ? 2 : 0);
    updateSliderFill(slider);
  });
}

function updateLabels() {
  elements.values.segments.textContent = String(state.segments);
  elements.values.opening.textContent = `${state.opening.toFixed(2)}x`;
  elements.values.height.textContent = `${state.height} mm`;
  elements.values.tilt.textContent = `${state.tilt}°`;
  elements.values.irregularity.textContent = `${state.irregularity} / 10`;
  elements.values.thickness.textContent = `${state.thickness} mm`;
  elements.values.radius.textContent = `${state.radius} mm`;
  elements.values.cutoutScale.textContent = `${state.cutoutScale}%`;
  elements.values.cutoutSharpness.textContent = `${state.cutoutSharpness}%`;
  elements.values.cutoutBand.textContent = `${state.cutoutBand}%`;
}

function getPricing() {
  const materialCost =
    52 +
    state.radius * 1.78 +
    state.thickness * 10.2 +
    state.height * 1.18 -
    state.cutoutScale * 0.7;

  const cuttingCost =
    34 +
    state.segments * 4.5 +
    state.irregularity * 8.1 +
    state.cutoutScale * 2.1 +
    state.cutoutSharpness * 0.8;

  const assemblyCost =
    24 +
    state.segments * 1.8 +
    state.tilt * 0.92 +
    state.thickness * 1.4;

  const designCost =
    48 +
    state.segments * 1.15 +
    state.irregularity * 4.8 +
    state.cutoutBand * 0.5 +
    state.cutoutSharpness * 0.45;

  return {
    materialCost,
    cuttingCost,
    assemblyCost,
    designCost,
    totalPrice: Math.round(materialCost + cuttingCost + assemblyCost + designCost),
  };
}

function updatePricePanel() {
  const pricing = getPricing();
  elements.totalPrice.textContent = formatRmb(pricing.totalPrice);
  elements.materialCost.textContent = formatRmb(pricing.materialCost);
  elements.cuttingCost.textContent = formatRmb(pricing.cuttingCost);
  elements.assemblyCost.textContent = formatRmb(pricing.assemblyCost);
  elements.designCost.textContent = formatRmb(pricing.designCost);
}

function createPoint(radius, y, angle) {
  return {
    x: Math.cos(angle) * radius,
    y,
    z: Math.sin(angle) * radius,
  };
}

function subtract3(a, b) {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z,
  };
}

function dot3(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross3(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function normalize3(vector) {
  const length = Math.hypot(vector.x, vector.y, vector.z) || 1;
  return {
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length,
  };
}

function pseudoRandom(seed) {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return value - Math.floor(value);
}

function buildFacetPanelFromCorners(corners) {
  const origin = corners[0];
  const xAxis = normalize3(subtract3(corners[1], origin));
  let normal = normalize3(cross3(subtract3(corners[1], origin), subtract3(corners[3], origin)));
  if (Math.hypot(normal.x, normal.y, normal.z) < 0.0001) {
    normal = normalize3(cross3(subtract3(corners[1], origin), subtract3(corners[2], origin)));
  }
  const yAxis = normalize3(cross3(normal, xAxis));
  const toLocal = (point) => {
    const relative = subtract3(point, origin);
    return {
      x: dot3(relative, xAxis),
      y: dot3(relative, yAxis),
    };
  };
  const toWorld = (u, v, offset = 0) => ({
    x: origin.x + xAxis.x * u + yAxis.x * v + normal.x * offset,
    y: origin.y + xAxis.y * u + yAxis.y * v + normal.y * offset,
    z: origin.z + xAxis.z * u + yAxis.z * v + normal.z * offset,
  });

  return {
    plane: {
      origin,
      xAxis,
      yAxis,
      normal,
      toWorld,
    },
    localOuter: corners.map(toLocal),
    outer3d: corners.map((point) => ({ ...point })),
  };
}

function getPanelBounds(panel) {
  const xs = panel.localOuter.map((point) => point.x);
  const ys = panel.localOuter.map((point) => point.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

function buildMicroCutout(centerX, centerY, radiusX, radiusY, sharpness, skew) {
  const topPull = radiusY * (1.08 + sharpness * 0.34);
  const sidePull = radiusX * (0.92 - sharpness * 0.16);
  return [
    { x: centerX + skew * 0.2, y: centerY - topPull },
    { x: centerX + sidePull, y: centerY - radiusY * 0.08 },
    { x: centerX + skew * 0.35, y: centerY + radiusY },
    { x: centerX - sidePull, y: centerY + radiusY * 0.12 },
  ];
}

function buildPanelCutouts(panel, panelType, index, plateThickness) {
  if (state.cutoutScale <= 0 || panelType === "base") {
    return [];
  }

  const bounds = getPanelBounds(panel);
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const sizeLimit = Math.min(width, height);
  const frame = Math.max(plateThickness * 2.7, sizeLimit * 0.18, 6.5);
  if (width <= frame * 2.5 || height <= frame * 2.5) {
    return [];
  }

  const densityRatio = state.cutoutScale / 32;
  const sharpnessRatio = (state.cutoutSharpness - 24) / 52;
  const bandTarget = clamp((state.cutoutBand - 36) / 28, 0, 1);
  const layerCenter = panelType === "outer" ? 0.18 : 0.72;
  const layerSpread = panelType === "outer" ? 0.24 : 0.22;
  const bandFactor = clamp(1 - Math.abs(layerCenter - bandTarget) / layerSpread, 0, 1);
  const randomA = pseudoRandom(index * 1.73 + (panelType === "outer" ? 3 : 9));
  const candidateCount = densityRatio > 0.72 ? 2 : 1;
  const probability =
    (panelType === "outer" ? 0.12 : 0.09) +
    densityRatio * (panelType === "outer" ? 0.56 : 0.42);
  if (randomA > probability * (0.16 + bandFactor * 0.96)) {
    return [];
  }

  const holes = [];
  for (let holeIndex = 0; holeIndex < candidateCount; holeIndex += 1) {
    const holeSeed = index * 17 + holeIndex * 13 + (panelType === "outer" ? 4 : 11);
    const jitterX = pseudoRandom(holeSeed);
    const jitterY = pseudoRandom(holeSeed + 5);
    const jitterShape = pseudoRandom(holeSeed + 11);
    const availableWidth = width - frame * 2;
    const availableHeight = height - frame * 2;
    const centerX = bounds.minX + frame + availableWidth * (0.2 + jitterX * 0.6);
    const targetYRatio = panelType === "outer"
      ? 0.12 + bandTarget * 0.76
      : 0.06 + bandTarget * 0.88;
    const yJitter = (jitterY - 0.5) * (panelType === "outer" ? 0.12 : 0.14);
    const centerY = bounds.minY + frame + availableHeight * clamp(targetYRatio + yJitter, 0.06, 0.94);
    const radiusBase = sizeLimit * (0.05 + densityRatio * 0.06);
    const radiusX = radiusBase * (0.72 + jitterShape * 0.24);
    const radiusY =
      radiusBase * (1.02 + sharpnessRatio * 0.34 + (panelType === "outer" ? 0.12 : 0));

    if (centerX - radiusX < bounds.minX + frame ||
        centerX + radiusX > bounds.maxX - frame ||
        centerY - radiusY < bounds.minY + frame ||
        centerY + radiusY > bounds.maxY - frame) {
      continue;
    }

    const skew = (pseudoRandom(holeSeed + 17) - 0.5) * radiusX * 0.8;
    holes.push(
      ensureWinding(
        buildMicroCutout(centerX, centerY, radiusX, radiusY, sharpnessRatio, skew),
        true
      )
    );
  }

  return holes;
}

function getGeometryData() {
  const segments = state.segments;
  const step = (Math.PI * 2) / segments;
  const irregularityRatio = state.irregularity / 10;
  const tiltRatio = Math.sin(toRadians(state.tilt));
  const plateThickness = Math.max(1.5, state.thickness * 0.72);
  const signatures = Array.from({ length: segments }, (_, index) =>
    getSignature(index, segments)
  );

  const rimBaseRadius = state.radius * state.opening;
  const shoulderBaseRadius =
    state.radius * (0.86 + state.opening * 0.05 - tiltRatio * 0.08);
  const basinBaseRadius =
    state.radius * (0.52 + state.opening * 0.03 - tiltRatio * 0.03);
  const footBaseRadius =
    state.radius * (0.34 + state.opening * 0.02 - irregularityRatio * 0.015);

  const rimY = state.height + plateThickness * 0.75;
  const shoulderY = state.height * 0.7 + plateThickness * 0.52;
  const basinY = Math.max(plateThickness * 1.4, state.height * 0.22);
  const footY = Math.max(0, plateThickness * 0.22);

  const rim = [];
  const shoulder = [];
  const basin = [];
  const foot = [];

  for (let index = 0; index < segments; index += 1) {
    const signature = signatures[index];
    const angle = -Math.PI / 2 + index * step;
    const radialScale = 1 + signature * (0.03 + irregularityRatio * 0.11);
    const yScale = signature * state.height * irregularityRatio * 0.12;

    rim.push(
      createPoint(rimBaseRadius * radialScale, rimY + yScale * 0.72, angle)
    );
    shoulder.push(
      createPoint(
        shoulderBaseRadius * (1 + signature * (0.02 + irregularityRatio * 0.05)),
        shoulderY + yScale * 0.3,
        angle
      )
    );
    basin.push(
      createPoint(
        basinBaseRadius * (1 + signature * (0.012 + irregularityRatio * 0.03)),
        basinY + yScale * 0.08,
        angle
      )
    );
    foot.push(
      createPoint(footBaseRadius * (1 + signature * 0.012), footY, angle)
    );
  }

  const panels = [];
  const allRimRadii = rim.map((point) => Math.hypot(point.x, point.z));

  for (let index = 0; index < segments; index += 1) {
    const next = (index + 1) % segments;

    [
      { type: "outer", corners: [rim[index], rim[next], shoulder[next], shoulder[index]] },
      { type: "mid", corners: [shoulder[index], shoulder[next], basin[next], basin[index]] },
      { type: "base", corners: [basin[index], basin[next], foot[next], foot[index]] },
    ].forEach((panelDef, layerIndex) => {
      const panel = buildFacetPanelFromCorners(panelDef.corners);
      const signature = (signatures[index] + signatures[next]) / 2;
      const holesLocal = buildPanelCutouts(
        panel,
        panelDef.type,
        index * 10 + layerIndex,
        plateThickness
      );

      panels.push({
        type: panelDef.type,
        signature,
        ...panel,
        holesLocal,
        holes3d: holesLocal.map((hole) =>
          hole.map((point) => panel.plane.toWorld(point.x, point.y))
        ),
      });
    });
  }

  const baseCapPoints = foot.map((point) => ({
    x: point.x,
    y: footY,
    z: point.z,
  }));

  return {
    segments,
    step,
    plateThickness,
    signatures,
    panels,
    baseCapPoints,
    baseCapY: footY,
    metrics: {
      openingDiameter: Math.round(Math.max(...allRimRadii) * 2),
      bowlHeight: Math.round(rimY),
      footDiameter: Math.round(footBaseRadius * 2.15),
      trianglePanels: segments * 6,
      cutoutRatio: Math.round(state.cutoutScale),
    },
  };
}

function buildTopViewSvg() {
  const geometry = getGeometryData();
  const centerX = 360;
  const centerY = 360;
  const facetMarkup = [];
  const lineMarkup = [];
  const accentMarkup = [];

  geometry.panels.forEach((panel) => {
    const outer2d = panel.outer3d.map((point) => projectTop(point, centerX, centerY));
    const fill =
      panel.type === "outer"
        ? blendColor("#f8f8f5", "#d7d7d2", 0.26 + (panel.signature + 1) * 0.18)
        : panel.type === "mid"
          ? blendColor("#efefe9", "#cbcbc4", 0.24 + (panel.signature + 1) * 0.16)
          : blendColor("#e3e3dc", "#b9b9b2", 0.2 + (panel.signature + 1) * 0.12);

    const hole2d = panel.holes3d.map((hole) =>
      hole.map((point) => projectTop(point, centerX, centerY))
    );
    const compoundPath = [polygonPath(outer2d), ...hole2d.map((points) => polygonPath(points))].join(" ");

    facetMarkup.push(`
      <path
        d="${compoundPath}"
        fill="${fill}"
        fill-rule="evenodd"
        stroke="#171717"
        stroke-width="${panel.type === "outer" ? 1.2 : 1.05}"
        vector-effect="non-scaling-stroke"
      />
    `);

    for (let index = 0; index < outer2d.length; index += 1) {
      const next = (index + 1) % outer2d.length;
      lineMarkup.push(`
        <line x1="${outer2d[index].x.toFixed(2)}" y1="${outer2d[index].y.toFixed(2)}" x2="${outer2d[next].x.toFixed(2)}" y2="${outer2d[next].y.toFixed(2)}" />
      `);
    }

    lineMarkup.push(`
      <line x1="${outer2d[0].x.toFixed(2)}" y1="${outer2d[0].y.toFixed(2)}" x2="${outer2d[2].x.toFixed(2)}" y2="${outer2d[2].y.toFixed(2)}" />
    `);

    hole2d.forEach((hole) => {
      for (let index = 0; index < hole.length; index += 1) {
        const next = (index + 1) % hole.length;
        accentMarkup.push(`
          <line x1="${hole[index].x.toFixed(2)}" y1="${hole[index].y.toFixed(2)}" x2="${hole[next].x.toFixed(2)}" y2="${hole[next].y.toFixed(2)}" />
        `);
      }
    });

    if (panel.type === "outer" && panel.signature > 0.42) {
      accentMarkup.push(`
        <line x1="${outer2d[0].x.toFixed(2)}" y1="${outer2d[0].y.toFixed(2)}" x2="${outer2d[1].x.toFixed(2)}" y2="${outer2d[1].y.toFixed(2)}" />
      `);
    }
  });

  const baseCap2d = geometry.baseCapPoints.map((point) => projectTop(point, centerX, centerY));

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 720" role="img" aria-label="金属折面果盘顶视图">
      <defs>
        <pattern id="microGrid" width="12" height="12" patternUnits="userSpaceOnUse">
          <path d="M 12 0 L 0 0 0 12" fill="none" stroke="#ecece6" stroke-width="1" />
        </pattern>
        <pattern id="macroGrid" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#d8d8d1" stroke-width="1" />
        </pattern>
      </defs>

      <rect width="720" height="720" fill="#f7f7f3" />
      <rect width="720" height="720" fill="url(#microGrid)" />
      <rect width="720" height="720" fill="url(#macroGrid)" />

      <g stroke="#c63a32" stroke-opacity="0.14" vector-effect="non-scaling-stroke">
        <line x1="360" y1="34" x2="360" y2="686" stroke-width="1" />
        <line x1="34" y1="360" x2="686" y2="360" stroke-width="1" />
      </g>

      <path d="${polygonPath(baseCap2d)}" fill="#cfcfc8" stroke="#171717" stroke-width="1.1" vector-effect="non-scaling-stroke" />
      <g>${facetMarkup.join("")}</g>

      <g stroke="#5b5b56" stroke-opacity="0.74" stroke-width="0.82" fill="none" vector-effect="non-scaling-stroke">
        ${lineMarkup.join("")}
      </g>

      <g stroke="#c63a32" stroke-opacity="0.86" stroke-width="1.16" fill="none" vector-effect="non-scaling-stroke">
        ${accentMarkup.join("")}
      </g>

      <g font-family="IBM Plex Mono, Consolas, monospace" font-size="13" fill="#666662">
        <text x="28" y="38">TOP VIEW</text>
        <text x="28" y="58">FACETED RIM / STRUCTURAL CUTOUTS / STABLE FOOT</text>
        <text x="28" y="78">SEGMENTS ${state.segments}</text>
      </g>

      <g font-family="IBM Plex Mono, Consolas, monospace" font-size="13" fill="#c63a32">
        <text x="438" y="38">OPENING ${state.opening.toFixed(2)}x</text>
        <text x="438" y="58">HEIGHT ${state.height} mm</text>
        <text x="438" y="78">CUTOUT ${state.cutoutScale}% / ${state.cutoutSharpness}%</text>
        <text x="28" y="692">SHARP FACETED METALLIC BOWL / PARAMETRIC CUTOUT SYSTEM / AI-ASSISTED CONTROL</text>
      </g>
    </svg>
  `;
}

function disposeResource(resource) {
  if (resource && typeof resource.dispose === "function") {
    resource.dispose();
  }
}

function clearThreeModel() {
  if (!threeState.bowlGroup) {
    return;
  }

  while (threeState.bowlGroup.children.length) {
    threeState.bowlGroup.remove(threeState.bowlGroup.children[0]);
  }

  threeState.modelResources.forEach(disposeResource);
  threeState.modelResources = [];
}

function localToWorld(plane, point, offset = 0) {
  return new THREE.Vector3(
    plane.origin.x + plane.xAxis.x * point.x + plane.yAxis.x * point.y + plane.normal.x * offset,
    plane.origin.y + plane.xAxis.y * point.x + plane.yAxis.y * point.y + plane.normal.y * offset,
    plane.origin.z + plane.xAxis.z * point.x + plane.yAxis.z * point.y + plane.normal.z * offset
  );
}

function createPlanarPlateGeometry(localOuter, holesLocal, plane, thickness) {
  const outer = ensureWinding(localOuter, false);
  const holes = holesLocal.map((hole) => ensureWinding(hole, true));
  const outerVec2 = outer.map((point) => new THREE.Vector2(point.x, point.y));
  const holeVec2 = holes.map((hole) => hole.map((point) => new THREE.Vector2(point.x, point.y)));
  const triangles = THREE.ShapeUtils.triangulateShape(outerVec2, holeVec2);
  const allPoints = outer.concat(...holes);
  const frontVertices = allPoints.map((point) => localToWorld(plane, point, thickness / 2));
  const backVertices = allPoints.map((point) => localToWorld(plane, point, -thickness / 2));
  const positions = [];

  const pushTriangle = (a, b, c) => {
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  };

  triangles.forEach(([a, b, c]) => {
    pushTriangle(frontVertices[a], frontVertices[b], frontVertices[c]);
    pushTriangle(backVertices[a], backVertices[c], backVertices[b]);
  });

  const addLoopSides = (loop, isHole) => {
    for (let index = 0; index < loop.length; index += 1) {
      const next = (index + 1) % loop.length;
      const frontA = localToWorld(plane, loop[index], thickness / 2);
      const frontB = localToWorld(plane, loop[next], thickness / 2);
      const backA = localToWorld(plane, loop[index], -thickness / 2);
      const backB = localToWorld(plane, loop[next], -thickness / 2);

      if (isHole) {
        pushTriangle(frontA, backB, frontB);
        pushTriangle(frontA, backA, backB);
      } else {
        pushTriangle(frontA, frontB, backB);
        pushTriangle(frontA, backB, backA);
      }
    }
  };

  addLoopSides(outer, false);
  holes.forEach((hole) => addLoopSides(hole, true));

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function createHorizontalCapGeometry(points3d, thickness, yLevel = 0) {
  const localOuter = points3d.map((point) => ({ x: point.x, y: point.z }));
  const plane = {
    origin: { x: 0, y: yLevel, z: 0 },
    xAxis: { x: 1, y: 0, z: 0 },
    yAxis: { x: 0, y: 0, z: 1 },
    normal: { x: 0, y: 1, z: 0 },
  };
  return createPlanarPlateGeometry(localOuter, [], plane, thickness);
}

function buildLineLoops(points, target) {
  for (let index = 0; index < points.length; index += 1) {
    const next = (index + 1) % points.length;
    target.push(
      points[index].x,
      points[index].y,
      points[index].z,
      points[next].x,
      points[next].y,
      points[next].z
    );
  }
}

function buildSeamLines(geometry) {
  const seamPositions = [];
  const accentPositions = [];

  geometry.panels.forEach((panel) => {
    buildLineLoops(panel.outer3d, seamPositions);
    seamPositions.push(
      panel.outer3d[0].x,
      panel.outer3d[0].y,
      panel.outer3d[0].z,
      panel.outer3d[2].x,
      panel.outer3d[2].y,
      panel.outer3d[2].z
    );

    panel.holes3d.forEach((hole) => {
      buildLineLoops(hole, accentPositions);
    });

    if (panel.type === "outer" && panel.signature > 0.42) {
      accentPositions.push(
        panel.outer3d[0].x,
        panel.outer3d[0].y,
        panel.outer3d[0].z,
        panel.outer3d[1].x,
        panel.outer3d[1].y,
        panel.outer3d[1].z
      );
    }
  });

  buildLineLoops(geometry.baseCapPoints, seamPositions);

  const seamGeometry = new THREE.BufferGeometry();
  seamGeometry.setAttribute("position", new THREE.Float32BufferAttribute(seamPositions, 3));

  const accentGeometry = new THREE.BufferGeometry();
  accentGeometry.setAttribute("position", new THREE.Float32BufferAttribute(accentPositions, 3));

  return { seamGeometry, accentGeometry };
}

function rebuildThreeModel() {
  if (!threeState.ready || !THREE) {
    return;
  }

  clearThreeModel();

  const geometry = getGeometryData();
  const bowlGroup = threeState.bowlGroup;

  const metalMaterial = new THREE.MeshStandardMaterial({
    color: "#4a4a4a",
    metalness: 0.9,
    roughness: 0.18,
    envMapIntensity: 1.5,
    flatShading: true,
    side: THREE.DoubleSide,
  });

  const accentMaterial = metalMaterial.clone();
  accentMaterial.color = new THREE.Color("#5a5a5a");

  const baseMaterial = metalMaterial.clone();
  baseMaterial.color = new THREE.Color("#3f3f3f");

  const seamMaterial = new THREE.LineBasicMaterial({
    color: 0x1a1a1a,
    transparent: true,
    opacity: 0.42,
  });

  const accentLineMaterial = new THREE.LineBasicMaterial({
    color: 0xc63a32,
    transparent: true,
    opacity: 0.76,
  });

  threeState.modelResources.push(
    metalMaterial,
    accentMaterial,
    baseMaterial,
    seamMaterial,
    accentLineMaterial
  );

  geometry.panels.forEach((panel) => {
    const plateGeometry = createPlanarPlateGeometry(
      panel.localOuter,
      panel.holesLocal,
      panel.plane,
      geometry.plateThickness
    );
    const material =
      panel.type === "base"
        ? baseMaterial
        : panel.signature > 0.42 && panel.type === "outer"
          ? accentMaterial
          : metalMaterial;
    const mesh = new THREE.Mesh(plateGeometry, material);

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    bowlGroup.add(mesh);
    threeState.modelResources.push(plateGeometry);
  });

  const baseCapGeometry = createHorizontalCapGeometry(
    geometry.baseCapPoints,
    geometry.plateThickness * 1.1,
    geometry.baseCapY
  );
  const baseCapMesh = new THREE.Mesh(baseCapGeometry, baseMaterial);
  baseCapMesh.castShadow = true;
  baseCapMesh.receiveShadow = true;
  bowlGroup.add(baseCapMesh);
  threeState.modelResources.push(baseCapGeometry);

  const seams = buildSeamLines(geometry);
  bowlGroup.add(new THREE.LineSegments(seams.seamGeometry, seamMaterial));
  bowlGroup.add(new THREE.LineSegments(seams.accentGeometry, accentLineMaterial));
  threeState.modelResources.push(seams.seamGeometry, seams.accentGeometry);

  const maxRadius = geometry.metrics.openingDiameter / 2;
  threeState.controls.target.set(0, geometry.metrics.bowlHeight * 0.34, 0);
  threeState.controls.minDistance = maxRadius * 1.15;
  threeState.controls.maxDistance = maxRadius * 4.1;
  threeState.camera.position.set(
    maxRadius * 1.72,
    geometry.metrics.bowlHeight * 1.55,
    maxRadius * 1.85
  );
  threeState.controls.update();
}

function initThreeScene() {
  if (!THREE || !OrbitControls || !RoomEnvironment) {
    throw new Error("three.js 模块尚未完成加载。");
  }

  const width = elements.threeView.clientWidth || 720;
  const height = elements.threeView.clientHeight || 520;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 2400);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  const controls = new OrbitControls(camera, renderer.domElement);
  const bowlGroup = new THREE.Group();

  scene.background = new THREE.Color(0xf4f4ef);
  camera.position.set(260, 160, 260);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  elements.threeView.innerHTML = "";
  elements.threeView.appendChild(renderer.domElement);

  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI / 2.02;
  controls.target.set(0, 24, 0);

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const environmentTarget = pmremGenerator.fromScene(new RoomEnvironment(renderer), 0.05);
  scene.environment = environmentTarget.texture;
  pmremGenerator.dispose();

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.24);
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
  const sideLight = new THREE.DirectionalLight(0xffffff, 2.9);
  const rimLight = new THREE.DirectionalLight(0xfff0e9, 1.2);
  const topFillLight = new THREE.DirectionalLight(0xffffff, 0.9);
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(900, 96),
    new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.16 })
  );

  keyLight.position.set(240, 240, 170);
  sideLight.position.set(-300, 110, 110);
  rimLight.position.set(180, 70, -230);
  topFillLight.position.set(0, 260, 0);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.near = 10;
  keyLight.shadow.camera.far = 1800;
  keyLight.shadow.camera.left = -520;
  keyLight.shadow.camera.right = 520;
  keyLight.shadow.camera.top = 520;
  keyLight.shadow.camera.bottom = -520;
  keyLight.shadow.bias = -0.0002;

  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;

  scene.add(ambientLight, keyLight, sideLight, rimLight, topFillLight);
  scene.add(ground);
  scene.add(bowlGroup);

  threeState.ready = true;
  threeState.scene = scene;
  threeState.camera = camera;
  threeState.renderer = renderer;
  threeState.controls = controls;
  threeState.bowlGroup = bowlGroup;
  threeState.environmentTarget = environmentTarget;
}

async function loadThreeModules() {
  const bases = [
    "https://cdn.jsdelivr.net/npm/three@0.160.0",
    "https://unpkg.com/three@0.160.0",
  ];
  let lastError = null;

  for (const base of bases) {
    try {
      const threeModule = await import(`${base}/build/three.module.js`);
      const controlsModule = await import(`${base}/examples/jsm/controls/OrbitControls.js`);
      const environmentModule = await import(`${base}/examples/jsm/environments/RoomEnvironment.js`);

      THREE = threeModule;
      OrbitControls = controlsModule.OrbitControls;
      RoomEnvironment = environmentModule.RoomEnvironment;
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("three.js 模块加载失败。");
}

function resizeThreeScene() {
  if (!threeState.ready) {
    return;
  }

  const width = elements.threeView.clientWidth || 720;
  const height = elements.threeView.clientHeight || 520;
  threeState.camera.aspect = width / height;
  threeState.camera.updateProjectionMatrix();
  threeState.renderer.setSize(width, height);
}

function animateThree() {
  if (!threeState.ready) {
    return;
  }

  const loop = () => {
    threeState.controls.update();
    threeState.renderer.render(threeState.scene, threeState.camera);
    window.requestAnimationFrame(loop);
  };

  loop();
}

function updateMetrics() {
  const geometry = getGeometryData();
  elements.assemblyValue.textContent = `${state.segments} 折面 / ${geometry.metrics.trianglePanels} 三角板`;
  elements.diameterValue.textContent = `${geometry.metrics.openingDiameter} mm`;
  elements.openingValue.textContent = `${geometry.metrics.bowlHeight} mm`;
  elements.frameWidthValue.textContent = `${geometry.metrics.footDiameter} mm / 镂空 ${geometry.metrics.cutoutRatio}%`;
}

function renderAssistantFeed() {
  elements.assistantFeed.innerHTML = assistantMessages
    .map(
      (message) => `
        <article class="assistant-message assistant-message-${message.role}">
          <span class="assistant-message-role">${message.role === "assistant" ? "AI 助手" : "用户需求"}</span>
          <p class="assistant-message-body">${message.text}</p>
        </article>
      `
    )
    .join("");

  elements.assistantFeed.scrollTop = elements.assistantFeed.scrollHeight;
}

function renderAll(statusMessage) {
  currentSvgMarkup = buildTopViewSvg();
  elements.topViewSurface.innerHTML = currentSvgMarkup;
  syncSlidersFromState();
  updateLabels();
  updateMetrics();
  updatePricePanel();
  rebuildThreeModel();

  if (statusMessage) {
    elements.statusLine.textContent = statusMessage;
  }
}

function downloadSvg() {
  const blob = new Blob([currentSvgMarkup], {
    type: "image/svg+xml;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `faceted-metal-bowl-cutout-${state.segments}seg.svg`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function collectDiff(targetState) {
  const diffs = [];
  Object.keys(state).forEach((key) => {
    if (targetState[key] !== state[key]) {
      diffs.push({ key, from: state[key], to: targetState[key] });
    }
  });
  return diffs;
}

function formatDiffLine(diff) {
  const labels = {
    segments: "折面数量",
    opening: "开口比例",
    height: "整体高度",
    tilt: "壁板倾角",
    irregularity: "边缘不规则度",
    thickness: "金属板厚度",
    radius: "整体半径",
    cutoutScale: "镂空比例",
    cutoutSharpness: "镂空尖锐度",
    cutoutBand: "镂空位置",
  };
  const suffixMap = {
    segments: "",
    opening: "x",
    height: " mm",
    tilt: "°",
    irregularity: "",
    thickness: " mm",
    radius: " mm",
    cutoutScale: "%",
    cutoutSharpness: "%",
    cutoutBand: "%",
  };
  return `${labels[diff.key]}：${diff.from}${suffixMap[diff.key]} → ${diff.to}${suffixMap[diff.key]}`;
}

function parseNumberCommand(text, target) {
  const rules = [
    { key: "segments", regex: /(\d+(?:\.\d+)?)\s*(?:边|折面)/i },
    { key: "radius", regex: /(?:半径|radius)\s*[:：]?\s*(\d+(?:\.\d+)?)/i },
    { key: "height", regex: /(?:高度|height)\s*[:：]?\s*(\d+(?:\.\d+)?)/i },
    { key: "thickness", regex: /(?:厚度|thickness)\s*[:：]?\s*(\d+(?:\.\d+)?)/i },
    { key: "tilt", regex: /(?:倾角|tilt)\s*[:：]?\s*(\d+(?:\.\d+)?)/i },
    { key: "irregularity", regex: /(?:不规则度|irregularity)\s*[:：]?\s*(\d+(?:\.\d+)?)/i },
    { key: "cutoutScale", regex: /(?:镂空比例|开孔比例)\s*[:：]?\s*(\d+(?:\.\d+)?)/i },
    { key: "cutoutSharpness", regex: /(?:镂空尖锐度|孔洞尖锐度)\s*[:：]?\s*(\d+(?:\.\d+)?)/i },
    { key: "cutoutBand", regex: /(?:镂空位置|开孔位置)\s*[:：]?\s*(\d+(?:\.\d+)?)/i },
  ];

  rules.forEach((rule) => {
    const match = text.match(rule.regex);
    if (match) {
      target[rule.key] = clampToSlider(rule.key, Number(match[1]));
    }
  });

  const openingMatch = text.match(/(?:开口|opening)\s*[:：]?\s*(\d+(?:\.\d+)?)(x|倍|％|%|)/i);
  if (openingMatch) {
    let value = Number(openingMatch[1]);
    if (openingMatch[2] === "%" || openingMatch[2] === "％") {
      value /= 100;
    }
    target.opening = clampToSlider("opening", value);
  }
}

function containsAny(text, words) {
  return words.some((word) => text.includes(word));
}

function parseDesignPrompt(text) {
  const normalized = text.trim().toLowerCase();
  const target = { ...state };
  const notes = [];
  const bump = (key, delta) => {
    target[key] = clampToSlider(key, target[key] + delta);
  };

  parseNumberCommand(text, target);

  if (containsAny(normalized, ["更锋利", "锋利", "尖锐", "水晶", "crystal", "origami", "凌厉"])) {
    bump("irregularity", 2);
    bump("tilt", 3);
    bump("cutoutSharpness", 12);
    notes.push("增强边缘折线与镂空尖锐度");
  }
  if (containsAny(normalized, ["更柔和", "平缓", "温和"])) {
    bump("irregularity", -2);
    bump("tilt", -3);
    bump("cutoutSharpness", -8);
    notes.push("收敛边缘峰谷，让轮廓更平缓");
  }
  if (containsAny(normalized, ["更浅", "低矮", "更扁", "浅一些"])) {
    bump("height", -10);
    bump("opening", 0.05);
    bump("tilt", -2);
    notes.push("压低整体高度并放大开口");
  }
  if (containsAny(normalized, ["更深", "更高", "更立体", "更有雕塑感"])) {
    bump("height", 12);
    bump("tilt", 4);
    bump("opening", -0.03);
    notes.push("提升碗深与立体感");
  }
  if (containsAny(normalized, ["更大开口", "更开放", "更开阔", "张开"])) {
    bump("opening", 0.08);
    notes.push("增大开口比例");
  }
  if (containsAny(normalized, ["收口", "更聚拢", "更收"])) {
    bump("opening", -0.08);
    notes.push("收紧开口轮廓");
  }
  if (containsAny(normalized, ["更轻", "轻盈", "更薄", "通透"])) {
    bump("thickness", -2);
    bump("cutoutScale", 5);
    notes.push("减薄板厚并增加通透度");
  }
  if (containsAny(normalized, ["更厚", "厚重", "扎实", "更稳", "稳定", "底座稳"])) {
    bump("thickness", 2);
    bump("radius", 4);
    bump("cutoutScale", -4);
    notes.push("加强支撑感并减小开孔");
  }
  if (containsAny(normalized, ["更多折面", "更密", "更复杂", "更碎"])) {
    bump("segments", 4);
    notes.push("增加折面数量");
  }
  if (containsAny(normalized, ["更少折面", "更干净", "更简洁", "更疏"])) {
    bump("segments", -4);
    notes.push("减少折面数量");
  }
  if (containsAny(normalized, ["更大", "放大", "尺度更大"])) {
    bump("radius", 10);
    notes.push("放大整体半径");
  }
  if (containsAny(normalized, ["更小", "更紧凑", "收小"])) {
    bump("radius", -10);
    notes.push("收紧整体尺度");
  }
  if (containsAny(normalized, ["更多镂空", "镂空更大", "开孔更多", "更透空"])) {
    bump("cutoutScale", 7);
    bump("cutoutBand", 2);
    notes.push("增加随机微孔密度");
  }
  if (containsAny(normalized, ["少一点镂空", "减少镂空", "更完整", "更封闭"])) {
    bump("cutoutScale", -8);
    notes.push("减小外壁镂空，提升整体性");
  }
  if (containsAny(normalized, ["镂空更尖", "孔洞更尖", "穿孔更尖"])) {
    bump("cutoutSharpness", 8);
    notes.push("拉长镂空尖角");
  }
  if (containsAny(normalized, ["镂空靠上", "孔洞靠上"])) {
    bump("cutoutBand", -8);
    notes.push("把镂空上移到更靠近外缘的位置");
  }
  if (containsAny(normalized, ["镂空靠下", "孔洞靠下"])) {
    bump("cutoutBand", 8);
    notes.push("把镂空下移到更接近中部的位置");
  }

  return {
    target,
    diffs: collectDiff(target),
    notes,
  };
}

function applyTargetState(target, statusMessage) {
  Object.keys(target).forEach((key) => {
    state[key] = target[key];
  });
  renderAll(statusMessage);
}

function handleAIPrompt() {
  const prompt = elements.aiPrompt.value.trim();
  if (!prompt) {
    assistantMessages.push({
      role: "assistant",
      text: "请先输入你的需求，例如“更锋利、镂空更大、整体更浅，底座更稳”。",
    });
    renderAssistantFeed();
    return;
  }

  assistantMessages.push({ role: "user", text: prompt });
  const result = parseDesignPrompt(prompt);

  if (!result.diffs.length) {
    assistantMessages.push({
      role: "assistant",
      text:
        "这次我没有识别出明确的参数变化。你可以直接说“更锋利”“镂空更大”“半径 150”“高度 60”“折面 24”等更具体的描述。",
    });
    renderAssistantFeed();
    return;
  }

  applyTargetState(
    result.target,
    "AI 已根据你的描述重建模型：镂空、折面轮廓和三维结构同步更新。"
  );

  const lines = result.diffs.map(formatDiffLine);
  const noteLine = result.notes.length ? `\n设计理解：${result.notes.join("；")}` : "";
  assistantMessages.push({
    role: "assistant",
    text: `已根据你的需求生成参数：\n${lines.join("\n")}${noteLine}`,
  });
  renderAssistantFeed();
}

function clearAssistantDialog() {
  assistantMessages.length = 0;
  assistantMessages.push({
    role: "assistant",
    text:
      "对话已清空。继续告诉我你想要的轮廓、镂空或尺寸，我会重新生成一组参数。",
  });
  renderAssistantFeed();
  elements.aiPrompt.value = "";
}

async function bootstrapThreeScene() {
  try {
    elements.statusLine.textContent = "顶视图和参数已加载，正在初始化 three.js 金属预览...";
    await loadThreeModules();
    initThreeScene();
    rebuildThreeModel();
    animateThree();
    elements.statusLine.textContent =
      "当前模型支持结构化镂空与 AI 参数驱动：会在保持果盘完整受力的前提下同步更新顶视图、三维和价格。";
  } catch (error) {
    console.error(error);
    elements.threeView.innerHTML =
      '<div class="three-fallback">three.js 预览未能加载。通常是本地文件直接打开时 CDN 模块没有成功下载。当前顶视图、镂空参数和 AI 输入仍可使用，建议联网后刷新，或通过本地静态服务器打开页面。</div>';
    elements.statusLine.textContent =
      "三维模块加载失败，所以模型窗口暂时为空；顶视图、镂空参数和 AI 需求对话仍可正常使用。";
  }
}

Object.entries(elements.sliders).forEach(([key, slider]) => {
  slider.addEventListener("input", (event) => {
    setStateValue(key, Number(event.currentTarget.value));
    renderAll("参数已更新：镂空轮廓、折面结构和金属高光同步重算。");
  });
});

elements.generateButton.addEventListener("click", () => {
  renderAll("已根据当前参数重新生成高质量折面金属果盘方案。");
});

elements.exportButton.addEventListener("click", () => {
  downloadSvg();
  elements.statusLine.textContent = "已导出当前顶视图 SVG 方案文件。";
});

elements.buyButton.addEventListener("click", () => {
  elements.statusLine.textContent = "当前仍为设计原型界面，暂未接入真实下单与支付流程。";
});

elements.aiApplyButton.addEventListener("click", handleAIPrompt);
elements.aiClearButton.addEventListener("click", clearAssistantDialog);
elements.aiPrompt.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    event.preventDefault();
    handleAIPrompt();
  }
});

window.addEventListener("resize", resizeThreeScene);

renderAssistantFeed();
renderAll("顶视图、镂空参数和 AI 需求对话已经初始化，正在尝试加载三维金属预览。");
bootstrapThreeScene();
