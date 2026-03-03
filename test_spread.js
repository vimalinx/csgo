// 测试跑射散布系统
// 模拟 Game 类的关键方法

function v3(x, y, z) {
  return { x, y, z };
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

// 移动状态常量
const MOVEMENT_STATES = {
  STANDING: 'standing',
  WALKING: 'walking',
  RUNNING: 'running',
  JUMPING: 'jumping'
};

// 武器定义（简化版）
const WEAPON_DEFS = [
  { id: 'ak47', name: 'AK-47', spreadDeg: 2.6, spreadMultiplier: 1.2 },
  { id: 'm4a1s', name: 'M4A1-S', spreadDeg: 2.2, spreadMultiplier: 1.0 },
  { id: 'awp', name: 'AWP', spreadDeg: 0.28, spreadMultiplier: 2.5 },
  { id: 'glock', name: 'Glock', spreadDeg: 2.1, spreadMultiplier: 1.0 },
  { id: 'mp5', name: 'MP5', spreadDeg: 2.8, spreadMultiplier: 0.9 }
];

// 模拟 Game 类
class Game {
  constructor() {
    this.vel = v3(0, 0, 0);
    this.onGround = true;
    this.weapon = null;
  }

  /**
   * 检测移动状态
   */
  getMovementState() {
    if (!this.onGround) return 'jumping';
    
    const speed = Math.sqrt(this.vel.x ** 2 + this.vel.z ** 2);
    
    if (speed > 6.0) return 'running';
    if (speed > 2.0) return 'walking';
    return 'standing';
  }

  /**
   * 计算最终散布
   */
  calculateSpread() {
    if (!this.weapon) return 0;
    
    const baseSpread = this.weapon.spreadDeg || 2.0;
    const movementState = this.getMovementState();
    
    const MOVEMENT_SPREAD_MULTIPLIERS = {
      standing: 1.0,
      walking: 1.3,
      running: 1.6,
      jumping: 2.0
    };
    
    const movementMultiplier = MOVEMENT_SPREAD_MULTIPLIERS[movementState] || 1.0;
    const weaponMultiplier = this.weapon.spreadMultiplier || 1.0;
    
    return baseSpread * movementMultiplier * weaponMultiplier;
  }
}

// 测试函数
function runTests() {
  const game = new Game();
  
  console.log('='.repeat(60));
  console.log('CSGO 跑射散布系统测试');
  console.log('='.repeat(60));
  
  // 测试1: AK-47 各状态散布
  console.log('\n【测试1】AK-47 各移动状态散布');
  game.weapon = WEAPON_DEFS.find(w => w.id === 'ak47');
  
  const testCases = [
    { state: 'standing', vel: v3(0, 0, 0), onGround: true, expected: 2.6 * 1.0 * 1.2 },
    { state: 'walking', vel: v3(3, 0, 0), onGround: true, expected: 2.6 * 1.3 * 1.2 },
    { state: 'running', vel: v3(7, 0, 0), onGround: true, expected: 2.6 * 1.6 * 1.2 },
    { state: 'jumping', vel: v3(0, 0, 0), onGround: false, expected: 2.6 * 2.0 * 1.2 }
  ];
  
  testCases.forEach(test => {
    game.vel = test.vel;
    game.onGround = test.onGround;
    const spread = game.calculateSpread();
    const state = game.getMovementState();
    const pass = Math.abs(spread - test.expected) < 0.01;
    console.log(`  ${test.state}: ${spread.toFixed(3)}° (期望: ${test.expected.toFixed(3)}°) ${pass ? '✅' : '❌'}`);
  });
  
  // 测试2: 不同武器的静止散布
  console.log('\n【测试2】不同武器静止状态散布');
  game.onGround = true;
  game.vel = v3(0, 0, 0);
  
  WEAPON_DEFS.forEach(weapon => {
    game.weapon = weapon;
    const spread = game.calculateSpread();
    console.log(`  ${weapon.name}: ${spread.toFixed(3)}°`);
  });
  
  // 测试3: AWP 跑射散布
  console.log('\n【测试3】AWP 移动射击散布（应该极大）');
  game.weapon = WEAPON_DEFS.find(w => w.id === 'awp');
  
  const awpTests = [
    { state: 'standing', vel: v3(0, 0, 0), onGround: true },
    { state: 'walking', vel: v3(3, 0, 0), onGround: true },
    { state: 'running', vel: v3(7, 0, 0), onGround: true },
    { state: 'jumping', vel: v3(0, 0, 0), onGround: false }
  ];
  
  awpTests.forEach(test => {
    game.vel = test.vel;
    game.onGround = test.onGround;
    const spread = game.calculateSpread();
    const state = game.getMovementState();
    console.log(`  ${test.state}: ${spread.toFixed(3)}° (倍率 ${(spread / 0.28).toFixed(2)}x)`);
  });
  
  // 测试4: MP5 跑射散布（冲锋枪应该较小）
  console.log('\n【测试4】MP5 移动射击散布（冲锋枪应该较小）');
  game.weapon = WEAPON_DEFS.find(w => w.id === 'mp5');
  
  const mp5Tests = [
    { state: 'standing', vel: v3(0, 0, 0), onGround: true },
    { state: 'walking', vel: v3(3, 0, 0), onGround: true },
    { state: 'running', vel: v3(7, 0, 0), onGround: true },
    { state: 'jumping', vel: v3(0, 0, 0), onGround: false }
  ];
  
  mp5Tests.forEach(test => {
    game.vel = test.vel;
    game.onGround = test.onGround;
    const spread = game.calculateSpread();
    const state = game.getMovementState();
    console.log(`  ${test.state}: ${spread.toFixed(3)}° (倍率 ${(spread / 2.8).toFixed(2)}x)`);
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('测试完成！');
  console.log('='.repeat(60));
}

// 运行测试
runTests();
