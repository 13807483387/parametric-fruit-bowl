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
  cutoutMode: "micro",
  polygonSides: 6,
  panelLayers: 2,
  cutoutScale: 14,
  cutoutSharpness: 46,
  cutoutBand: 50,
  microHoleShape: "quad",
};

const defaultState = Object.freeze({ ...state });
const STORAGE_KEY = "faceted-metal-bowl-state-v3";
const AI_IMAGE_ENDPOINT = window.__AI_IMAGE_ENDPOINT__ || "http://127.0.0.1:5000/generate-image";

const modeDefinitions = {
  kaleido: {
    label: "???",
    description: "??? / ?????",
  },
  panel: {
    label: "???",
    description: "????????",
  },
  micro: {
    label: "???",
    description: "???????",
  },
};

const microHoleShapeDefinitions = {
  triangle: { label: "???", complexity: 1.04 },
  quad: { label: "???", complexity: 1 },
  pentagon: { label: "???", complexity: 1.08 },
  circle: { label: "??", complexity: 1.02 },
  slot: { label: "????", complexity: 1.14 },
};

const productCardModeLabels = {
  kaleido: "分割型",
  panel: "镂空型",
  micro: "打孔型",
};

const productCardHoleLabels = {
  triangle: "三角形",
  quad: "四边形",
  pentagon: "五边形",
  circle: "圆形",
  slot: "长条放射型",
};

const presetDefinitions = {
  balanced: {
    label: "平衡原型",
    values: { ...defaultState, cutoutMode: "micro", polygonSides: 6 },
  },
  sharp: {
    label: "锋利晶面",
    values: {
      segments: 24,
      opening: 1.12,
      height: 56,
      tilt: 22,
      irregularity: 8,
      thickness: 5,
      radius: 136,
      cutoutMode: "kaleido",
      polygonSides: 7,
      cutoutScale: 16,
      cutoutSharpness: 68,
      cutoutBand: 44,
    },
  },
  airy: {
    label: "轻量通透",
    values: {
      segments: 20,
      opening: 1.18,
      height: 40,
      tilt: 14,
      irregularity: 5,
      thickness: 4,
      radius: 142,
      cutoutMode: "panel",
      polygonSides: 4,
      panelLayers: 3,
      cutoutScale: 22,
      cutoutSharpness: 52,
      cutoutBand: 54,
    },
  },
  sculptural: {
    label: "雕塑深口",
    values: {
      segments: 16,
      opening: 0.94,
      height: 72,
      tilt: 28,
      irregularity: 7,
      thickness: 8,
      radius: 132,
      cutoutMode: "kaleido",
      polygonSides: 8,
      cutoutScale: 10,
      cutoutSharpness: 60,
      cutoutBand: 58,
    },
  },
};

const elements = {
  topViewSurface: document.getElementById("topViewSurface"),
  threeView: document.getElementById("threeView"),
  statusLine: document.getElementById("statusLine"),
  cutoutControlsGroup: document.getElementById("cutoutControlsGroup"),
  panelModeControlsGroup: document.getElementById("panelModeControlsGroup"),
  microHoleShapeGroup: document.getElementById("microHoleShapeGroup"),
  cutoutSharpnessControl: document.getElementById("cutoutSharpnessControl"),
  assemblyValue: document.getElementById("assemblyValue"),
  diameterValue: document.getElementById("diameterValue"),
  openingValue: document.getElementById("openingValue"),
  frameWidthValue: document.getElementById("frameWidthValue"),
  totalPrice: document.getElementById("totalPrice"),
  materialCost: document.getElementById("materialCost"),
  cuttingCost: document.getElementById("cuttingCost"),
  assemblyCost: document.getElementById("assemblyCost"),
  designCost: document.getElementById("designCost"),
  costSubtotal: document.getElementById("costSubtotal"),
  pricingNote: document.getElementById("pricingNote"),
  generateButton: document.getElementById("generateButton"),
  exportButton: document.getElementById("exportButton"),
  exportModelButton: document.getElementById("exportModelButton"),
  buyButton: document.getElementById("buyButton"),
  descriptionButton: document.getElementById("descriptionButton"),
  heroImageButton: document.getElementById("heroImageButton"),
  aiHeroImageCard: document.getElementById("aiHeroImageCard"),
  aiHeroImage: document.getElementById("aiHeroImage"),
  aiHeroPlaceholder: document.getElementById("aiHeroPlaceholder"),
  aiHeroImageStatus: document.getElementById("aiHeroImageStatus"),
  resetButton: document.getElementById("resetButton"),
  copyParamsButton: document.getElementById("copyParamsButton"),
  assistantFeed: document.getElementById("assistantFeed"),
  aiPrompt: document.getElementById("aiPrompt"),
  aiApplyButton: document.getElementById("aiApplyButton"),
  aiClearButton: document.getElementById("aiClearButton"),
  modeButtons: Array.from(document.querySelectorAll(".mode-button")),
  microHoleShapeButtons: Array.from(document.querySelectorAll(".shape-button")),
  summaryChips: document.getElementById("summaryChips"),
  parameterSignature: document.getElementById("parameterSignature"),
  presetButtons: Array.from(document.querySelectorAll(".preset-card")),
  values: {
    segments: document.getElementById("segmentsValue"),
    opening: document.getElementById("openingValueLabel"),
    height: document.getElementById("heightValue"),
    tilt: document.getElementById("tiltValue"),
    irregularity: document.getElementById("irregularityValue"),
    thickness: document.getElementById("thicknessValue"),
    radius: document.getElementById("radiusValue"),
    polygonSides: document.getElementById("polygonSidesValue"),
    panelLayers: document.getElementById("panelLayersValue"),
    cutoutScale: document.getElementById("cutoutScaleValue"),
    cutoutSharpness: document.getElementById("cutoutSharpnessValue"),
    cutoutBand: document.getElementById("cutoutBandValue"),
    microHoleShape: document.getElementById("microHoleShapeValue"),
  },
  sliders: {
    segments: document.getElementById("segments"),
    opening: document.getElementById("opening"),
    height: document.getElementById("height"),
    tilt: document.getElementById("tilt"),
    irregularity: document.getElementById("irregularity"),
    thickness: document.getElementById("thickness"),
    radius: document.getElementById("radius"),
    polygonSides: document.getElementById("polygonSides"),
    panelLayers: document.getElementById("panelLayers"),
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
  ground: null,
  modelResources: [],
  environmentTarget: null,
};

const assistantMessages = [
  {
    role: "assistant",
    text:
      "可以尽量按标准设计指令来描述：方案模式 + 轮廓倾向 + 镂空方式 + 镂空尺度 + 多边形边数 + 尺寸限制。例如：“切换到分割型，做成六边形万花筒拼片，整体更浅，镂空带偏中上，厚度 5 mm，半径 150”。我会把这些要求映射成参数并立即更新模型。",
  },
];

let currentSvgMarkup = "";
let hasHydratedState = false;

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

const manufacturingPricing = Object.freeze({
  stainlessDensityKgM3: 7930,
  materialRateRmbPerKg: 19,
  materialUtilization: {
    kaleido: 0.76,
    panel: 0.8,
    micro: 0.84,
  },
  sheetSetupRmb: 8,
  laserBaseRmb: 14,
  laserRateRmbPerM: 1.6,
  pierceRateRmb: 0.04,
  finishingBaseRmb: 8,
  finishingRateRmbPerM2: 18,
  jointRateRmb: 1.35,
  bendRateRmb: 0.65,
  engineeringBaseRmb: 12,
  engineeringModeRmb: {
    kaleido: 10,
    panel: 8,
    micro: 6,
  },
  markupMultiplier: 5,
  sellingPriceCap: 980,
  visibleSurfaceMultiplier: 1.55,
});

function loopAreaAbs(points) {
  return Math.abs(signedArea2D(points));
}

function loopPerimeter2D(points) {
  let perimeter = 0;
  for (let index = 0; index < points.length; index += 1) {
    const next = points[(index + 1) % points.length];
    perimeter += Math.hypot(next.x - points[index].x, next.y - points[index].y);
  }
  return perimeter;
}

function getBaseCapLoop2D(points3d) {
  return points3d.map((point) => ({
    x: point.x,
    y: point.z,
  }));
}

function calculateManufacturingMetrics(geometry) {
  let netAreaMm2 = 0;
  let cutLengthMm = 0;
  let holeCount = 0;

  geometry.panels.forEach((panel) => {
    netAreaMm2 += loopAreaAbs(panel.localOuter);
    cutLengthMm += loopPerimeter2D(panel.localOuter);

    panel.holesLocal.forEach((hole) => {
      netAreaMm2 -= loopAreaAbs(hole);
      cutLengthMm += loopPerimeter2D(hole);
      holeCount += 1;
    });
  });

  const baseCap2d = getBaseCapLoop2D(geometry.baseCapPoints);
  netAreaMm2 += loopAreaAbs(baseCap2d);
  cutLengthMm += loopPerimeter2D(baseCap2d);

  const netAreaM2 = netAreaMm2 / 1_000_000;
  const thicknessM = geometry.plateThickness / 1000;
  const utilization = manufacturingPricing.materialUtilization[state.cutoutMode] ?? 0.76;
  const netMassKg =
    netAreaM2 * thicknessM * manufacturingPricing.stainlessDensityKgM3;
  const purchasedMassKg = netMassKg / utilization;
  const finishAreaM2 = netAreaM2 * manufacturingPricing.visibleSurfaceMultiplier;
  const cutLengthM = cutLengthMm / 1000;
  const connectorCount = geometry.metrics.connectorCount ?? 0;
  const bendCount =
    state.cutoutMode === "kaleido"
      ? Math.max(connectorCount, Math.round(state.segments * 0.6))
      : state.cutoutMode === "panel"
        ? Math.max(geometry.metrics.panelLayers ?? 1, 1) * Math.round(state.segments * 0.35)
        : Math.round(state.segments * 0.18);
  const jointCount =
    state.cutoutMode === "kaleido"
      ? connectorCount * 2 + Math.round(state.segments * 0.8)
      : state.cutoutMode === "panel"
        ? Math.round(geometry.panels.length * 0.46 + state.panelLayers * state.segments * 0.32)
        : Math.round(geometry.panels.length * 0.28 + holeCount * 0.06 + state.segments * 0.4);

  return {
    netAreaM2,
    netMassKg,
    purchasedMassKg,
    finishAreaM2,
    cutLengthM,
    holeCount,
    connectorCount,
    bendCount,
    jointCount,
  };
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

function setModeValue(value) {
  if (modeDefinitions[value]) {
    state.cutoutMode = value;
  }
}

function setMicroHoleShape(value) {
  if (microHoleShapeDefinitions[value]) {
    state.microHoleShape = value;
  }
}

function getStateSnapshot() {
  return Object.fromEntries(
    Object.keys(state).map((key) => [key, state[key]])
  );
}

function saveStateToStorage() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(getStateSnapshot()));
  } catch (error) {
    console.warn("无法写入本地参数缓存。", error);
  }
}

function restoreStateFromStorage() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return false;
    }

    const parsed = JSON.parse(raw);
    let restored = false;

    Object.keys(state).forEach((key) => {
      if (key === "cutoutMode" && typeof parsed[key] === "string" && modeDefinitions[parsed[key]]) {
        state[key] = parsed[key];
        restored = true;
      } else if (
        key === "microHoleShape" &&
        typeof parsed[key] === "string" &&
        microHoleShapeDefinitions[parsed[key]]
      ) {
        state[key] = parsed[key];
        restored = true;
      } else if (typeof parsed[key] === "number" && Number.isFinite(parsed[key])) {
        state[key] = clampToSlider(key, parsed[key]);
        restored = true;
      }
    });

    return restored;
  } catch (error) {
    console.warn("读取本地参数缓存失败。", error);
    return false;
  }
}

function updateSummaryPanel() {
  if (!elements.summaryChips || !elements.parameterSignature) {
    return;
  }

  elements.summaryChips.innerHTML = getSummaryTokens()
    .map((token) => `<span class="summary-chip">${token}</span>`)
    .join("");
  elements.parameterSignature.textContent = buildParameterSignature();
}

function presetMatchesState(presetValues) {
  return Object.entries(presetValues).every(([key, value]) => state[key] === value);
}

function updatePresetButtons() {
  elements.presetButtons.forEach((button) => {
    const preset = presetDefinitions[button.dataset.preset];
    button.classList.toggle("is-active", Boolean(preset) && presetMatchesState(preset.values));
  });
}

function updateModeButtons() {
  elements.modeButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mode === state.cutoutMode);
  });
}

function updateMicroHoleShapeButtons() {
  elements.microHoleShapeButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.holeShape === state.microHoleShape);
  });
}

function updateModeVisibility() {
  const polygonSlider = elements.sliders.polygonSides;

  if (polygonSlider) {
    if (state.cutoutMode === "panel") {
      polygonSlider.min = "3";
      polygonSlider.max = "4";
      if (state.polygonSides !== 3 && state.polygonSides !== 4) {
        state.polygonSides = state.polygonSides <= 3 ? 3 : 4;
      }
    } else {
      polygonSlider.min = "3";
      polygonSlider.max = "10";
    }
    updateSliderFill(polygonSlider);
  }

  if (elements.cutoutControlsGroup) {
    elements.cutoutControlsGroup.classList.toggle("is-hidden", state.cutoutMode === "kaleido");
  }
  if (elements.panelModeControlsGroup) {
    elements.panelModeControlsGroup.classList.toggle("is-hidden", state.cutoutMode !== "panel");
  }
  if (elements.microHoleShapeGroup) {
    elements.microHoleShapeGroup.classList.toggle("is-hidden", state.cutoutMode !== "micro");
  }
  if (elements.cutoutSharpnessControl) {
    elements.cutoutSharpnessControl.classList.toggle("is-hidden", state.cutoutMode === "micro");
  }
}

