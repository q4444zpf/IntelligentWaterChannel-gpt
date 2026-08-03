function isGroup(object) {
  return Boolean(object?.isGroup || object?.type === 'Group');
}

function findGroupByName(object, name) {
  if (!object) return null;
  if (isGroup(object) && object.name === name) return object;
  for (const child of object.children || []) {
    const matched = findGroupByName(child, name);
    if (matched) return matched;
  }
  return null;
}

function collectGroupNodes(object) {
  const nodes = [];
  for (const child of object.children || []) {
    if (isGroup(child) && child.visible === false) continue;
    const children = collectGroupNodes(child);
    if (isGroup(child)) {
      nodes.push({
        uuid: child.uuid,
        name: child.name?.trim() || '未命名分组',
        children,
      });
    } else {
      nodes.push(...children);
    }
  }
  return nodes;
}

export function buildGroupTreeUnder(root, groupName) {
  const group = findGroupByName(root, groupName);
  return group && group.visible !== false ? collectGroupNodes(group) : [];
}

export function findNearestSelectableGroup(object, selectableUuids) {
  let current = object;
  while (current) {
    if (isGroup(current) && selectableUuids.has(current.uuid)) return current;
    current = current.parent;
  }
  return null;
}

function isDescendantOf(object, ancestor) {
  let current = object?.parent;
  while (current) {
    if (current === ancestor) return true;
    current = current.parent;
  }
  return false;
}

export function isolateSelectableGroup(selectedGroup, selectableUuids, objectByUuid) {
  const visibilitySnapshot = new Map();
  const selectedPathUuids = new Set();
  let current = selectedGroup;
  while (current) {
    if (current.uuid) selectedPathUuids.add(current.uuid);
    current = current.parent;
  }

  selectableUuids.forEach((uuid) => {
    const object = objectByUuid.get(uuid);
    if (!object) return;
    visibilitySnapshot.set(uuid, object.visible);
    if (selectedPathUuids.has(uuid)) object.visible = true;
    else if (!isDescendantOf(object, selectedGroup)) object.visible = false;
  });
  return visibilitySnapshot;
}

export function restoreSelectableGroupVisibility(visibilitySnapshot, objectByUuid) {
  visibilitySnapshot?.forEach((visible, uuid) => {
    const object = objectByUuid.get(uuid);
    if (object) object.visible = visible;
  });
}
