// ============================================================================
// Bot AI Web Worker
// 将 Bot AI 计算移到后台线程，减少主线程负载
// ============================================================================

// ==================== 工具函数 ====================

function v3(x, y, z) {
  return { x, y, z };
}

function v3add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function v3sub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function v3scale(a, s) {
  return { x: a.x * s, y: a.y * s, z: a.z * s };
}

function v3dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function v3cross(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function v3len(a) {
  return Math.hypot(a.x, a.y, a.z);
}

function v3norm(a) {
  const L = v3len(a);
  if (L <= 1e-8) return { x: 0, y: 0, z: 0 };
  return { x: a.x / L, y: a.y / L, z: a.z / L };
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function forwardFromYawPitch(yaw, pitch) {
  const cp = Math.cos(pitch);
  return v3(Math.sin(yaw) * cp, Math.sin(pitch), Math.cos(yaw) * cp);
}

function aabbFromCenter(p, half) {
  return {
    min: v3(p.x - half.x, p.y - half.y, p.z - half.z),
    max: v3(p.x + half.x, p.y + half.y, p.z + half.z),
  };
}

function aabbIntersectsEps(a, b, eps) {
  return (
    a.min.x < b.max.x - eps &&
    a.max.x > b.min.x + eps &&
    a.min.y < b.max.y - eps &&
    a.max.y > b.min.y + eps &&
    a.min.z < b.max.z - eps &&
    a.max.z > b.min.z + eps
  );
}

function rayAabb(ro, rd, box) {
  const invX = 1 / (Math.abs(rd.x) < 1e-8 ? 1e-8 : rd.x);
  const invY = 1 / (Math.abs(rd.y) < 1e-8 ? 1e-8 : rd.y);
  const invZ = 1 / (Math.abs(rd.z) < 1e-8 ? 1e-8 : rd.z);

  let tmin = (box.min.x - ro.x) * invX;
  let tmax = (box.max.x - ro.x) * invX;
  if (tmin > tmax) [tmin, tmax] = [tmax, tmin];

  let tymin = (box.min.y - ro.y) * invY;
  let tymax = (box.max.y - ro.y) * invY;
  if (tymin > tymax) [tymin, tymax] = [tymax, tymin];
  if (tmin > tymax || tymin > tmax) return null;
  tmin = Math.max(tmin, tymin);
  tmax = Math.min(tmax, tymax);

  let tzmin = (box.min.z - ro.z) * invZ;
  let tzmax = (box.max.z - ro.z) * invZ;
  if (tzmin > tzmax) [tzmin, tzmax] = [tzmax, tzmin];
  if (tmin > tzmax || tzmin > tmax) return null;
  tmin = Math.max(tmin, tzmin);
  tmax = Math.min(tmax, tzmax);

  if (tmax < 0) return null;
  return tmin >= 0 ? tmin : tmax;
}

// ==================== 碰撞检测 ====================

function playerAabb(pos) {
  const half = v3(0.3, 0.9, 0.3);
  const center = v3(pos.x, pos.y + half.y, pos.z);
  return aabbFromCenter(center, half);
}

function moveAndCollide(pos, delta, colliders) {
  let p = { x: pos.x, y: pos.y, z: pos.z };
  let onGround = false;

  const eps = 1e-4;

  if (delta.x !== 0) {
    p.x += delta.x;
    let a = playerAabb(p);
    for (const c of colliders) {
      if (!aabbIntersectsEps(a, c, eps)) continue;
      if (delta.x > 0) p.x = Math.min(p.x, c.min.x - 0.3);
      else p.x = Math.max(p.x, c.max.x + 0.3);
      a = playerAabb(p);
    }
  }

  if (delta.z !== 0) {
    p.z += delta.z;
    let a = playerAabb(p);
    for (const c of colliders) {
      if (!aabbIntersectsEps(a, c, eps)) continue;
      if (delta.z > 0) p.z = Math.min(p.z, c.min.z - 0.3);
      else p.z = Math.max(p.z, c.max.z + 0.3);
      a = playerAabb(p);
    }
  }

  if (delta.y !== 0) {
    p.y += delta.y;
    let a = playerAabb(p);
    for (const c of colliders) {
      if (!aabbIntersectsEps(a, c, eps)) continue;
      if (delta.y > 0) p.y = Math.min(p.y, c.min.y - 1.8);
      else {
        p.y = Math.max(p.y, c.max.y);
        onGround = true;
      }
      a = playerAabb(p);
    }
  }

  return { pos: p, onGround };
}

// ==================== A* 寻路 ====================

let NAV_GRID_SIZE = 56;
let NAV_GRID_ORIGIN = -28;
let gameMapBounds = 28;
let gameGrid = [];

function worldToGrid(x, z) {
  const gx = Math.floor((x - NAV_GRID_ORIGIN) / (gameMapBounds * 2 / NAV_GRID_SIZE));
  const gz = Math.floor((z - NAV_GRID_ORIGIN) / (gameMapBounds * 2 / NAV_GRID_SIZE));
  return { x: clamp(gx, 0, NAV_GRID_SIZE - 1), z: clamp(gz, 0, NAV_GRID_SIZE - 1) };
}

function gridToWorld(gx, gz) {
  const x = NAV_GRID_ORIGIN + (gx + 0.5) * (gameMapBounds * 2 / NAV_GRID_SIZE);
  const z = NAV_GRID_ORIGIN + (gz + 0.5) * (gameMapBounds * 2 / NAV_GRID_SIZE);
  return v3(x, 0, z);
}

function isWalkable(gx, gz) {
  if (gx < 0 || gx >= NAV_GRID_SIZE || gz < 0 || gz >= NAV_GRID_SIZE) return false;
  return gameGrid[gx][gz] === 0;
}

function heuristic(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
}

function getNeighbors(node) {
  const neighbors = [];
  const directions = [
    { x: 1, z: 0 },
    { x: -1, z: 0 },
    { x: 0, z: 1 },
    { x: 0, z: -1 },
  ];

  for (const dir of directions) {
    const neighbor = { x: node.x + dir.x, z: node.z + dir.z };
    if (isWalkable(neighbor.x, neighbor.z)) {
      neighbors.push(neighbor);
    }
  }

  return neighbors;
}

function findPath(start, end) {
  const startGrid = worldToGrid(start.x, start.z);
  const endGrid = worldToGrid(end.x, end.z);

  // 如果终点不可达，尝试找最近的可通行点
  if (!isWalkable(endGrid.x, endGrid.z)) {
    let found = false;
    for (let r = 1; r < 5 && !found; r++) {
      for (let dx = -r; dx <= r && !found; dx++) {
        for (let dz = -r; dz <= r && !found; dz++) {
          if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue;
          if (isWalkable(endGrid.x + dx, endGrid.z + dz)) {
            endGrid.x += dx;
            endGrid.z += dz;
            found = true;
          }
        }
      }
    }
    if (!found) return null;
  }

  // A* 算法
  const openSet = [startGrid];
  const closedSet = new Set();
  const cameFrom = new Map();

  const gScore = new Map();
  const fScore = new Map();

  const key = (n) => `${n.x},${n.z}`;
  gScore.set(key(startGrid), 0);
  fScore.set(key(startGrid), heuristic(startGrid, endGrid));

  let iterations = 0;
  const maxIterations = 1000;

  while (openSet.length > 0 && iterations < maxIterations) {
    iterations++;

    let current = openSet[0];
    let currentKey = key(current);
    for (const node of openSet) {
      const nodeKey = key(node);
      if ((fScore.get(nodeKey) || Infinity) < (fScore.get(currentKey) || Infinity)) {
        current = node;
        currentKey = nodeKey;
      }
    }

    if (current.x === endGrid.x && current.z === endGrid.z) {
      const path = [];
      let curr = current;
      while (cameFrom.has(key(curr))) {
        path.unshift(gridToWorld(curr.x, curr.z));
        curr = cameFrom.get(key(curr));
      }
      return path.length > 0 ? path : [gridToWorld(endGrid.x, endGrid.z)];
    }

    openSet.splice(openSet.indexOf(current), 1);
    closedSet.add(currentKey);

    for (const neighbor of getNeighbors(current)) {
      const neighborKey = key(neighbor);
      if (closedSet.has(neighborKey)) continue;

      const tentativeGScore = (gScore.get(currentKey) || 0) + 1;

      if (!openSet.some((n) => n.x === neighbor.x && n.z === neighbor.z)) {
        openSet.push(neighbor);
      } else if (tentativeGScore >= (gScore.get(neighborKey) || Infinity)) {
        continue;
      }

      cameFrom.set(neighborKey, current);
      gScore.set(neighborKey, tentativeGScore);
      fScore.set(neighborKey, tentativeGScore + heuristic(neighbor, endGrid));
    }
  }

  return null;
}

function getRandomPatrolPoint() {
  const attempts = 20;
  for (let i = 0; i < attempts; i++) {
    const x = (Math.random() - 0.5) * gameMapBounds * 1.6;
    const z = (Math.random() - 0.5) * gameMapBounds * 1.6;
    const grid = worldToGrid(x, z);
    if (isWalkable(grid.x, grid.z)) {
      return v3(x, 0, z);
    }
  }
  return v3(0, 0, 0);
}

// ==================== Worker 逻辑 ====================

let cachedSites = [];
let cachedRouteNodes = { ct: [], t: [] };

function getSiteByKey(key) {
  if (!key) return cachedSites[0] || null;
  for (const s of cachedSites) {
    if (s.key === key) return s;
  }
  return cachedSites[0] || null;
}

function updateBotsInWorker(data) {
  const {
    bots,
    playerPos,
    playerCrouchT,
    playerAlive,
    playerTeam,
    colliders,
    roundState,
    mapBounds,
    grid,
    sites,
    routeNodes,
    dt,
    now
  } = data;

  // 更新全局状态
  gameMapBounds = mapBounds;
  gameGrid = grid;
  cachedSites = sites;
  cachedRouteNodes = routeNodes;

  const tNow = now;
  const playerEye = v3(playerPos.x, playerPos.y + 1.6 - playerCrouchT * 0.55, playerPos.z);
  
  // 缓存活着的 bots
  const aliveBots = bots.filter((x) => x.alive);
  
  const events = [];

  for (const b of bots) {
    if (!b.alive) continue;

    if (b.shootCooldown > 0) b.shootCooldown = Math.max(0, b.shootCooldown - dt);

    const bw = b.weapon;
    if (bw.reloading) {
      bw.reloadLeft -= dt;
      if (bw.reloadLeft <= 0) {
        const take = Math.min(bw.magSize - bw.mag, bw.reserve);
        bw.mag += take;
        bw.reserve -= take;
        bw.reloading = false;
      }
    }

    const lookFrom = v3(b.pos.x, b.pos.y + 1.6, b.pos.z);

    let bestEnemy = null;
    let bestEnemyDist = Infinity;
    for (const other of aliveBots) {
      if (other.id === b.id) continue;
      if (other.team === b.team) continue;
      const oEye = v3(other.pos.x, other.pos.y + 1.6, other.pos.z);
      const d = v3sub(oEye, lookFrom);
      const L = v3len(d);
      if (L < bestEnemyDist) {
        bestEnemyDist = L;
        bestEnemy = other;
      }
    }

    let targetType = 'none';
    let targetBot = null;
    let targetPos = null;
    let dist = Infinity;

    if (bestEnemy) {
      targetType = 'bot';
      targetBot = bestEnemy;
      targetPos = v3(bestEnemy.pos.x, bestEnemy.pos.y + 1.6, bestEnemy.pos.z);
      dist = bestEnemyDist;
    }

    if (playerAlive && playerTeam !== b.team) {
      const dPlayer = v3len(v3sub(playerEye, lookFrom));
      if (dPlayer < dist) {
        targetType = 'player';
        targetBot = null;
        targetPos = playerEye;
        dist = dPlayer;
      }
    }

    if (!roundState.bombPlanted && b.team === 't') {
      const pick = getSiteByKey(b.objectiveSite) || getSiteByKey(roundState.activeSite) || getSiteByKey('A');
      if (pick && !roundState.activeSite) {
        // 通知主线程更新 activeSite
        roundState.activeSite = pick.key;
        events.push({ type: 'setActiveSite', siteKey: pick.key });
      }
      if (pick) b.objectiveSite = pick.key;
      if (pick) {
        events.push({ type: 'setRoundSite', site: pick });
      }
      const site = pick ? pick.pos : roundState.sitePos;
      const dSite = v3len(v3sub(v3(site.x, lookFrom.y, site.z), lookFrom));
      if (dSite < dist) {
        targetType = 'site';
        targetBot = null;
        targetPos = v3(site.x, lookFrom.y, site.z);
        dist = dSite;
      }
    }

    if (roundState.bombPlanted && b.team === 'ct') {
      const defSite = getSiteByKey(roundState.plantSite) || getSiteByKey(roundState.activeSite) || getSiteByKey('A');
      if (defSite) {
        events.push({ type: 'setRoundSite', site: defSite });
      }
      const site = defSite ? defSite.pos : roundState.sitePos;
      const dSite = v3len(v3sub(v3(site.x, lookFrom.y, site.z), lookFrom));
      if (dSite < dist) {
        targetType = 'site';
        targetBot = null;
        targetPos = v3(site.x, lookFrom.y, site.z);
        dist = dSite;
      }
    }

    if (!targetPos) continue;

    const toTarget = v3sub(targetPos, lookFrom);
    const dir = dist > 1e-5 ? v3scale(toTarget, 1 / dist) : v3(0, 0, 1);
    b.yaw = Math.atan2(dir.x, dir.z);
    let occluded = false;
    for (const c of colliders) {
      const t = rayAabb(lookFrom, dir, c);
      if (t !== null && t > 0 && t < dist) {
        occluded = true;
        break;
      }
    }

    const shouldChase = dist < 18 && !occluded;
    b.state = shouldChase ? 'chase' : 'patrol';

    // 反应时间逻辑
    const hasValidTarget = shouldChase && targetType !== 'site';
    if (hasValidTarget && b.firstSawEnemyTime === null) {
      b.firstSawEnemyTime = tNow;
    }
    if (!hasValidTarget) {
      b.firstSawEnemyTime = null;
    }
    const reactionTime = b.reactionTime || 180;
    const actualReactionTime = reactionTime * (0.7 + Math.random() * 0.6);
    const canShoot = b.firstSawEnemyTime !== null && (tNow - b.firstSawEnemyTime) >= actualReactionTime;

    let wish = v3(0, 0, 0);
    if (b.state === 'chase') {
      if (!b.navPath || b.navIndex >= b.navPath.length || !b.navGoal || v3len(v3sub(targetPos, b.navGoal)) > 2) {
        b.navGoal = targetPos;
        b.navPath = findPath(v3(b.pos.x, 0, b.pos.z), v3(targetPos.x, 0, targetPos.z));
        b.navIndex = 0;
      }

      if (b.navPath && b.navIndex < b.navPath.length) {
        const nextPoint = b.navPath[b.navIndex];
        const toNext = v3sub(nextPoint, v3(b.pos.x, 0, b.pos.z));
        const distNext = v3len(toNext);

        if (distNext < 1.0) {
          b.navIndex++;
        } else {
          wish = v3norm(toNext);
        }
      } else {
        wish = v3(dir.x, 0, dir.z);
      }

      if (dist < 4.2) wish = v3scale(wish, -0.25);
    } else {
      if (!b.navPath || b.navIndex >= b.navPath.length) {
        const target = getRandomPatrolPoint();
        b.navGoal = target;
        b.navPath = findPath(v3(b.pos.x, 0, b.pos.z), target);
        b.navIndex = 0;
      }

      if (b.navPath && b.navIndex < b.navPath.length) {
        const nextPoint = b.navPath[b.navIndex];
        const toNext = v3sub(nextPoint, v3(b.pos.x, 0, b.pos.z));
        const distNext = v3len(toNext);

        if (distNext < 1.0) {
          b.navIndex++;
        } else {
          wish = v3norm(toNext);
        }
      } else {
        const nodes = cachedRouteNodes[b.team] || cachedRouteNodes.ct;
        const targetNode = nodes[b.patrolNode % nodes.length];
        const toNode = v3sub(targetNode, v3(b.pos.x, 0, b.pos.z));
        const distNode = v3len(toNode);
        if (distNode < 1.5) {
          b.patrolNode = (b.patrolNode + 1 + Math.floor(Math.random() * 2)) % nodes.length;
        }
        wish = v3norm(toNode);
      }
    }
    wish = v3norm(wish);

    const speed = b.state === 'chase' ? 2.8 : 1.6;
    b.vel.x = wish.x * speed;
    b.vel.z = wish.z * speed;
    b.vel.y += -18.5 * dt;
    b.vel.y = Math.max(b.vel.y, -30);

    const next = moveAndCollide(v3(b.pos.x, b.pos.y, b.pos.z), v3scale(b.vel, dt), colliders);
    b.pos = next.pos;
    if (next.onGround && b.vel.y < 0) b.vel.y = 0;

    b.pos.x = clamp(b.pos.x, -mapBounds + 0.3, mapBounds - 0.3);
    b.pos.z = clamp(b.pos.z, -mapBounds + 0.3, mapBounds - 0.3);

    const onSite = v3len(v3sub(v3(b.pos.x, 0, b.pos.z), v3(roundState.sitePos.x, 0, roundState.sitePos.z))) <= roundState.siteRadius;
    if (!roundState.bombPlanted && b.team === 't' && onSite) {
      events.push({ type: 'tPlanting', value: true });
    }
    if (roundState.bombPlanted && b.team === 'ct' && onSite) {
      events.push({ type: 'ctDefusing', value: true });
    }

    if (shouldChase && dist < 24 && !occluded && b.shootCooldown <= 0 && targetType !== 'site' && canShoot) {
      if (!bw.reloading && bw.mag <= 0) {
        bw.reloading = true;
        bw.reloadTotal = bw.reloadSec;
        bw.reloadLeft = bw.reloadSec;
      }

      if (!bw.reloading && bw.mag > 0) {
        bw.mag -= 1;

        const cooldown = 60 / bw.rpm;
        b.shootCooldown = cooldown * (1.45 + Math.random() * 0.6);

        const spread = (bw.spreadDeg * Math.PI) / 180;
        const sx = (Math.random() - 0.5) * spread;
        const sy = (Math.random() - 0.5) * spread;
        const shotDir = v3norm(forwardFromYawPitch(b.yaw + sx, sy));

        const muzzle = v3add(lookFrom, v3add(v3scale(v3norm(v3cross(v3(0, 1, 0), shotDir)), 0.18), v3scale(shotDir, 0.55)));
        const end = v3add(muzzle, v3scale(shotDir, Math.min(dist + 4, 80)));

        let blocked = false;
        for (const ally of aliveBots) {
          if (!ally.alive) continue;
          if (ally.id === b.id) continue;
          if (ally.team !== b.team) continue;
          const center = v3(ally.pos.x, ally.pos.y + ally.half.y, ally.pos.z);
          const aabb = aabbFromCenter(center, ally.half);
          const tHit = rayAabb(muzzle, shotDir, aabb);
          if (tHit !== null && tHit > 0 && tHit < dist) {
            blocked = true;
            break;
          }
        }

        if (!blocked && playerAlive && playerTeam === b.team) {
          const pAabb = playerAabb(playerPos);
          const tHit = rayAabb(muzzle, shotDir, pAabb);
          if (tHit !== null && tHit > 0 && tHit < dist) {
            blocked = true;
          }
        }

        if (blocked) {
          b.shootCooldown = 0.18;
          continue;
        }

        // 创建射击事件（曳光弹在主线程创建）
        events.push({
          type: 'shoot',
          botId: b.id,
          muzzle: muzzle,
          end: end,
          hue: 0.02
        });

        const hitChance = clamp01((26 - dist) / 26);
        if (Math.random() < 0.02 + 0.11 * hitChance) {
          if (targetType === 'player') {
            if (playerTeam === b.team) {
              b.shootCooldown = 0.18;
              continue;
            }
            // 伤害事件在主线程处理
            events.push({
              type: 'damagePlayer',
              botId: b.id,
              damage: bw.damage
            });
          } else if (targetType === 'bot' && targetBot) {
            if (targetBot.team === b.team) {
              b.shootCooldown = 0.18;
              continue;
            }
            targetBot.hp -= bw.damage;
            if (targetBot.hp <= 0) {
              targetBot.alive = false;
              events.push({
                type: 'botDied',
                botId: targetBot.id
              });
            }
          }
        }
      } else {
        b.shootCooldown = 0.18;
      }
    }
  }

  return { bots, events };
}

// ==================== 消息处理 ====================

self.onmessage = function(e) {
  const { type, data } = e.data;

  if (type === 'update') {
    const startTime = performance.now();
    const result = updateBotsInWorker(data);
    const endTime = performance.now();
    
    self.postMessage({
      type: 'result',
      data: result,
      workerTime: endTime - startTime
    });
  }
};