function buildParameterSignature() {
  const detailToken =
    state.cutoutMode === "kaleido"
      ? `JOIN ${state.polygonSides}x${clamp(Math.round(state.segments / 4), 2, 7)}`
      : state.cutoutMode === "panel"
        ? `SHAPE ${getEffectivePanelShape()} / LAY ${state.panelLayers} / CUT ${state.cutoutScale}-${state.cutoutSharpness}-${state.cutoutBand}`
      : `SHAPE ${state.microHoleShape.toUpperCase()} / CUT ${state.cutoutScale}-${state.cutoutBand}`;

  return [
    `MODE ${state.cutoutMode.toUpperCase()}`,
    `POLY ${state.polygonSides}`,
    `SEG ${state.segments}`,
    `OPEN ${state.opening.toFixed(2)}x`,
    `H ${state.height}`,
    `TILT ${state.tilt}`,
    `IRR ${state.irregularity}`,
    `THK ${state.thickness}`,
    `RAD ${state.radius}`,
    detailToken,
  ].join(" / ");
}

function getSummaryTokens() {
  const tokens = [modeDefinitions[state.cutoutMode].label];

  if (state.height <= 42) {
    tokens.push("浅盘轮廓");
  } else if (state.height >= 64) {
    tokens.push("深口体量");
  } else {
    tokens.push("平衡碗体");
  }

  if (state.opening >= 1.16) {
    tokens.push("外扩开口");
  } else if (state.opening <= 0.94) {
    tokens.push("内收轮廓");
  } else {
    tokens.push("开口适中");
  }

  if (state.irregularity >= 7) {
    tokens.push("锋利边缘");
  } else if (state.irregularity <= 3) {
    tokens.push("规整折线");
  } else {
    tokens.push("折面起伏");
  }

  if (state.cutoutMode === "kaleido") {
    tokens.push("离散拼板缝隙");
    tokens.push("连接桥拼接");
  } else if (state.cutoutMode === "panel") {
    tokens.push(`${state.panelLayers} 层同形面片`);
  } else {
    tokens.push(`${microHoleShapeDefinitions[state.microHoleShape].label}微孔`);
  }

  if (state.cutoutMode === "micro" && state.cutoutScale >= 20) {
    tokens.push("双孔渐变");
  } else if (state.cutoutMode !== "micro" && state.cutoutScale >= 20) {
    tokens.push("高通透镂空");
  } else if (state.cutoutMode !== "micro" && state.cutoutScale <= 8) {
    tokens.push("低镂空结构");
  } else if (state.cutoutScale >= 20) {
    tokens.push("高通透镂空");
  } else if (state.cutoutScale <= 8) {
    tokens.push("低镂空结构");
  } else {
    tokens.push("微孔镂空");
  }

  if (state.thickness >= 9) {
    tokens.push("厚板金属");
  } else if (state.thickness <= 4) {
    tokens.push("轻薄板件");
  } else {
    tokens.push("中厚金属");
  }

  if (state.cutoutMode === "kaleido") {
    tokens.push(`${state.polygonSides} 边万花筒`);
  } else if (state.cutoutMode === "panel") {
    tokens.push(`${state.polygonSides} 边面片`);
  } else {
    tokens.push(`${state.polygonSides} 边对称分布`);
  }

  return tokens;
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
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
  elements.values.polygonSides.textContent = `${state.polygonSides} 边`;
  elements.values.panelLayers.textContent = `${state.panelLayers} 层`;
  elements.values.cutoutScale.textContent = `${state.cutoutScale}%`;
  elements.values.cutoutSharpness.textContent = `${state.cutoutSharpness}%`;
  elements.values.cutoutBand.textContent = `${state.cutoutBand}%`;
  elements.values.microHoleShape.textContent = microHoleShapeDefinitions[state.microHoleShape].label;
}

function getPricing() {
  const geometry = getGeometryData();
  const metrics = calculateManufacturingMetrics(geometry);
  const microShapeComplexity =
    microHoleShapeDefinitions[state.microHoleShape]?.complexity ?? 1;
  const modeEngineering =
    manufacturingPricing.engineeringModeRmb[state.cutoutMode] ?? 20;
  const mirrorPremium =
    state.cutoutMode === "micro" && state.microHoleShape === "slot" ? 1.08 : 1;

  const materialCost =
    manufacturingPricing.sheetSetupRmb +
    metrics.purchasedMassKg *
      manufacturingPricing.materialRateRmbPerKg *
      mirrorPremium;

  const cuttingCost =
    manufacturingPricing.laserBaseRmb +
    metrics.cutLengthM *
      manufacturingPricing.laserRateRmbPerM *
      (state.cutoutMode === "kaleido" ? 1.08 : state.cutoutMode === "panel" ? 1.04 : microShapeComplexity) +
    metrics.holeCount * manufacturingPricing.pierceRateRmb;

  const assemblyCost =
    manufacturingPricing.finishingBaseRmb +
    metrics.finishAreaM2 *
      manufacturingPricing.finishingRateRmbPerM2 *
      mirrorPremium +
    metrics.jointCount * manufacturingPricing.jointRateRmb +
    metrics.bendCount * manufacturingPricing.bendRateRmb;

  const designCost =
    manufacturingPricing.engineeringBaseRmb +
    modeEngineering +
    state.segments * 0.65 +
    state.irregularity * 2.1 +
    state.cutoutScale * 0.35 +
    (state.cutoutMode === "panel" ? state.panelLayers * 4 : 0) +
    (state.cutoutMode === "micro" ? (microShapeComplexity - 1) * 22 : 0) +
    (state.cutoutMode === "kaleido" ? (geometry.metrics.connectorCount ?? 0) * 0.45 : 0);

  const costSubtotal = materialCost + cuttingCost + assemblyCost + designCost;
  const uncappedTotal = costSubtotal * manufacturingPricing.markupMultiplier;
  const totalPrice = Math.round(
    Math.min(uncappedTotal, manufacturingPricing.sellingPriceCap)
  );
  const effectiveMultiplier =
    costSubtotal <= 0 ? 0 : totalPrice / costSubtotal;

  return {
    materialCost,
    cuttingCost,
    assemblyCost,
    designCost,
    costSubtotal: Math.round(costSubtotal),
    totalPrice,
    effectiveMultiplier,
    manufacturingMetrics: metrics,
  };
}

function updatePricePanel() {
  const pricing = getPricing();
  elements.totalPrice.textContent = formatRmb(pricing.totalPrice);
  elements.materialCost.textContent = formatRmb(pricing.materialCost);
  elements.cuttingCost.textContent = formatRmb(pricing.cuttingCost);
  elements.assemblyCost.textContent = formatRmb(pricing.assemblyCost);
  elements.designCost.textContent = formatRmb(pricing.designCost);
  if (elements.costSubtotal) {
    elements.costSubtotal.textContent = formatRmb(pricing.costSubtotal);
  }
  if (elements.pricingNote) {
    const metrics = pricing.manufacturingMetrics;
    elements.pricingNote.textContent =
      `当前报价按小尺寸 304 不锈钢果盘原型估算：净料约 ${metrics.netMassKg.toFixed(2)} kg，含损耗采购约 ${metrics.purchasedMassKg.toFixed(2)} kg，激光切割总长度约 ${metrics.cutLengthM.toFixed(2)} m；建议售价通常按制造成本约 × ${pricing.effectiveMultiplier.toFixed(1)} 计算，并将最终售价控制在 ￥${manufacturingPricing.sellingPriceCap} 以内。`;
  }
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
  const normalReference = corners[3] ?? corners[2];
  let normal = normalize3(cross3(subtract3(corners[1], origin), subtract3(normalReference, origin)));
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

function centroid2D(points) {
  const total = points.reduce(
    (sum, point) => ({
      x: sum.x + point.x,
      y: sum.y + point.y,
    }),
    { x: 0, y: 0 }
  );

  return {
    x: total.x / points.length,
    y: total.y / points.length,
  };
}

function lerp2D(a, b, ratio) {
  return {
    x: a.x + (b.x - a.x) * ratio,
    y: a.y + (b.y - a.y) * ratio,
  };
}

function getLoopBounds(points) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

function translateLoop(points, dx, dy) {
  return points.map((point) => ({
    x: point.x + dx,
    y: point.y + dy,
  }));
}

function scaleLoop(points, scaleX, scaleY = scaleX, center = centroid2D(points)) {
  return points.map((point) => ({
    x: center.x + (point.x - center.x) * scaleX,
    y: center.y + (point.y - center.y) * scaleY,
  }));
}

function clampLoopToFrame(points, bounds, frame) {
  const loopBounds = getLoopBounds(points);
  let dx = 0;
  let dy = 0;

  if (loopBounds.minX < bounds.minX + frame) {
    dx += bounds.minX + frame - loopBounds.minX;
  }
  if (loopBounds.maxX > bounds.maxX - frame) {
    dx -= loopBounds.maxX - (bounds.maxX - frame);
  }
  if (loopBounds.minY < bounds.minY + frame) {
    dy += bounds.minY + frame - loopBounds.minY;
  }
  if (loopBounds.maxY > bounds.maxY - frame) {
    dy -= loopBounds.maxY - (bounds.maxY - frame);
  }

  return translateLoop(points, dx, dy);
}

function isLoopInsideFrame(points, bounds, frame) {
  const loopBounds = getLoopBounds(points);
  return (
    loopBounds.minX >= bounds.minX + frame &&
    loopBounds.maxX <= bounds.maxX - frame &&
    loopBounds.minY >= bounds.minY + frame &&
    loopBounds.maxY <= bounds.maxY - frame
  );
}

function buildRegularPolygonHole(centerX, centerY, radiusX, radiusY, sides, rotation = 0) {
  return Array.from({ length: sides }, (_, index) => {
    const angle = rotation + (index / sides) * Math.PI * 2;
    return {
      x: centerX + Math.cos(angle) * radiusX,
      y: centerY + Math.sin(angle) * radiusY,
    };
  });
}

function buildShardHole(centerX, centerY, width, height, pinch = 0.34, lean = 0) {
  return [
    { x: centerX + lean * 0.18, y: centerY - height },
    { x: centerX + width * 0.52, y: centerY - height * pinch },
    { x: centerX + width * 0.22, y: centerY + height * 0.38 },
    { x: centerX + lean * 0.08, y: centerY + height },
    { x: centerX - width * 0.22, y: centerY + height * 0.46 },
    { x: centerX - width * 0.52, y: centerY - height * (pinch - 0.08) },
  ];
}

function buildMicroHole(centerX, centerY, radiusX, radiusY, sharpness, rotation) {
  return buildRegularPolygonHole(
    centerX,
    centerY,
    radiusX * (0.92 - sharpness * 0.08),
    radiusY * (1.02 + sharpness * 0.22),
    sharpness > 0.5 ? 5 : 4,
    rotation
  );
}

function rotateLoop(points, centerX, centerY, rotation) {
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);
  return points.map((point) => {
    const dx = point.x - centerX;
    const dy = point.y - centerY;
    return {
      x: centerX + dx * cosine - dy * sine,
      y: centerY + dx * sine + dy * cosine,
    };
  });
}

function buildCircularHole(centerX, centerY, radiusX, radiusY) {
  return buildRegularPolygonHole(centerX, centerY, radiusX, radiusY, 16, 0);
}

function buildSlotHole(centerX, centerY, width, length, rotation = 0) {
  const halfWidth = width / 2;
  const halfLength = length / 2;
  const cap = halfWidth * 0.88;
  const loop = [
    { x: centerX - halfWidth, y: centerY - halfLength + cap },
    { x: centerX - halfWidth * 0.48, y: centerY - halfLength },
    { x: centerX + halfWidth * 0.48, y: centerY - halfLength },
    { x: centerX + halfWidth, y: centerY - halfLength + cap },
    { x: centerX + halfWidth, y: centerY + halfLength - cap },
    { x: centerX + halfWidth * 0.48, y: centerY + halfLength },
    { x: centerX - halfWidth * 0.48, y: centerY + halfLength },
    { x: centerX - halfWidth, y: centerY + halfLength - cap },
  ];

  return rotateLoop(loop, centerX, centerY, rotation);
}

function buildMicroShapeHole(shape, centerX, centerY, radiusX, radiusY, rotation = 0) {
  switch (shape) {
    case "triangle":
      return buildRegularPolygonHole(centerX, centerY, radiusX * 0.96, radiusY * 1.06, 3, rotation - Math.PI / 2);
    case "pentagon":
      return buildRegularPolygonHole(centerX, centerY, radiusX * 0.94, radiusY * 1.02, 5, rotation - Math.PI / 2);
    case "circle":
      return buildCircularHole(centerX, centerY, radiusX * 0.94, radiusY * 0.94);
    case "slot":
      return buildSlotHole(centerX, centerY, radiusX * 1.12, radiusY * 2.1, rotation);
    case "quad":
    default:
      return buildRegularPolygonHole(centerX, centerY, radiusX, radiusY, 4, rotation + Math.PI / 4);
  }
}

function loopsOverlap(loopA, loopB, gap = 0) {
  const boundsA = getLoopBounds(loopA);
  const boundsB = getLoopBounds(loopB);
  return !(
    boundsA.maxX + gap < boundsB.minX ||
    boundsA.minX - gap > boundsB.maxX ||
    boundsA.maxY + gap < boundsB.minY ||
    boundsA.minY - gap > boundsB.maxY
  );
}

function pushFittedHole(target, hole, bounds, frame, gap = 0) {
  const fitted = clampLoopToFrame(hole, bounds, frame);
  if (
    isLoopInsideFrame(fitted, bounds, frame) &&
    target.every((existingHole) => !loopsOverlap(existingHole, fitted, gap))
  ) {
    target.push(ensureWinding(fitted, true));
  }
}

function getRegularPolygonRadiusFactor(angle, sides) {
  const step = (Math.PI * 2) / Math.max(3, sides);
  const normalized = ((angle + step * 0.5) % step + step) % step - step * 0.5;
  return Math.cos(Math.PI / Math.max(3, sides)) / Math.max(0.18, Math.cos(normalized));
}

