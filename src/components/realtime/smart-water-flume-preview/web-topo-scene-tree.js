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
