const MATERIAL_TIME_UNITS_PER_SECOND = Object.freeze({
  CircleGridShaderMaterial: 0.6,
  DynamicCheckerboardShaderMaterial: 0.6,
  SlowSmokeShaderMaterial: 0.6,
  StreamerWallShaderMaterial: 0.6,
  FlickerShaderMaterial: 1.2,
  WaterShaderMaterial: 1.2,
  FireShaderMaterial: 1.2,
  BrickShaderMaterial: 1.2,
  PipelineWaterFlowShaderMaterial: 1.2,
  PipelineWaterFlowRefractionShaderMaterial: 1.2,
});

const MAX_FRAME_DELTA_SECONDS = 0.1;

function materialClassByUuid(metadata) {
  const classMap = metadata?._ShaderMaterialClassMap;
  if (!classMap || typeof classMap !== 'object') return new Map();

  return new Map(Object.entries(classMap)
    .filter(([className, uuid]) => (
      Object.hasOwn(MATERIAL_TIME_UNITS_PER_SECOND, className)
      && typeof uuid === 'string'
    ))
    .map(([className, uuid]) => [uuid, className]));
}

export function collectWebTopoMaterialAnimations(root, metadata = {}) {
  const classByUuid = materialClassByUuid(metadata);
  const seenMaterials = new Set();
  const animations = [];

  root?.traverse((object) => {
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.filter(Boolean).forEach((material) => {
      if (seenMaterials.has(material)) return;

      const className = classByUuid.get(material.uuid)
        || (Object.hasOwn(MATERIAL_TIME_UNITS_PER_SECOND, material.name) ? material.name : '');
      const timeUniform = material.uniforms?.uTime;
      if (!className || !Number.isFinite(timeUniform?.value)) return;

      seenMaterials.add(material);
      animations.push({
        material,
        timeUnitsPerSecond: MATERIAL_TIME_UNITS_PER_SECOND[className],
      });
    });
  });

  return animations;
}

export function updateWebTopoMaterialAnimations(animations, deltaSeconds) {
  if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return;
  const elapsed = Math.min(deltaSeconds, MAX_FRAME_DELTA_SECONDS);

  animations.forEach(({ material, timeUnitsPerSecond }) => {
    const timeUniform = material.uniforms?.uTime;
    if (!Number.isFinite(timeUniform?.value)) return;
    timeUniform.value += timeUnitsPerSecond * elapsed;
  });
}