function buildMicroModeRings(count) {
  const symmetry = clamp(Math.round(state.polygonSides), 3, 10);
  const irregularityRatio = state.irregularity / 10;
  const tiltRatio = Math.sin(toRadians(state.tilt));
  const plateThickness = Math.max(1.5, state.thickness * 0.72);

  const rimBaseRadius = state.radius * state.opening;
  const upperBaseRadius = state.radius * (0.84 + state.opening * 0.04 - tiltRatio * 0.04);
  const lowerBaseRadius = state.radius * (0.58 + state.opening * 0.025 - tiltRatio * 0.015);
  const baseBaseRadius = state.radius * (0.3 + state.opening * 0.01 - irregularityRatio * 0.01);

  const rimY = state.height + plateThickness * 0.72;
  const upperY = state.height * 0.67 + plateThickness * 0.44;
  const lowerY = Math.max(plateThickness * 1.02, state.height * 0.28);
  const baseY = Math.max(plateThickness * 0.26, state.height * 0.02);
  const step = (Math.PI * 2) / count;
  const polygonInradius = Math.cos(Math.PI / symmetry);

  const buildRing = (radiusBase, yBase, radiusStrength, yStrength, phase = 0) => {
    const points = [];
    const signatures = [];

    for (let index = 0; index < count; index += 1) {
      const angle = -Math.PI / 2 + index * step;
      const signature = getSignature(index, count);
      const polygonFactor = getRegularPolygonRadiusFactor(angle + phase, symmetry);
      const polygonPeak =
        (polygonFactor - polygonInradius) / Math.max(0.0001, 1 - polygonInradius);
      const ridge = polygonPeak - 0.5;
      const microWave = Math.sin((angle + phase) * symmetry * 2) * 0.5;
      const radius =
        radiusBase *
        polygonFactor *
        (1 +
          ridge * radiusStrength * 0.22 +
          microWave * radiusStrength * 0.1 +
          signature * (0.012 + irregularityRatio * 0.018));
      const y = yBase + ridge * yStrength + signature * yStrength * 0.22;

      points.push(createPoint(radius, y, angle));
      signatures.push(signature);
    }

    return { points, signatures };
  };

  const rim = buildRing(
    count ? rimBaseRadius : 0,
    rimY,
    0.18 + irregularityRatio * 0.08,
    state.height * 0.12
  );
  const upper = buildRing(
    upperBaseRadius,
    upperY,
    0.12 + irregularityRatio * 0.06,
    state.height * 0.08,
    step * 0.12
  );
  const lower = buildRing(
    lowerBaseRadius,
    lowerY,
    0.08 + irregularityRatio * 0.04,
    state.height * 0.038,
    step * 0.08
  );
  const base = buildRing(
    baseBaseRadius,
    baseY,
    0.04 + irregularityRatio * 0.02,
    plateThickness * 0.08
  );

  return {
    count,
    step,
    plateThickness,
    rim: rim.points,
    upper: upper.points,
    lower: lower.points,
    base: base.points,
    signatures: rim.signatures,
    rimY,
    baseY,
    footDiameter: Math.round(baseBaseRadius * 2.16),
  };
}

function getEffectivePanelShape() {
  return state.polygonSides <= 3 ? 3 : 4;
}

function buildPanelTriangleSplit(baseQuad, useForwardDiagonal) {
  return useForwardDiagonal
    ? [
        [baseQuad[0], baseQuad[1], baseQuad[2]],
        [baseQuad[0], baseQuad[2], baseQuad[3]],
      ]
    : [
        [baseQuad[0], baseQuad[1], baseQuad[3]],
        [baseQuad[1], baseQuad[2], baseQuad[3]],
      ];
}

function buildLayeredInsetCutouts(panel, panelType, index, plateThickness) {
  if (state.cutoutScale <= 0 || panelType === "base") {
    return [];
  }

  const bounds = getPanelBounds(panel);
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const sizeLimit = Math.min(width, height);
  const frame = Math.max(plateThickness * 2.5, sizeLimit * 0.14, 5.8);
  if (width <= frame * 2.2 || height <= frame * 2.2) {
    return [];
  }

  const panelShape = panel.localOuter.length <= 3 ? 3 : 4;
  const panelMultiplier = panelShape === 3 ? 2 : 1;
  const layerCount = Math.max(1, state.panelLayers);
  const layerIndex = Math.floor(index / Math.max(1, state.segments * panelMultiplier));
  const layerRatio = layerCount > 1 ? layerIndex / (layerCount - 1) : 0.5;
  const bandTarget = clamp((state.cutoutBand - 36) / 28, 0, 1);
  const focus = 1 - Math.min(1, Math.abs(layerRatio - bandTarget) * 1.3);
  const sharpnessRatio = (state.cutoutSharpness - 24) / 52;
  const wave = 0.5 + 0.5 * Math.sin((index / Math.max(1, state.segments * panelMultiplier)) * Math.PI * 2);
  const holeCount =
    state.cutoutScale >= (panelShape === 3 ? 22 : 16) && sizeLimit > frame * (panelShape === 3 ? 3.8 : 3.2)
      ? 2
      : 1;
  const baseScale = clamp(
    (panelShape === 3 ? 0.24 : 0.2) + (state.cutoutScale / 32) * (panelShape === 3 ? 0.28 : 0.34),
    0.18,
    panelShape === 3 ? 0.48 : 0.62
  );
  const holeScale = holeCount === 2 ? baseScale * (panelShape === 3 ? 0.72 : 0.62) : baseScale;
  const travel = (height - frame * 2) * (panelShape === 3 ? 0.18 : 0.22);
  const positions =
    holeCount === 2
      ? [-0.42 + bandTarget * 0.16 + (wave - 0.5) * 0.08, 0.28 + bandTarget * 0.16 + (wave - 0.5) * 0.08]
      : [(bandTarget - 0.5) * 0.28];
  const holes = [];

  positions.forEach((position) => {
    let hole = scaleLoop(
      panel.localOuter,
      holeScale * (0.98 - sharpnessRatio * 0.05),
      holeScale * (1.02 + sharpnessRatio * 0.12)
    );
    hole = translateLoop(hole, 0, position * travel + (layerRatio - 0.5) * travel * 0.18);
    hole = clampLoopToFrame(hole, bounds, frame);
    if (isLoopInsideFrame(hole, bounds, frame)) {
      holes.push(ensureWinding(hole, true));
    }
  });

  return holes;
}

function lerp3(a, b, ratio) {
  return {
    x: a.x + (b.x - a.x) * ratio,
    y: a.y + (b.y - a.y) * ratio,
    z: a.z + (b.z - a.z) * ratio,
  };
}

function add3(a, b) {
  return {
    x: a.x + b.x,
    y: a.y + b.y,
    z: a.z + b.z,
  };
}

function multiply3(vector, scalar) {
  return {
    x: vector.x * scalar,
    y: vector.y * scalar,
    z: vector.z * scalar,
  };
}

function midpoint3(a, b) {
  return multiply3(add3(a, b), 0.5);
}

function average3(points) {
  const total = points.reduce(
    (sum, point) => ({
      x: sum.x + point.x,
      y: sum.y + point.y,
      z: sum.z + point.z,
    }),
    { x: 0, y: 0, z: 0 }
  );

  return multiply3(total, 1 / Math.max(1, points.length));
}

function vectorLength3(vector) {
  return Math.hypot(vector.x, vector.y, vector.z);
}

function buildPolygonRing(sideCount, radiusBase, yBase, phase, bandIndex, bandCount) {
  const points = [];
  const signatures = [];
  const step = (Math.PI * 2) / sideCount;
  const irregularityRatio = state.irregularity / 10;

  for (let side = 0; side < sideCount; side += 1) {
    const signature = getSignature(side + bandIndex * sideCount, sideCount * Math.max(2, bandCount + 1));
    const angle = -Math.PI / 2 + side * step + phase;
    const sideRatio = side / sideCount;
    const harmonic =
      Math.sin(sideRatio * Math.PI * 2 * 2 + bandIndex * 0.54) * 0.58 +
      Math.cos(sideRatio * Math.PI * 2 * 3 - bandIndex * 0.38) * 0.42;
    const radius =
      radiusBase *
      (1 + harmonic * irregularityRatio * (bandIndex === 0 ? 0.1 : 0.045) + signature * 0.024);
    const y =
      yBase + signature * state.height * (0.014 + irregularityRatio * 0.01) * (1 - bandIndex / Math.max(1, bandCount + 1));

    points.push(createPoint(radius, y, angle));
    signatures.push(signature);
  }

  return { points, signatures };
}

function createSeparatedPanelRecord(type, corners, signature, index, plateThickness, shrinkRatio) {
  const sourcePanel = buildFacetPanelFromCorners(corners);
  const center = centroid2D(sourcePanel.localOuter);
  const shrunkCorners = sourcePanel.localOuter.map((point) =>
    sourcePanel.plane.toWorld(
      center.x + (point.x - center.x) * shrinkRatio,
      center.y + (point.y - center.y) * shrinkRatio
    )
  );

  return createPanelRecord(type, shrunkCorners, signature, null, index, plateThickness);
}

function getPanelEdge(panel, startIndex, endIndex) {
  return [panel.outer3d[startIndex], panel.outer3d[endIndex]];
}

function createEdgeBridgeRecord(type, edgeA, edgeB, signature, index, plateThickness, coverage = 0.5) {
  const trimRatio = clamp(coverage, 0.18, 0.92);
  const aMid = midpoint3(edgeA[0], edgeA[1]);
  const bMid = midpoint3(edgeB[0], edgeB[1]);
  const aStart = lerp3(aMid, edgeA[0], trimRatio);
  const aEnd = lerp3(aMid, edgeA[1], trimRatio);
  const bStart = lerp3(bMid, edgeB[0], trimRatio);
  const bEnd = lerp3(bMid, edgeB[1], trimRatio);

  if (
    vectorLength3(subtract3(aStart, aEnd)) < plateThickness * 1.1 ||
    vectorLength3(subtract3(bStart, bEnd)) < plateThickness * 1.1
  ) {
    return null;
  }

  return createPanelRecord(
    type,
    [aStart, aEnd, bEnd, bStart],
    signature,
    null,
    index,
    plateThickness * 0.72
  );
}

function createStrapPanelRecord(
  type,
  start,
  end,
  reference,
  signature,
  index,
  plateThickness,
  width,
  shortenRatio = 1
) {
  const center = midpoint3(start, end);
  const axisStart = shortenRatio < 1 ? lerp3(center, start, shortenRatio) : start;
  const axisEnd = shortenRatio < 1 ? lerp3(center, end, shortenRatio) : end;
  const axisVector = subtract3(axisEnd, axisStart);
  const axisLength = vectorLength3(axisVector);
  if (axisLength < plateThickness * 1.4) {
    return null;
  }

  const axis = normalize3(axisVector);
  let normal = normalize3(cross3(axis, subtract3(reference, center)));
  if (vectorLength3(normal) < 0.001) {
    normal = { x: 0, y: 1, z: 0 };
  }

  let across = normalize3(cross3(normal, axis));
  if (vectorLength3(across) < 0.001) {
    across = { x: 0, y: 0, z: 1 };
  }

  const halfWidth = width / 2;
  const corners = [
    add3(axisStart, multiply3(across, -halfWidth)),
    add3(axisEnd, multiply3(across, -halfWidth)),
    add3(axisEnd, multiply3(across, halfWidth)),
    add3(axisStart, multiply3(across, halfWidth)),
  ];

  return createPanelRecord(type, corners, signature, null, index, plateThickness * 0.82);
}

function buildRingPoints(count, radiusBase, yBase, radiusJitter, yJitter) {
  const points = [];
  const signatures = [];
  const step = (Math.PI * 2) / count;

  for (let index = 0; index < count; index += 1) {
    const signature = getSignature(index, count);
    const angle = -Math.PI / 2 + index * step;
    points.push(
      createPoint(
        radiusBase * (1 + signature * radiusJitter),
        yBase + signature * yJitter,
        angle
      )
    );
    signatures.push(signature);
  }

  return { points, signatures };
}

function buildCommonRings(count) {
  const irregularityRatio = state.irregularity / 10;
  const tiltRatio = Math.sin(toRadians(state.tilt));
  const plateThickness = Math.max(1.5, state.thickness * 0.72);

  const rimBaseRadius = state.radius * state.opening;
  const upperBaseRadius =
    state.radius * (0.82 + state.opening * 0.05 - tiltRatio * 0.05);
  const lowerBaseRadius =
    state.radius * (0.56 + state.opening * 0.03 - tiltRatio * 0.02);
  const baseBaseRadius =
    state.radius * (0.28 + state.opening * 0.015 - irregularityRatio * 0.012);

  const rimY = state.height + plateThickness * 0.72;
  const upperY = state.height * 0.68 + plateThickness * 0.46;
  const lowerY = Math.max(plateThickness * 1.05, state.height * 0.3);
  const baseY = Math.max(0, plateThickness * 0.24);

  const rim = buildRingPoints(
    count,
    rimBaseRadius,
    rimY,
    0.02 + irregularityRatio * 0.12,
    state.height * irregularityRatio * 0.1
  );
  const upper = buildRingPoints(
    count,
    upperBaseRadius,
    upperY,
    0.014 + irregularityRatio * 0.06,
    state.height * irregularityRatio * 0.05
  );
  const lower = buildRingPoints(
    count,
    lowerBaseRadius,
    lowerY,
    0.01 + irregularityRatio * 0.04,
    state.height * irregularityRatio * 0.02
  );
  const base = buildRingPoints(
    count,
    baseBaseRadius,
    baseY,
    0.008 + irregularityRatio * 0.015,
    plateThickness * 0.08
  );

  return {
    count,
    step: (Math.PI * 2) / count,
    plateThickness,
    rim: rim.points,
    upper: upper.points,
    lower: lower.points,
    base: base.points,
    signatures: rim.signatures,
    rimY,
    baseY,
    footDiameter: Math.round(baseBaseRadius * 2.2),
  };
}

function createPanelRecord(type, corners, signature, holeBuilder, index, plateThickness) {
  const panel = buildFacetPanelFromCorners(corners);
  const holesLocal = holeBuilder ? holeBuilder(panel, type, index, plateThickness) : [];
  return {
    type,
    signature,
    ...panel,
    holesLocal,
    holes3d: holesLocal.map((hole) =>
      hole.map((point) => panel.plane.toWorld(point.x, point.y))
    ),
  };
}

function buildSimilarInsetCutouts(panel, panelType, _index, plateThickness) {
  if (state.cutoutScale <= 0 || panelType === "base") {
    return [];
  }

  const bounds = getPanelBounds(panel);
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const sizeLimit = Math.min(width, height);
  const frame = Math.max(plateThickness * 2.8, sizeLimit * 0.16, 7);
  if (width <= frame * 2.25 || height <= frame * 2.25) {
    return [];
  }

  const scaleRatio = clamp(0.22 + (state.cutoutScale / 32) * 0.48, 0.18, 0.78);
  const sharpnessRatio = (state.cutoutSharpness - 24) / 52;
  const bandTarget = clamp((state.cutoutBand - 36) / 28, 0, 1);
  const shiftY = (bandTarget - 0.5) * (height - frame * 2) * 0.34;

  let hole = scaleLoop(
    panel.localOuter,
    scaleRatio * (0.98 - sharpnessRatio * 0.08),
    scaleRatio * (1.02 + sharpnessRatio * 0.18)
  );
  hole = translateLoop(hole, 0, shiftY);
  hole = clampLoopToFrame(hole, bounds, frame);

  if (!isLoopInsideFrame(hole, bounds, frame)) {
    return [];
  }

  return [ensureWinding(hole, true)];
}

function buildGradientMicroCutouts(panel, panelType, index, plateThickness) {
  if (state.cutoutScale <= 0 || panelType === "base") {
    return [];
  }

  const bounds = getPanelBounds(panel);
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const sizeLimit = Math.min(width, height);
  const frame = Math.max(plateThickness * 2.4, sizeLimit * 0.17, 6.2);
  if (width <= frame * 2.4 || height <= frame * 2.4) {
    return [];
  }

  const densityRatio = state.cutoutScale / 32;
  const bandTarget = clamp((state.cutoutBand - 36) / 28, 0, 1);
  const symmetry = clamp(Math.round(state.polygonSides), 3, 10);
  const segmentIndex = index % Math.max(1, state.segments);
  const segmentRatio = segmentIndex / Math.max(1, state.segments);
  const angle = -Math.PI / 2 + segmentRatio * Math.PI * 2;
  const polygonInradius = Math.cos(Math.PI / symmetry);
  const polygonFactor = getRegularPolygonRadiusFactor(angle, symmetry);
  const polygonPeak =
    (polygonFactor - polygonInradius) / Math.max(0.0001, 1 - polygonInradius);
  const alternation = segmentIndex % 2 === 0 ? 0.08 : -0.04;
  const panelBias = {
    outer: 0.18,
    mid: 0.1,
    lower: 0.03,
  }[panelType] ?? 0.08;
  const threshold = {
    outer: 0.58,
    mid: 0.68,
    lower: 0.8,
  }[panelType] ?? 0.72;
  const activation = densityRatio * 0.78 + polygonPeak * 0.28 + panelBias + alternation;

  if (activation < threshold) {
    return [];
  }

  const availableWidth = width - frame * 2;
  const availableHeight = height - frame * 2;
  const activeShape = state.microHoleShape;
  const bandBase =
    panelType === "outer"
      ? 0.14 + bandTarget * 0.5
      : panelType === "mid"
        ? 0.18 + bandTarget * 0.48
        : 0.24 + bandTarget * 0.4;
  const centerYBase = clamp(
    bandBase + (polygonPeak - 0.5) * (panelType === "outer" ? 0.1 : 0.06),
    0.2,
    0.8
  );
  const canDouble =
    densityRatio >= (panelType === "outer" ? 0.42 : panelType === "mid" ? 0.62 : 0.82) &&
    width > frame * 3.6;
  const holeCount =
    activeShape === "slot"
      ? canDouble && panelType === "outer" && densityRatio >= 0.68
        ? 2
        : 1
      : canDouble
        ? 2
        : 1;
  const lateralSwing = (polygonPeak - 0.5) * 0.18 + alternation * 0.24;
  const positions =
    holeCount === 2
      ? [
          { x: 0.34 - lateralSwing * 0.4, y: centerYBase - 0.12 },
          { x: 0.66 + lateralSwing * 0.4, y: centerYBase + 0.12 },
        ]
      : [{ x: 0.5 + lateralSwing, y: centerYBase }];

  const sizeMap = {
    triangle: { x: 0.16, y: 0.18 },
    quad: { x: 0.15, y: 0.17 },
    pentagon: { x: 0.155, y: 0.17 },
    circle: { x: 0.135, y: 0.135 },
    slot: { x: 0.07, y: 0.22 },
  };
  const shapeSize = sizeMap[activeShape] ?? sizeMap.quad;
  const sizeMultiplier = holeCount === 2 ? 0.76 : 1;
  const rotation =
    activeShape === "slot"
      ? 0
      : activeShape === "quad"
        ? Math.PI / 4
        : activeShape === "circle"
          ? 0
          : -Math.PI / 2;
  const gap = Math.max(frame * 0.3, sizeLimit * (activeShape === "slot" ? 0.1 : 0.075));
  const holes = [];

  positions.forEach((position) => {
    const xRatio = clamp(position.x, 0.22, 0.78);
    const yRatio = clamp(position.y, 0.18, 0.82);
    const centerX = bounds.minX + frame + availableWidth * xRatio;
    const centerY = bounds.minY + frame + availableHeight * yRatio;
    const radiusX =
      sizeLimit *
      shapeSize.x *
      sizeMultiplier *
      (0.88 + densityRatio * 0.44 + (panelType === "outer" ? 0.06 : -0.02));
    const radiusY =
      sizeLimit *
      shapeSize.y *
      sizeMultiplier *
      (0.84 + densityRatio * 0.4 + (panelType === "outer" ? 0.04 : 0));

    pushFittedHole(
      holes,
      buildMicroShapeHole(activeShape, centerX, centerY, radiusX, radiusY, rotation),
      bounds,
      frame,
      gap
    );
  });

  return holes;
}

function buildModeKaleidoGeometry() {
  const sideCount = clamp(Math.round(state.polygonSides), 3, 12);
  const radialBands = clamp(Math.round(state.segments / 4), 2, 7);
  const plateThickness = Math.max(1.8, state.thickness * 0.76);
  const irregularityRatio = state.irregularity / 10;
  const tiltRatio = Math.sin(toRadians(state.tilt));
  const panels = [];
  const signatures = [];
  const panelShrink = clamp(0.82 - state.thickness * 0.005 - irregularityRatio * 0.06, 0.72, 0.84);
  const connectorWidth = Math.max(plateThickness * 1.45, state.radius * 0.022);
  const step = (Math.PI * 2) / sideCount;

  const rimRadius = state.radius * state.opening;
  const supportRadius =
    state.radius * clamp(0.3 + state.opening * 0.04 - tiltRatio * 0.08, 0.24, 0.42);
  const baseRadius = supportRadius * 0.58;
  const rimY = state.height + plateThickness * 0.46;
  const supportY = Math.max(plateThickness * 1.3, state.height * 0.14);
  const baseY = Math.max(plateThickness * 0.42, state.height * 0.02);

  const rings = [];

  for (let band = 0; band <= radialBands; band += 1) {
    const ratio = band / radialBands;
    const radius = rimRadius + (supportRadius - rimRadius) * Math.pow(ratio, 0.86);
    const y = rimY + (supportY - rimY) * Math.pow(ratio, 1.08);
    const phase =
      sideCount === 3 ? 0 : band % 2 === 0 ? 0 : step * (0.22 + irregularityRatio * 0.08);
    const ring = buildPolygonRing(sideCount, radius, y, phase, band, radialBands);
    rings.push(ring.points);
    signatures.push(...ring.signatures);
  }

  const baseRing = buildPolygonRing(sideCount, baseRadius, baseY, 0, radialBands + 1, radialBands + 1).points;
  const cellMap = Array.from({ length: radialBands }, () => Array.from({ length: sideCount }, () => null));
  let connectorCount = 0;
  let plateCount = 0;

  for (let band = 0; band < radialBands; band += 1) {
    const outerRing = rings[band];
    const innerRing = rings[band + 1];

    for (let side = 0; side < sideCount; side += 1) {
      const next = (side + 1) % sideCount;
      const a = outerRing[side];
      const b = outerRing[next];
      const c = innerRing[next];
      const d = innerRing[side];
      const signature = getSignature(side + band * sideCount, sideCount * radialBands);
      if (sideCount === 3) {
        const quadPanel = createSeparatedPanelRecord(
          "panel",
          [a, b, c, d],
          signature,
          plateCount,
          plateThickness,
          clamp(panelShrink + 0.05, 0.78, 0.88)
        );
        panels.push(quadPanel);
        cellMap[band][side] = {
          kind: "quad",
          outerPanel: quadPanel,
          outerEdge: [0, 1],
          innerPanel: quadPanel,
          innerEdge: [3, 2],
          leftPanel: quadPanel,
          leftEdge: [0, 3],
          rightPanel: quadPanel,
          rightEdge: [1, 2],
        };
        plateCount += 1;
      } else {
        const useForwardDiagonal = (band + side) % 2 === 0;
        const triangleA = useForwardDiagonal ? [a, b, c] : [a, b, d];
        const triangleB = useForwardDiagonal ? [a, c, d] : [b, c, d];

        const panelA = createSeparatedPanelRecord(
          "panel",
          triangleA,
          signature,
          plateCount,
          plateThickness,
          panelShrink
        );
        plateCount += 1;

        const panelB = createSeparatedPanelRecord(
          "panel",
          triangleB,
          signature * 0.92,
          plateCount,
          plateThickness,
          panelShrink
        );
        plateCount += 1;

        panels.push(panelA, panelB);
        cellMap[band][side] = {
          kind: "split",
          outerPanel: panelA,
          outerEdge: [0, 1],
          innerPanel: panelB,
          innerEdge: [2, 1],
          leftPanel: useForwardDiagonal ? panelB : panelA,
          leftEdge: [0, 2],
          rightPanel: useForwardDiagonal ? panelA : panelB,
          rightEdge: useForwardDiagonal ? [1, 2] : [0, 1],
          diagPanelA: panelA,
          diagEdgeA: useForwardDiagonal ? [0, 2] : [1, 2],
          diagPanelB: panelB,
          diagEdgeB: useForwardDiagonal ? [0, 1] : [0, 2],
        };
      }
    }
  }

  for (let band = 0; band < radialBands; band += 1) {
    for (let side = 0; side < sideCount; side += 1) {
      const next = (side + 1) % sideCount;
      const currentCell = cellMap[band][side];
      const nextCell = cellMap[band][next];
      const bandSignature = getSignature(side + band * sideCount, sideCount * radialBands);

      if (currentCell.kind === "split") {
        const diagonalConnector = createEdgeBridgeRecord(
          "connector",
          getPanelEdge(currentCell.diagPanelA, currentCell.diagEdgeA[0], currentCell.diagEdgeA[1]),
          getPanelEdge(currentCell.diagPanelB, currentCell.diagEdgeB[0], currentCell.diagEdgeB[1]),
          bandSignature,
          10000 + connectorCount,
          plateThickness,
          0.46
        );
        if (diagonalConnector) {
          panels.push(diagonalConnector);
          connectorCount += 1;
        }
      }

      const spokeConnector = createEdgeBridgeRecord(
        "connector",
        getPanelEdge(currentCell.rightPanel, currentCell.rightEdge[0], currentCell.rightEdge[1]),
        getPanelEdge(nextCell.leftPanel, nextCell.leftEdge[0], nextCell.leftEdge[1]),
        bandSignature * 0.92,
        10000 + connectorCount,
        plateThickness,
        0.42
      );
      if (spokeConnector) {
        panels.push(spokeConnector);
        connectorCount += 1;
      }

      if (band < radialBands - 1) {
        const innerCell = cellMap[band + 1][side];
        const ringConnector = createEdgeBridgeRecord(
          "connector",
          getPanelEdge(currentCell.innerPanel, currentCell.innerEdge[0], currentCell.innerEdge[1]),
          getPanelEdge(innerCell.outerPanel, innerCell.outerEdge[0], innerCell.outerEdge[1]),
          bandSignature * 0.88,
          10000 + connectorCount,
          plateThickness,
          0.5
        );
        if (ringConnector) {
          panels.push(ringConnector);
          connectorCount += 1;
        }
      } else {
        const baseConnector = createEdgeBridgeRecord(
          "connector",
          getPanelEdge(currentCell.innerPanel, currentCell.innerEdge[0], currentCell.innerEdge[1]),
          [baseRing[side], baseRing[next]],
          bandSignature * 0.84,
          10000 + connectorCount,
          plateThickness,
          0.56
        );
        if (baseConnector) {
          panels.push(baseConnector);
          connectorCount += 1;
        }
      }
    }
  }

  return {
    segments: radialBands,
    step,
    plateThickness,
    signatures,
    panels,
    baseCapPoints: baseRing.map((point) => ({ ...point })),
    baseCapY: baseY,
    metrics: {
      openingDiameter: Math.round(Math.max(...rings[0].map((point) => Math.hypot(point.x, point.z))) * 2),
      bowlHeight: Math.round(rimY),
      footDiameter: Math.round(baseRadius * 2.12),
      trianglePanels: plateCount,
      connectorCount,
      cutoutRatio: connectorCount,
    },
  };
}

function buildModePanelGeometry() {
  const count = state.segments;
  const layerCount = Math.max(1, state.panelLayers);
  const plateThickness = Math.max(1.6, state.thickness * 0.72);
  const step = (Math.PI * 2) / count;
  const tiltRatio = Math.sin(toRadians(state.tilt));
  const panelShape = getEffectivePanelShape();
  const rings = [];
  const signatures = [];
  const panels = [];

  const rimRadius = state.radius * state.opening;
  const supportRadius =
    state.radius * clamp(0.3 + state.opening * 0.04 - tiltRatio * 0.08, 0.22, 0.44);
  const rimY = state.height + plateThickness * 0.56;
  const baseY = Math.max(plateThickness * 0.36, state.height * 0.03);

  for (let layer = 0; layer <= layerCount; layer += 1) {
    const ratio = layer / layerCount;
    const radius = rimRadius + (supportRadius - rimRadius) * Math.pow(ratio, 0.9);
    const y = rimY + (baseY - rimY) * Math.pow(ratio, 1.08);
    const phase =
      panelShape === 3
        ? step * 0.5 * (layer % 2)
        : layer === 0
          ? 0
          : step * 0.18 * (layer % 2 === 0 ? 1 : -1);
    const ring = buildPolygonRing(count, radius, y, phase, layer, layerCount + 1);
    rings.push(ring.points);
    signatures.push(...ring.signatures);
  }

  for (let layer = 0; layer < layerCount; layer += 1) {
    const outerRing = rings[layer];
    const innerRing = rings[layer + 1];

    for (let index = 0; index < count; index += 1) {
      const next = (index + 1) % count;
      const signature = (getSignature(index, count) + getSignature(index + layer * count, count * layerCount)) / 2;
      const baseQuad = [outerRing[index], outerRing[next], innerRing[next], innerRing[index]];
      if (panelShape === 3) {
        const useForwardDiagonal = (layer + index) % 2 === 0;
        const triangles = buildPanelTriangleSplit(baseQuad, useForwardDiagonal);

        triangles.forEach((triangleCorners, triangleIndex) => {
          panels.push(
            createPanelRecord(
              "panel",
              triangleCorners,
              signature * (triangleIndex === 0 ? 1 : 0.94),
              buildLayeredInsetCutouts,
              layer * count * 2 + index * 2 + triangleIndex,
              plateThickness
            )
          );
        });
      } else {
        panels.push(
          createPanelRecord(
            "panel",
            baseQuad,
            signature,
            buildLayeredInsetCutouts,
            layer * count + index,
            plateThickness
          )
        );
      }
    }
  }

  const baseCapPoints = rings[rings.length - 1].map((point) => ({ ...point }));

  return {
    segments: count,
    step,
    plateThickness,
    signatures,
    panels,
    baseCapPoints,
    baseCapY: baseY,
    metrics: {
      openingDiameter: Math.round(Math.max(...rings[0].map((point) => Math.hypot(point.x, point.z))) * 2),
      bowlHeight: Math.round(rimY),
      footDiameter: Math.round(Math.max(...baseCapPoints.map((point) => Math.hypot(point.x, point.z))) * 2),
      trianglePanels: panels.length,
      panelLayers: layerCount,
      panelShape,
      holeCount: state.cutoutScale >= (panelShape === 3 ? 22 : 16) ? 2 : 1,
      cutoutRatio: Math.round(state.cutoutScale),
    },
  };
}

function buildModeMicroGeometry() {
  const rings = buildMicroModeRings(state.segments);
  const panels = [];

  for (let index = 0; index < rings.count; index += 1) {
    const next = (index + 1) % rings.count;
    const signature = (rings.signatures[index] + rings.signatures[next]) / 2;

    panels.push(
      createPanelRecord(
        "outer",
        [rings.rim[index], rings.rim[next], rings.upper[next], rings.upper[index]],
        signature,
        buildGradientMicroCutouts,
        index,
        rings.plateThickness
      )
    );
    panels.push(
      createPanelRecord(
        "mid",
        [rings.upper[index], rings.upper[next], rings.lower[next], rings.lower[index]],
        signature,
        buildGradientMicroCutouts,
        index + rings.count,
        rings.plateThickness
      )
    );
    panels.push(
      createPanelRecord(
        "base",
        [rings.lower[index], rings.lower[next], rings.base[next], rings.base[index]],
        signature,
        null,
        index + rings.count * 2,
        rings.plateThickness
      )
    );
  }

  return {
    segments: rings.count,
    step: rings.step,
    plateThickness: rings.plateThickness,
    signatures: rings.signatures,
    panels,
    baseCapPoints: rings.base.map((point) => ({ ...point })),
    baseCapY: rings.baseY,
    metrics: {
      openingDiameter: Math.round(Math.max(...rings.rim.map((point) => Math.hypot(point.x, point.z))) * 2),
      bowlHeight: Math.round(rings.rimY),
      footDiameter: rings.footDiameter,
      trianglePanels: panels.length * 2,
      microHoleShape: state.microHoleShape,
      cutoutRatio: Math.round(state.cutoutScale),
    },
  };
}

function getGeometryData() {
  if (state.cutoutMode === "kaleido") {
    return buildModeKaleidoGeometry();
  }
  if (state.cutoutMode === "panel") {
    return buildModePanelGeometry();
  }
  return buildModeMicroGeometry();
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
      panel.type === "connector"
        ? blendColor("#f7ece7", "#d4b3a7", 0.26 + (panel.signature + 1) * 0.16)
        : panel.type === "outer"
        ? blendColor("#f8f8f5", "#d7d7d2", 0.26 + (panel.signature + 1) * 0.18)
        : panel.type === "mid"
          ? blendColor("#efefe9", "#cbcbc4", 0.24 + (panel.signature + 1) * 0.16)
          : panel.type === "panel"
            ? blendColor("#f1f1ed", "#cfcfc8", 0.28 + (panel.signature + 1) * 0.12)
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

    hole2d.forEach((hole) => {
      for (let index = 0; index < hole.length; index += 1) {
        const next = (index + 1) % hole.length;
        accentMarkup.push(`
          <line x1="${hole[index].x.toFixed(2)}" y1="${hole[index].y.toFixed(2)}" x2="${hole[next].x.toFixed(2)}" y2="${hole[next].y.toFixed(2)}" />
        `);
      }
    });
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
        <text x="28" y="58">${modeDefinitions[state.cutoutMode].description.toUpperCase()} / STABLE FOOT</text>
        <text x="28" y="78">${
          state.cutoutMode === "kaleido"
            ? `POLYGON ${state.polygonSides} / BANDS ${geometry.segments}`
            : state.cutoutMode === "panel"
              ? `SEGMENTS ${geometry.segments} / LAYERS ${state.panelLayers} / PANEL ${geometry.metrics.panelShape === 3 ? "TRI" : "QUAD"}`
            : `SEGMENTS ${geometry.segments} / POLYGON ${state.polygonSides}`
        }</text>
      </g>

      <g font-family="IBM Plex Mono, Consolas, monospace" font-size="13" fill="#c63a32">
        <text x="438" y="38">OPENING ${state.opening.toFixed(2)}x</text>
        <text x="438" y="58">HEIGHT ${state.height} mm</text>
        <text x="438" y="78">${
          state.cutoutMode === "kaleido"
            ? `MODE ${modeDefinitions[state.cutoutMode].label} / JOIN ${geometry.metrics.connectorCount}`
            : state.cutoutMode === "panel"
              ? `MODE ${modeDefinitions[state.cutoutMode].label} / LAY ${state.panelLayers}`
            : `MODE ${modeDefinitions[state.cutoutMode].label} / SHAPE ${microHoleShapeDefinitions[state.microHoleShape].label}`
        }</text>
        <text x="438" y="98">${
          state.cutoutMode === "kaleido"
            ? `PLATES ${geometry.metrics.trianglePanels} / SIDE ${state.polygonSides}`
            : state.cutoutMode === "panel"
              ? `PANELS ${geometry.metrics.trianglePanels} / HOLE ${geometry.metrics.holeCount}x ${geometry.metrics.panelShape === 3 ? "TRI" : "QUAD"}`
            : `BAND ${state.cutoutBand}% / CUT ${state.cutoutScale}% / POLY ${state.polygonSides}`
        }</text>
        <text x="28" y="692">SHARP FACETED METALLIC BOWL / STRUCTURED CUTOUT SYSTEM / AI-ASSISTED CONTROL</text>
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

    panel.holes3d.forEach((hole) => {
      buildLineLoops(hole, accentPositions);
    });
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
      panel.type === "connector"
        ? accentMaterial
        : panel.type === "base"
        ? baseMaterial
        : (panel.type === "outer" || panel.type === "panel") && panel.signature > 0.42
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
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
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
  threeState.ground = ground;
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
  elements.assemblyValue.textContent =
    state.cutoutMode === "kaleido"
      ? `${geometry.metrics.trianglePanels} 板片 / ${geometry.metrics.connectorCount} 连接件`
      : state.cutoutMode === "panel"
        ? `${geometry.metrics.trianglePanels} 面片 / ${state.panelLayers} 层 / ${geometry.metrics.holeCount} 孔`
      : `${geometry.segments} 折面 / ${microHoleShapeDefinitions[state.microHoleShape].label} / CUT ${geometry.metrics.cutoutRatio}%`;
  elements.diameterValue.textContent = `${geometry.metrics.openingDiameter} mm`;
  elements.openingValue.textContent = `${geometry.metrics.bowlHeight} mm`;
  elements.frameWidthValue.textContent =
    state.cutoutMode === "kaleido"
      ? `${geometry.metrics.footDiameter} mm / JOIN ${geometry.metrics.connectorCount}`
      : state.cutoutMode === "panel"
        ? `${geometry.metrics.footDiameter} mm / ${geometry.metrics.panelShape === 3 ? "三角拼板" : "四边面片"}`
      : `${geometry.metrics.footDiameter} mm / ${state.polygonSides} 边对称 / ${microHoleShapeDefinitions[state.microHoleShape].label}`;
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
  updateModeVisibility();
  currentSvgMarkup = buildTopViewSvg();
  elements.topViewSurface.innerHTML = currentSvgMarkup;
  syncSlidersFromState();
  updateLabels();
  updateMetrics();
  updatePricePanel();
  updateSummaryPanel();
  updateModeButtons();
  updateMicroHoleShapeButtons();
  updatePresetButtons();
  if (hasHydratedState) {
    saveStateToStorage();
  }
  rebuildThreeModel();

  if (statusMessage) {
    elements.statusLine.textContent = statusMessage;
  }
}

function downloadSvg() {
  const blob = new Blob([currentSvgMarkup], {
    type: "image/svg+xml;charset=utf-8",
  });
  downloadBlob(blob, `faceted-metal-bowl-cutout-${state.segments}seg.svg`);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function downloadTextFile(content, filename, mimeType = "text/plain;charset=utf-8") {
  downloadBlob(new Blob([content], { type: mimeType }), filename);
}

function getCurrentModelSlug() {
  return `${state.cutoutMode}-${state.segments}seg-r${state.radius}-t${state.thickness}`;
}

function buildObjContent() {
  if (!threeState.ready || !threeState.bowlGroup || !THREE) {
    throw new Error("three.js 三维场景尚未完成初始化，暂时无法导出 OBJ。");
  }

  threeState.scene.updateMatrixWorld(true);
  threeState.bowlGroup.updateMatrixWorld(true);

  const lines = [
    "# Parametric faceted metal fruit bowl",
    "# units: millimeters",
  ];
  let vertexOffset = 1;

  threeState.bowlGroup.children.forEach((child, meshIndex) => {
    if (!child.isMesh || !child.geometry) {
      return;
    }

    const geometry = child.geometry.clone().toNonIndexed();
    geometry.applyMatrix4(child.matrixWorld);
    const positions = geometry.getAttribute("position");
    if (!positions) {
      geometry.dispose();
      return;
    }

    lines.push(`o mesh_${meshIndex + 1}`);
    for (let index = 0; index < positions.count; index += 1) {
      const x = positions.getX(index).toFixed(5);
      const y = positions.getY(index).toFixed(5);
      const z = positions.getZ(index).toFixed(5);
      lines.push(`v ${x} ${y} ${z}`);
    }

    for (let index = 0; index < positions.count; index += 3) {
      lines.push(
        `f ${vertexOffset + index} ${vertexOffset + index + 1} ${vertexOffset + index + 2}`
      );
    }

    vertexOffset += positions.count;
    geometry.dispose();
  });

  return lines.join("\n");
}

function downloadObjModel() {
  const objContent = buildObjContent();
  downloadTextFile(objContent, `${getCurrentModelSlug()}.obj`, "text/plain;charset=utf-8");
}

function buildProductDescription() {
  const geometry = getGeometryData();
  const pricing = getPricing();
  const metrics = pricing.manufacturingMetrics;
  const cutoutDetail =
    state.cutoutMode === "micro"
      ? `孔型方案：${microHoleShapeDefinitions[state.microHoleShape].label}`
      : state.cutoutMode === "panel"
        ? `层级数量：${state.panelLayers} 层`
        : `拼接边数：${state.polygonSides} 边`;

  return [
    "# 参数化金属折面果盘产品说明",
    "",
    `产品名称：参数化金属折面果盘 / ${modeDefinitions[state.cutoutMode].label}`,
    "材质：304 不锈钢镜面板",
    `板厚：${geometry.plateThickness.toFixed(1)} mm`,
    "",
    "## 造型参数",
    `- 折面数量：${state.segments}`,
    `- 开口比例：${state.opening.toFixed(2)}x`,
    `- 整体高度：${state.height} mm`,
    `- 壁板倾角：${state.tilt}°`,
    `- 边缘不规则度：${state.irregularity} / 10`,
    `- 整体半径：${state.radius} mm`,
    `- 镂空尺度：${state.cutoutScale}%`,
    `- 镂空带位置：${state.cutoutBand}%`,
    `- ${cutoutDetail}`,
    "",
    "## 关键尺寸",
    `- 最大开口：${geometry.metrics.openingDiameter} mm`,
    `- 果盘高度：${geometry.metrics.bowlHeight} mm`,
    `- 底部跨度：${geometry.metrics.footDiameter} mm`,
    "",
    "## 制造估算",
    `- 净料重量：${metrics.netMassKg.toFixed(2)} kg`,
    `- 含损耗采购重量：${metrics.purchasedMassKg.toFixed(2)} kg`,
    `- 激光切割总长度：${metrics.cutLengthM.toFixed(2)} m`,
    `- 开孔数量：${metrics.holeCount}`,
    `- 估算装配节点：${metrics.jointCount}`,
    "",
    "## 报价拆解",
    `- 板材与损耗：${formatRmb(pricing.materialCost)}`,
    `- 激光切割与开孔：${formatRmb(pricing.cuttingCost)}`,
    `- 装配焊接与表面处理：${formatRmb(pricing.assemblyCost)}`,
    `- 参数化工程与打样：${formatRmb(pricing.designCost)}`,
    `- 制造成本合计：${formatRmb(pricing.costSubtotal)}`,
    `- 建议售价（当前倍率约 × ${pricing.effectiveMultiplier.toFixed(1)}，封顶 ￥${manufacturingPricing.sellingPriceCap}）：${formatRmb(pricing.totalPrice)}`,
    "",
    "## 导出说明",
    "- 当前网页可导出顶视图 SVG、产品效果图 PNG 与 3D 打印参考 OBJ。",
    "- OBJ 采用毫米单位导出，建议在打印前于 Rhino / MeshLab / Cura 中再次检查壁厚与法线方向。",
  ].join("\n");
}

function loadImageFromSource(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}

function svgToDataUrl(svgMarkup) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`;
}

function drawRoundedRectPath(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawTagCardPath(ctx, x, y, width, height) {
  ctx.beginPath();
  ctx.moveTo(x + 140, y);
  ctx.lineTo(x + width - 250, y);
  ctx.lineTo(x + width, y + 210);
  ctx.lineTo(x + width, y + height - 180);
  ctx.lineTo(x + width - 170, y + height);
  ctx.lineTo(x + 160, y + height);
  ctx.lineTo(x, y + height - 170);
  ctx.lineTo(x, y + 150);
  ctx.closePath();
}

function drawTechGrid(ctx, x, y, width, height, minor = 28, major = 112) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();

  ctx.strokeStyle = "rgba(198,58,50,0.06)";
  ctx.lineWidth = 1;
  for (let dx = x; dx <= x + width; dx += minor) {
    ctx.beginPath();
    ctx.moveTo(dx, y);
    ctx.lineTo(dx, y + height);
    ctx.stroke();
  }
  for (let dy = y; dy <= y + height; dy += minor) {
    ctx.beginPath();
    ctx.moveTo(x, dy);
    ctx.lineTo(x + width, dy);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(0,0,0,0.08)";
  for (let dx = x; dx <= x + width; dx += major) {
    ctx.beginPath();
    ctx.moveTo(dx, y);
    ctx.lineTo(dx, y + height);
    ctx.stroke();
  }
  for (let dy = y; dy <= y + height; dy += major) {
    ctx.beginPath();
    ctx.moveTo(x, dy);
    ctx.lineTo(x + width, dy);
    ctx.stroke();
  }
  ctx.restore();
}

function drawImageContain(ctx, image, x, y, width, height) {
  const scale = Math.min(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const drawX = x + (width - drawWidth) / 2;
  const drawY = y + (height - drawHeight) / 2;
  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
}

function wrapCanvasText(ctx, text, maxWidth) {
  const chars = text.split("");
  const lines = [];
  let current = "";

  chars.forEach((char) => {
    const next = current + char;
    if (ctx.measureText(next).width > maxWidth && current) {
      lines.push(current);
      current = char;
    } else {
      current = next;
    }
  });

  if (current) {
    lines.push(current);
  }
  return lines;
}

function drawInfoBlock(ctx, x, y, width, height, label, value, accent = false) {
  ctx.save();
  drawRoundedRectPath(ctx, x, y, width, height, 18);
  ctx.fillStyle = accent ? "rgba(198,58,50,0.08)" : "rgba(255,255,255,0.72)";
  ctx.fill();
  ctx.strokeStyle = accent ? "rgba(198,58,50,0.28)" : "rgba(0,0,0,0.1)";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.fillStyle = accent ? "#c63a32" : "#6b645c";
  ctx.font = '600 22px "IBM Plex Mono","Consolas","Microsoft YaHei",sans-serif';
  ctx.fillText(label, x + 24, y + 34);

  ctx.fillStyle = "#111111";
  ctx.font = '700 34px "Microsoft YaHei","PingFang SC",sans-serif';
  ctx.fillText(value, x + 24, y + 82);
  ctx.restore();
}

function getProductCardModeLabel() {
  return productCardModeLabels[state.cutoutMode] || modeDefinitions[state.cutoutMode]?.label || "参数模式";
}

function getProductCardDetailLabel() {
  if (state.cutoutMode === "micro") {
    return productCardHoleLabels[state.microHoleShape] || "微孔系统";
  }
  if (state.cutoutMode === "panel") {
    return `${state.panelLayers} 层同形内镂空`;
  }
  return `${state.polygonSides} 边拼接分割`;
}

function buildPresentationTopViewSvg(
  size = 1320,
  { includeBackground = true, includeGrid = true, paddingRatio = 0.055 } = {}
) {
  const geometry = getGeometryData();
  const padding = size * paddingRatio;
  const center = size / 2;
  const allPoints = geometry.panels
    .flatMap((panel) => panel.outer3d)
    .concat(geometry.baseCapPoints);
  const maxRadius =
    Math.max(...allPoints.map((point) => Math.max(Math.abs(point.x), Math.abs(point.z))), 1) || 1;
  const scale = (size / 2 - padding) / maxRadius;
  const project = (point) => ({
    x: center + point.x * scale,
    y: center + point.z * scale,
  });

  const plateMarkup = [];
  const holeMarkup = [];
  const seamMarkup = [];
  const baseCap2d = geometry.baseCapPoints.map(project);

  geometry.panels.forEach((panel) => {
    const outer2d = panel.outer3d.map(project);
    const hole2d = panel.holes3d.map((hole) => hole.map(project));
    const compoundPath = [polygonPath(outer2d), ...hole2d.map((loop) => polygonPath(loop))].join(" ");

    plateMarkup.push(`
      <path
        d="${compoundPath}"
        fill="${panel.type === "connector" ? "rgba(198,58,50,0.016)" : "rgba(255,255,255,0.18)"}"
        fill-rule="evenodd"
        stroke="#171717"
        stroke-width="${panel.type === "outer" ? 2.4 : 2}"
        stroke-linejoin="round"
        vector-effect="non-scaling-stroke"
      />
    `);

    seamMarkup.push(`
      <path
        d="${polygonPath(outer2d)}"
        fill="none"
        stroke="rgba(0,0,0,0.14)"
        stroke-width="0.8"
        vector-effect="non-scaling-stroke"
      />
    `);

    hole2d.forEach((loop) => {
      holeMarkup.push(`
        <path
          d="${polygonPath(loop)}"
          fill="none"
          stroke="#b84c3d"
          stroke-width="1.65"
          stroke-linejoin="round"
          vector-effect="non-scaling-stroke"
        />
      `);
    });
  });

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
      ${includeBackground ? `<rect width="${size}" height="${size}" fill="#f7f3eb" />` : ""}
      ${
        includeGrid
          ? `
      <g stroke="#e8dfd1" stroke-width="1">
        ${Array.from({ length: 23 }, (_, index) => {
            const position = (index / 22) * size;
            return `<line x1="${position}" y1="0" x2="${position}" y2="${size}" /><line x1="0" y1="${position}" x2="${size}" y2="${position}" />`;
          }).join("")}
      </g>
      <g stroke="#efe6d9" stroke-width="1.2">
        <line x1="${center}" y1="0" x2="${center}" y2="${size}" />
        <line x1="0" y1="${center}" x2="${size}" y2="${center}" />
      </g>`
          : ""
      }
      <path
        d="${polygonPath(baseCap2d)}"
        fill="rgba(0,0,0,0.035)"
        stroke="#151515"
        stroke-width="2"
        vector-effect="non-scaling-stroke"
      />
      <g>${plateMarkup.join("")}</g>
      <g>${seamMarkup.join("")}</g>
      <g>${holeMarkup.join("")}</g>
    </svg>
  `;
}

function drawImageCover(ctx, image, x, y, width, height, focusX = 0.5, focusY = 0.5, zoom = 1) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();

  const scale = Math.max(width / image.width, height / image.height) * zoom;
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const overflowX = Math.max(0, drawWidth - width);
  const overflowY = Math.max(0, drawHeight - height);
  const drawX = x - overflowX * focusX;
  const drawY = y - overflowY * focusY;
  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  ctx.restore();
}

function drawSpecCell(ctx, x, y, width, height, label, value, accent = false) {
  ctx.save();
  drawRoundedRectPath(ctx, x, y, width, height, 20);
  ctx.fillStyle = accent ? "rgba(198,58,50,0.08)" : "rgba(255,255,255,0.72)";
  ctx.fill();
  ctx.strokeStyle = accent ? "rgba(198,58,50,0.24)" : "rgba(0,0,0,0.08)";
  ctx.lineWidth = 1.4;
  ctx.stroke();

  ctx.fillStyle = accent ? "#c63a32" : "#6c645d";
  ctx.font = '600 22px "IBM Plex Mono","Consolas","Microsoft YaHei",sans-serif';
  ctx.fillText(label, x + 24, y + 36);

  ctx.fillStyle = "#121212";
  ctx.font = '700 34px "Microsoft YaHei","PingFang SC",sans-serif';
  ctx.fillText(value, x + 24, y + 88);
  ctx.restore();
}

function drawGlossBand(ctx, x, y, width, height, angleDegrees, opacity = 0.4) {
  ctx.save();
  ctx.translate(x + width / 2, y + height / 2);
  ctx.rotate((angleDegrees * Math.PI) / 180);
  const gradient = ctx.createLinearGradient(-width * 0.6, 0, width * 0.6, 0);
  gradient.addColorStop(0, "rgba(255,255,255,0)");
  gradient.addColorStop(0.34, `rgba(255,255,255,${opacity * 0.1})`);
  gradient.addColorStop(0.5, `rgba(255,255,255,${opacity})`);
  gradient.addColorStop(0.66, `rgba(255,255,255,${opacity * 0.12})`);
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(-width * 0.58, -height * 0.06, width * 1.16, height * 0.12);
  ctx.restore();
}

function drawImageHalf(ctx, image, x, y, width, height, side, focusX = 0.5, focusY = 0.5, zoom = 1, filter = "none") {
  ctx.save();
  ctx.beginPath();
  if (side === "left") {
    ctx.rect(x, y, width / 2, height);
  } else {
    ctx.rect(x + width / 2, y, width / 2, height);
  }
  ctx.clip();
  ctx.filter = filter;
  drawImageCover(ctx, image, x, y, width, height, focusX, focusY, zoom);
  ctx.restore();
}

function drawImageContainedHalf(ctx, image, x, y, width, height, side, zoom = 1, filter = "none", offsetX = 0, offsetY = 0) {
  const paneWidth = width / 2;
  const paneX = side === "left" ? x : x + paneWidth;
  const scale = Math.min(paneWidth / image.width, height / image.height) * zoom;
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const drawX = paneX + (paneWidth - drawWidth) / 2 + offsetX;
  const drawY = y + (height - drawHeight) / 2 + offsetY;

  ctx.save();
  ctx.beginPath();
  if (side === "left") {
    ctx.rect(x, y, width / 2, height);
  } else {
    ctx.rect(x + width / 2, y, width / 2, height);
  }
  ctx.clip();
  ctx.filter = filter;
  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  ctx.restore();
}

function drawImageSplitComposite(ctx, image, x, y, width, height, side, zoom = 1, filter = "none", offsetX = 0, offsetY = 0) {
  const scale = Math.min(width / image.width, height / image.height) * zoom;
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const drawX = x + (width - drawWidth) / 2 + offsetX;
  const drawY = y + (height - drawHeight) / 2 + offsetY;

  ctx.save();
  ctx.beginPath();
  if (side === "left") {
    ctx.rect(x, y, width / 2, height);
  } else {
    ctx.rect(x + width / 2, y, width / 2, height);
  }
  ctx.clip();
  ctx.filter = filter;
  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  ctx.restore();
}

function buildCaptureCamera(width, height, preset = "hero") {
  const bounds = new THREE.Box3().setFromObject(threeState.bowlGroup);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  bounds.getSize(size);
  bounds.getCenter(center);
  const maxDim = Math.max(size.x, size.y, size.z, 180);

  if (preset === "splitTop") {
    const aspect = width / height;
    const geometry = getGeometryData();
    const framingPoints = geometry.panels
      .flatMap((panel) => panel.outer3d)
      .concat(geometry.baseCapPoints);
    const maxRadius =
      Math.max(...framingPoints.map((point) => Math.max(Math.abs(point.x), Math.abs(point.z))), 1) || 1;
    const paddingRatio = 0.055;
    const halfSize = (maxRadius / (1 - paddingRatio * 2)) * 1.008;
    const camera = new THREE.OrthographicCamera(
      -halfSize * aspect,
      halfSize * aspect,
      halfSize,
      -halfSize,
      0.1,
      5000
    );
    camera.position.set(center.x, center.y + maxDim * 3.6, center.z);
    camera.up.set(0, 0, -1);
    camera.lookAt(center.x, center.y, center.z);
    camera.updateProjectionMatrix();
    return camera;
  }

  const fov = preset === "card" ? 30 : preset === "hero" ? 25 : 28;
  const camera = new THREE.PerspectiveCamera(fov, width / height, 0.1, 4000);

  if (preset === "card") {
    camera.position.set(
      center.x + maxDim * 0.72,
      center.y + maxDim * 1.22,
      center.z + maxDim * 0.92
    );
    camera.lookAt(center.x, center.y + size.y * 0.04, center.z);
  } else if (preset === "hero") {
    camera.position.set(
      center.x + maxDim * 0.88,
      center.y + maxDim * 0.62,
      center.z + maxDim * 1.04
    );
    camera.lookAt(center.x, center.y + size.y * 0.08, center.z);
  } else {
    camera.position.set(
      center.x + maxDim * 1.2,
      center.y + maxDim * 0.84,
      center.z + maxDim * 1.28
    );
    camera.lookAt(center.x, center.y + size.y * 0.12, center.z);
  }

  camera.updateProjectionMatrix();
  return camera;
}

function captureThreeModelDataUrl({
  width = 1480,
  height = 1120,
  transparent = false,
  cameraPreset = null,
  exposure = 1.3,
  highlightBoost = false,
} = {}) {
  if (!threeState.ready || !THREE) {
    throw new Error("three.js 三维预览尚未就绪。");
  }

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: transparent,
    preserveDrawingBuffer: true,
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = exposure;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const previousBackground = threeState.scene.background;
  const previousGroundVisible = threeState.ground ? threeState.ground.visible : null;
  const renderCamera = cameraPreset ? buildCaptureCamera(width, height, cameraPreset) : threeState.camera;
  const boostedLights = [];
  const tempLights = [];
  const boostedMaterials = [];

  if (transparent) {
    threeState.scene.background = null;
    if (threeState.ground) {
      threeState.ground.visible = false;
    }
  }

  if (highlightBoost) {
    threeState.scene.traverse((node) => {
      if (node?.isLight) {
        boostedLights.push({ node, intensity: node.intensity });
        node.intensity *= node.isAmbientLight ? 1.5 : 1.72;
      }
    });

    const extraKey = new THREE.DirectionalLight(0xffffff, 5.4);
    extraKey.position.set(280, 360, 180);
    const extraFill = new THREE.DirectionalLight(0xffffff, 4.2);
    extraFill.position.set(-260, 220, 220);
    const extraRim = new THREE.DirectionalLight(0xffffff, 3.2);
    extraRim.position.set(120, 160, -320);
    const extraTop = new THREE.DirectionalLight(0xffffff, 2.8);
    extraTop.position.set(0, 420, 0);
    tempLights.push(extraKey, extraFill, extraRim, extraTop);
    tempLights.forEach((light) => threeState.scene.add(light));

    const seenMaterials = new Set();
    threeState.bowlGroup.traverse((node) => {
      if (!node?.isMesh || !node.material) {
        return;
      }

      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.forEach((material) => {
        if (!material?.isMeshStandardMaterial || seenMaterials.has(material)) {
          return;
        }

        seenMaterials.add(material);
        boostedMaterials.push({
          material,
          roughness: material.roughness,
          metalness: material.metalness,
          envMapIntensity: material.envMapIntensity,
          color: material.color.getHex(),
        });
        material.roughness = Math.max(0.04, material.roughness * 0.46);
        material.metalness = Math.max(0.95, material.metalness);
        material.envMapIntensity *= 3.35;
        material.color.lerp(new THREE.Color("#a6a6a6"), 0.28);
        material.needsUpdate = true;
      });
    });
  }

  renderer.render(threeState.scene, renderCamera);
  const dataUrl = renderer.domElement.toDataURL("image/png");

  threeState.scene.background = previousBackground;
  if (threeState.ground && previousGroundVisible !== null) {
    threeState.ground.visible = previousGroundVisible;
  }
  boostedLights.forEach(({ node, intensity }) => {
    node.intensity = intensity;
  });
  tempLights.forEach((light) => {
    threeState.scene.remove(light);
  });
  boostedMaterials.forEach(({ material, roughness, metalness, envMapIntensity, color }) => {
    material.roughness = roughness;
    material.metalness = metalness;
    material.envMapIntensity = envMapIntensity;
    material.color.setHex(color);
    material.needsUpdate = true;
  });

  renderer.dispose();
  if (typeof renderer.forceContextLoss === "function") {
    renderer.forceContextLoss();
  }
  return dataUrl;
}

async function generateProductDescription() {
  if (!threeState.ready) {
    elements.statusLine.textContent = "三维预览尚未完成初始化，暂时无法生成产品标签页 PNG。";
    return;
  }

  const geometry = getGeometryData();
  const pricing = getPricing();
  const modeLabel = getProductCardModeLabel();
  const detailLabel = getProductCardDetailLabel();

  try {
    const [topViewImage, heroImage] = await Promise.all([
      loadImageFromSource(
        svgToDataUrl(
          buildPresentationTopViewSvg(1440, {
            includeBackground: false,
            includeGrid: false,
            paddingRatio: 0.055,
          })
        )
      ),
      loadImageFromSource(
        captureThreeModelDataUrl({
          width: 2200,
          height: 2200,
          transparent: true,
          cameraPreset: "splitTop",
          exposure: 2.06,
          highlightBoost: true,
        })
      ),
    ]);

    const canvas = document.createElement("canvas");
    canvas.width = 1800;
    canvas.height = 2400;
    const ctx = canvas.getContext("2d");

    const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    bgGradient.addColorStop(0, "#f8f4ee");
    bgGradient.addColorStop(0.48, "#f5efe5");
    bgGradient.addColorStop(1, "#efe4d6");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(255,255,255,0.46)";
    ctx.fillRect(0, 0, canvas.width, 430);

    ctx.fillStyle = "#c63a32";
    ctx.font = '600 24px "IBM Plex Mono","Consolas","Microsoft YaHei",sans-serif';
    ctx.fillText("PRODUCT CARD / PARAMETRIC STAINLESS STEEL BOWL", 82, 92);

    ctx.strokeStyle = "rgba(198,58,50,0.38)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(82, 120);
    ctx.lineTo(366, 120);
    ctx.stroke();

    ctx.fillStyle = "#111111";
    ctx.font = '900 122px "Microsoft YaHei","PingFang SC",sans-serif';
    ctx.fillText("参数化", 78, 210);
    ctx.fillText("金属果盘", 78, 338);

    ctx.fillStyle = "#6e675f";
    ctx.font = '500 33px "Microsoft YaHei","PingFang SC",sans-serif';
    ctx.fillText("304 镜面不锈钢 / 前卫折面原型 / 可定制参数", 82, 404);

    ctx.fillStyle = "#c63a32";
    ctx.font = '700 30px "IBM Plex Mono","Consolas","Microsoft YaHei",sans-serif';
    ctx.fillText("建议售价", 1230, 102);
    ctx.fillStyle = "#111111";
    ctx.font = '900 148px "Arial Black","Microsoft YaHei",sans-serif';
    ctx.fillText(formatRmb(pricing.totalPrice), 1186, 244);
    ctx.fillStyle = "#6e675f";
    ctx.font = '500 27px "Microsoft YaHei","PingFang SC",sans-serif';
    ctx.fillText("镜面不锈钢 / 参数化折面视觉方案", 1188, 294);

    drawInfoBlock(ctx, 78, 448, 312, 108, "方案模式", modeLabel, true);
    drawInfoBlock(ctx, 414, 448, 328, 108, "细节逻辑", detailLabel);
    drawInfoBlock(ctx, 766, 448, 246, 108, "折面数量", `${state.segments}`);
    drawInfoBlock(ctx, 1036, 448, 412, 108, "厚度 / 半径", `${geometry.plateThickness.toFixed(1)} mm / ${state.radius} mm`);

    const collageY = 650;
    const collageH = 1120;
    const compositeX = 78;
    const panelW = 804;
    const compositeW = panelW * 2;
    const splitX = compositeX + panelW;

    const warmGlow = ctx.createRadialGradient(520, 1160, 24, 520, 1160, 540);
    warmGlow.addColorStop(0, "rgba(255,255,255,0.82)");
    warmGlow.addColorStop(0.38, "rgba(255,255,255,0.18)");
    warmGlow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = warmGlow;
    ctx.fillRect(compositeX - 40, collageY - 60, panelW + 160, collageH + 120);

    ctx.fillStyle = "#f7f3eb";
    ctx.fillRect(compositeX, collageY, compositeW, collageH);
    drawTechGrid(ctx, compositeX, collageY, compositeW, collageH, 24, 120);

    ctx.fillStyle = "#c63a32";
    ctx.font = '600 23px "IBM Plex Mono","Consolas","Microsoft YaHei",sans-serif';
    ctx.fillText("CMF RENDER / METALLIC SURFACE STUDY", compositeX, collageY - 18);
    ctx.fillText("LINEAR TOP VIEW / GEOMETRY SYSTEM", splitX + 18, collageY - 18);

    drawImageSplitComposite(
      ctx,
      heroImage,
      compositeX,
      collageY,
      compositeW,
      collageH,
      "left",
      1.04,
      "brightness(1.62) contrast(1.1) saturate(0.9)"
    );
    drawImageSplitComposite(
      ctx,
      topViewImage,
      compositeX,
      collageY,
      compositeW,
      collageH,
      "right",
      1,
      "none"
    );

    ctx.strokeStyle = "rgba(255,255,255,0.88)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(splitX, collageY + 20);
    ctx.lineTo(splitX, collageY + collageH - 20);
    ctx.stroke();

    ctx.strokeStyle = "rgba(0,0,0,0.08)";
    ctx.lineWidth = 1.2;
    ctx.strokeRect(compositeX, collageY, compositeW, collageH);

    ctx.fillStyle = "#151515";
    ctx.font = '800 46px "Microsoft YaHei","PingFang SC",sans-serif';
    ctx.fillText("关键参数", 78, 1856);

    const specs = [
      ["材质", "304 镜面不锈钢"],
      ["方案模式", modeLabel],
      ["细节逻辑", detailLabel],
      ["折面数量", `${state.segments}`],
      ["开口比例", `${state.opening.toFixed(2)}x`],
      ["整体高度", `${geometry.metrics.bowlHeight} mm`],
      ["整体半径", `${state.radius} mm`],
      ["板材厚度", `${geometry.plateThickness.toFixed(1)} mm`],
      ["轮廓边数", `${state.polygonSides} 边`],
      ["表面气质", "高光镜面金属"],
    ];

    const specStartY = 1896;
    const specGap = 18;
    const specAreaX = 78;
    const specAreaW = canvas.width - specAreaX * 2;
    const specColumns = 5;
    const specCellW = Math.floor((specAreaW - specGap * (specColumns - 1)) / specColumns);
    const specCellH = 106;
    specs.forEach(([label, value], index) => {
      const col = index % specColumns;
      const row = Math.floor(index / specColumns);
      drawSpecCell(
        ctx,
        specAreaX + col * (specCellW + specGap),
        specStartY + row * (specCellH + 18),
        specCellW,
        specCellH,
        label,
        value,
        index === 0
      );
    });

    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    ctx.lineWidth = 1.2;
    ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) {
      throw new Error("PNG 生成失败。");
    }

    downloadBlob(blob, `${getCurrentModelSlug()}-产品标签页.png`);
    elements.statusLine.textContent = "已生成新版拼贴产品标签页 PNG：中间主图为左右完整半幅拼贴，并强化了三维高光反射。";
  } catch (error) {
    console.error(error);
    elements.statusLine.textContent = "产品标签页 PNG 生成失败，请稍后重试。";
  }
}

function exportThreePreviewImage() {
  if (!threeState.ready || !threeState.renderer) {
    elements.statusLine.textContent = "三维预览尚未完成初始化，暂时无法生成产品效果图。";
    return;
  }

  try {
    const dataUrl = captureThreeModelDataUrl({
      width: 2200,
      height: 1600,
      transparent: true,
      cameraPreset: "card",
      exposure: 1.94,
      highlightBoost: true,
    });
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `${getCurrentModelSlug()}-效果图.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    console.error(error);
    elements.statusLine.textContent = "产品效果图导出失败，请确认三维预览已经加载完成。";
  }
}

function setAIHeroImageState({ loading = false, image = "", message = "" } = {}) {
  if (!elements.aiHeroImage || !elements.aiHeroPlaceholder || !elements.aiHeroImageStatus) {
    return;
  }

  if (message) {
    elements.aiHeroImageStatus.textContent = message;
  }

  elements.heroImageButton.disabled = loading;

  if (image) {
    elements.aiHeroImage.src = image;
    elements.aiHeroImage.classList.remove("is-hidden");
    elements.aiHeroPlaceholder.classList.add("is-hidden");
  } else {
    elements.aiHeroImage.removeAttribute("src");
    elements.aiHeroImage.classList.add("is-hidden");
    elements.aiHeroPlaceholder.classList.remove("is-hidden");
  }
}

function normalizeAIImageSource(source) {
  if (typeof source !== "string") {
    return "";
  }

  const trimmed = source.trim();
  if (!trimmed) {
    return "";
  }

  if (/^data:image\//i.test(trimmed)) {
    return trimmed;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return trimmed;
}

async function generateAIHeroImage() {
  const payload = {
    mode: state.cutoutMode,
    sides: state.polygonSides,
    layers: state.panelLayers,
    foldCount: state.segments,
    opening: state.opening,
    height: state.height,
    tilt: state.tilt,
    thickness: state.thickness,
    radius: state.radius,
  };

  setAIHeroImageState({
    loading: true,
    image: elements.aiHeroImage?.getAttribute("src") || "",
    message: "AI 效果图生成中，正在请求 Flask 后端...",
  });
  elements.statusLine.textContent = "正在调用 Flask 后端生成产品效果图...";

  try {
    const response = await fetch(AI_IMAGE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`AI image request failed: ${response.status}`);
    }

    const result = await response.json();
    const imageSource = normalizeAIImageSource(result?.image);
    if (!imageSource) {
      throw new Error("AI image response missing image field");
    }

    setAIHeroImageState({
      loading: false,
      image: imageSource,
      message: "AI 效果图已生成并显示在页面中。",
    });
    elements.statusLine.textContent = "AI 产品效果图已生成并显示在页面中。";
  } catch (error) {
    console.error(error);
    setAIHeroImageState({
      loading: false,
      image: elements.aiHeroImage?.getAttribute("src") || "",
      message: "AI 效果图生成失败，请检查 Flask 后端和接口地址。",
    });
    elements.statusLine.textContent = "AI 产品效果图生成失败，请检查 Flask 后端和接口地址。";
  } finally {
    elements.heroImageButton.disabled = false;
  }
}

async function copyCurrentParams() {
  const payload = JSON.stringify(getStateSnapshot(), null, 2);

  try {
    await copyTextToClipboard(payload);
    elements.statusLine.textContent = "已复制当前参数 JSON，可直接用于 AI 对话或后续后端链路。";
  } catch (error) {
    console.error(error);
    elements.statusLine.textContent = "复制参数失败，请稍后重试。";
  }
}

function applyPreset(presetKey) {
  const preset = presetDefinitions[presetKey];
  if (!preset) {
    return;
  }

  applyTargetState(
    { ...preset.values },
    `已切换到「${preset.label}」快速方案，顶视图、三维和价格已同步刷新。`
  );

  assistantMessages.push({
    role: "assistant",
    text: `已应用快速方案「${preset.label}」。你可以继续拖动滑块微调，或者直接用下方对话框描述新的方向。`,
  });
  renderAssistantFeed();
}

function resetToDefaults() {
  applyTargetState(
    { ...defaultState },
    "已恢复默认参数，并重新生成当前基础母型。"
  );

  assistantMessages.push({
    role: "assistant",
    text: "参数已恢复默认值。我们现在回到了稳定的基础母型，可以从这里继续往锋利、通透或更深口的方向推。",
  });
  renderAssistantFeed();
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
    cutoutMode: "造型方案",
    polygonSides: "多边形边数",
    panelLayers: "层级数量",
    segments: "折面数量",
    opening: "开口比例",
    height: "整体高度",
    tilt: "壁板倾角",
    irregularity: "边缘不规则度",
    thickness: "金属板厚度",
    radius: "整体半径",
    cutoutScale: "镂空尺度",
    cutoutSharpness: "镂空锐度",
    cutoutBand: "镂空带位置",
    microHoleShape: "孔型方案",
  };
  const suffixMap = {
    cutoutMode: "",
    polygonSides: " 边",
    panelLayers: " 层",
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
    microHoleShape: "",
  };
  const formatValue = (key, value) => {
    if (key === "cutoutMode") {
      return modeDefinitions[value]?.label ?? value;
    }
    if (key === "microHoleShape") {
      return microHoleShapeDefinitions[value]?.label ?? value;
    }
    return value;
  };
  const fromValue = formatValue(diff.key, diff.from);
  const toValue = formatValue(diff.key, diff.to);
  return `${labels[diff.key]}：${fromValue}${suffixMap[diff.key]} → ${toValue}${suffixMap[diff.key]}`;
}

function parseNumberCommand(text, target) {
  const rules = [
    { key: "segments", regex: /(\d+(?:\.\d+)?)\s*(?:折面|分片|切片)/i },
    { key: "polygonSides", regex: /(\d+(?:\.\d+)?)\s*(?:边形|多边形边数|拼合边数|孔洞边数)/i },
    { key: "panelLayers", regex: /(\d+(?:\.\d+)?)\s*(?:层级|层数|层级数量|层面|层)/i },
    { key: "radius", regex: /(?:半径|radius)\s*[:：]?\s*(\d+(?:\.\d+)?)/i },
    { key: "height", regex: /(?:高度|height)\s*[:：]?\s*(\d+(?:\.\d+)?)/i },
    { key: "thickness", regex: /(?:厚度|板厚|thickness)\s*[:：]?\s*(\d+(?:\.\d+)?)/i },
    { key: "tilt", regex: /(?:倾角|tilt)\s*[:：]?\s*(\d+(?:\.\d+)?)/i },
    { key: "irregularity", regex: /(?:不规则度|边缘不规则度|irregularity)\s*[:：]?\s*(\d+(?:\.\d+)?)/i },
    { key: "cutoutScale", regex: /(?:镂空尺度|镂空比例|开孔尺度|开孔比例)\s*[:：]?\s*(\d+(?:\.\d+)?)/i },
    { key: "cutoutSharpness", regex: /(?:镂空锐度|镂空尖锐度|孔洞锐度|孔洞尖锐度)\s*[:：]?\s*(\d+(?:\.\d+)?)/i },
    { key: "cutoutBand", regex: /(?:镂空带位置|镂空位置|开孔位置)\s*[:：]?\s*(\d+(?:\.\d+)?)/i },
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

function applyMicroHoleShapeKeywords(text, target, notes) {
  [
    {
      words: ["三角孔", "三角形孔", "三角微孔", "三角镂空"],
      value: "triangle",
      note: "参数化小孔切换为三角孔型",
    },
    {
      words: ["四边孔", "四边形孔", "方孔", "四边微孔"],
      value: "quad",
      note: "参数化小孔切换为四边孔型",
    },
    {
      words: ["五边孔", "五边形孔", "五边微孔"],
      value: "pentagon",
      note: "参数化小孔切换为五边孔型",
    },
    {
      words: ["圆孔", "圆形孔", "圆形微孔", "圆孔阵列"],
      value: "circle",
      note: "参数化小孔切换为圆孔阵列",
    },
    {
      words: ["长条孔", "长条放射", "放射长条", "长槽孔", "狭长孔"],
      value: "slot",
      note: "参数化小孔切换为长条放射孔型",
    },
  ].forEach((item) => {
    if (containsAny(text, item.words)) {
      target.microHoleShape = item.value;
      target.cutoutMode = "micro";
      notes.push(item.note);
    }
  });
}

function parseDesignPrompt(text) {
  const normalized = text.trim().toLowerCase();
  const target = { ...state };
  const notes = [];
  const bump = (key, delta) => {
    target[key] = clampToSlider(key, target[key] + delta);
  };
  const setCutoutMode = (mode, note) => {
    if (modeDefinitions[mode]) {
      target.cutoutMode = mode;
      if (note) {
        notes.push(note);
      }
    }
  };

  parseNumberCommand(text, target);
  applyMicroHoleShapeKeywords(normalized, target, notes);

  if (containsAny(normalized, ["分割型"])) {
    setCutoutMode("kaleido", "切换到分割型方案");
  }
  if (containsAny(normalized, ["镂空型"])) {
    setCutoutMode("panel", "切换到镂空型方案");
  }
  if (containsAny(normalized, ["打孔型"])) {
    setCutoutMode("micro", "切换到打孔型方案");
  }

  [
    { words: ["三边形", "三角"], value: 3 },
    { words: ["四边形", "四角"], value: 4 },
    { words: ["五边形", "五角"], value: 5 },
    { words: ["六边形", "六角"], value: 6 },
    { words: ["七边形", "七角"], value: 7 },
    { words: ["八边形", "八角"], value: 8 },
    { words: ["九边形", "九角"], value: 9 },
    { words: ["十边形", "十角"], value: 10 },
  ].forEach((item) => {
    if (containsAny(normalized, item.words)) {
      target.polygonSides = clampToSlider("polygonSides", item.value);
    }
  });

  if (containsAny(normalized, ["分割型", "万花筒", "拼图", "拼片", "放射", "径向切分"])) {
    setCutoutMode("kaleido", "切换到万花筒 / 拼图式分割方案");
  }
  if (containsAny(normalized, ["同形内镂空", "相似形镂空", "面内镂空", "每个面都镂空", "相似轮廓孔"])) {
    setCutoutMode("panel", "切换到面内相似轮廓开孔方案");
  }
  if (containsAny(normalized, ["参数化小孔", "微孔", "小孔", "渐变孔", "随机孔"])) {
    setCutoutMode("micro", "切换到关系化渐变微孔方案");
  }

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
  if (containsAny(normalized, ["更多分割", "更像万花筒", "拼图感更强", "更像拼片"])) {
    setCutoutMode("kaleido");
    bump("cutoutScale", 5);
    bump("polygonSides", 1);
    notes.push("强化分割型的万花筒 / 拼图式切分关系");
  }
  if (containsAny(normalized, ["每个面都开孔", "相似轮廓", "同形孔", "同形内镂空"])) {
    setCutoutMode("panel");
    bump("cutoutScale", 4);
    notes.push("让每块折面都采用相似轮廓的内部开孔");
  }
  if (containsAny(normalized, ["单层", "一层"])) {
    target.panelLayers = 1;
    notes.push("切换到单层同形面片");
  }
  if (containsAny(normalized, ["双层", "两层", "二层"])) {
    target.panelLayers = 2;
    notes.push("切换到双层同形面片");
  }
  if (containsAny(normalized, ["三层"])) {
    target.panelLayers = 3;
    notes.push("切换到三层同形面片");
  }
  if (containsAny(normalized, ["四层"])) {
    target.panelLayers = 4;
    notes.push("切换到四层同形面片");
  }
  if (containsAny(normalized, ["更多层", "层级更多", "层数更多", "多层"])) {
    bump("panelLayers", 1);
    notes.push("增加同形面片层级");
  }
  if (containsAny(normalized, ["更少层", "层级更少", "层数更少"])) {
    bump("panelLayers", -1);
    notes.push("减少同形面片层级");
  }
  if (containsAny(normalized, ["渐变小孔", "规律小孔", "参数化小孔", "微孔渐变"])) {
    setCutoutMode("micro");
    bump("cutoutScale", 5);
    notes.push("切换到有规律变化的参数化小孔系统");
  }
  if (containsAny(normalized, ["更多镂空", "镂空更大", "开孔更多", "更透空"])) {
    bump("cutoutScale", 7);
    notes.push("增大整体镂空尺度");
  }
  if (containsAny(normalized, ["少一点镂空", "减少镂空", "更完整", "更封闭"])) {
    bump("cutoutScale", -8);
    notes.push("减小外壁镂空，提升整体性");
  }
  if (containsAny(normalized, ["镂空更尖", "孔洞更尖", "穿孔更尖"])) {
    bump("cutoutSharpness", 8);
    notes.push("拉长镂空尖角");
  }
  if (containsAny(normalized, ["镂空靠上", "孔洞靠上", "镂空偏上", "开孔偏上"])) {
    bump("cutoutBand", -10);
    notes.push("把镂空带上移到更靠近外缘的位置");
  }
  if (containsAny(normalized, ["镂空靠下", "孔洞靠下", "镂空偏下", "开孔偏下"])) {
    bump("cutoutBand", 10);
    notes.push("把镂空带下移到更接近中部的位置");
  }
  if (containsAny(normalized, ["边数更多", "边数增加", "更多边"])) {
    bump("polygonSides", 1);
    notes.push("提高多边形边数，让图样更密");
  }
  if (containsAny(normalized, ["边数更少", "边数降低", "更少边"])) {
    bump("polygonSides", -1);
    notes.push("降低多边形边数，让图样更清晰");
  }

  if (target.cutoutMode === "micro") {
    target.cutoutSharpness = state.cutoutSharpness;
  }

  if (target.cutoutMode === "panel") {
    target.polygonSides = target.polygonSides <= 3 ? 3 : 4;
  }

  return {
    target,
    diffs: collectDiff(target),
    notes,
  };
}

function applyTargetState(target, statusMessage) {
  Object.keys(target).forEach((key) => {
    if (key === "cutoutMode") {
      setModeValue(target[key]);
    } else {
      state[key] = target[key];
    }
  });
  if (state.cutoutMode === "panel") {
    state.polygonSides = state.polygonSides <= 3 ? 3 : 4;
  }
  renderAll(statusMessage);
}

function handleAIPrompt() {
  const prompt = elements.aiPrompt.value.trim();
  if (!prompt) {
    assistantMessages.push({
      role: "assistant",
      text:
        "请先输入你的需求。推荐格式是：方案模式 + 轮廓倾向 + 镂空方式 + 镂空尺度 + 多边形边数 + 尺寸限制。例如“分割型、六边形、整体更浅、镂空带偏上、厚度 5 mm、半径 150”。",
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
        "这次我没有识别出明确的参数变化。你可以直接说“切换到分割型”“做成六边形”“同形内镂空”“参数化小孔”“镂空带偏上”“半径 150”“高度 60”“折面 24”等更具体的设计指令。",
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
      "对话已清空。继续按“方案模式 + 轮廓倾向 + 镂空方式 + 镂空尺度 + 多边形边数 + 尺寸限制”的格式描述，我会重新生成一组参数。",
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

elements.exportModelButton.addEventListener("click", () => {
  try {
    downloadObjModel();
    elements.statusLine.textContent = "已导出当前果盘的 OBJ 三维模型，可继续用于 Rhino、Cura 或 3D 打印前检查。";
  } catch (error) {
    console.error(error);
    elements.statusLine.textContent = "OBJ 导出失败，请先确认三维预览已经成功加载。";
  }
});

elements.buyButton.addEventListener("click", () => {
  elements.statusLine.textContent = "当前仍为设计原型界面，暂未接入真实下单与支付流程。";
});

elements.descriptionButton.addEventListener("click", () => {
  generateProductDescription();
});

elements.heroImageButton.addEventListener("click", () => {
  generateAIHeroImage();
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

const restoredFromStorage = restoreStateFromStorage();
if (restoredFromStorage) {
  assistantMessages.push({
    role: "assistant",
    text: "已自动恢复你上次保存的参数快照。你可以继续拖动滑块，也可以直接切换到新的快速方案。",
  });
}

hasHydratedState = true;
renderAssistantFeed();
renderAll(
  restoredFromStorage
    ? "已恢复上次保存的参数快照，顶视图、价格与当前方案摘要已同步刷新。"
    : "顶视图、镂空参数和 AI 需求对话已经初始化，正在尝试加载三维金属预览。"
);
bootstrapThreeScene();

elements.presetButtons.forEach((button) => {
  button.addEventListener("click", () => {
    applyPreset(button.dataset.preset);
  });
});

elements.modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.mode === state.cutoutMode) {
      return;
    }

    applyTargetState(
      { ...getStateSnapshot(), cutoutMode: button.dataset.mode },
      `已切换到「${modeDefinitions[button.dataset.mode].label}」，顶视图与三维逻辑已按新的孔洞方案重算。`
    );
  });
});

elements.microHoleShapeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const nextShape = button.dataset.holeShape;
    if (!microHoleShapeDefinitions[nextShape]) {
      return;
    }

    setMicroHoleShape(nextShape);
    if (state.cutoutMode !== "micro") {
      setModeValue("micro");
    }
    renderAll(`已切换为「${microHoleShapeDefinitions[nextShape].label}」孔型，小孔分布与三维预览已同步更新。`);
  });
});

elements.copyParamsButton.addEventListener("click", copyCurrentParams);
elements.resetButton.addEventListener("click", resetToDefaults);
