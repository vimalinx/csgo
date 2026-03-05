/**
 * CSGO 服务器端反作弊系统
 * 基础反作弊实现：速度检测、位置验证、射击验证
 */

// ==================== 配置参数 ====================
const ANTI_CHEAT_CONFIG = {
    // 移动速度限制（单位：units/秒）
    MAX_WALK_SPEED: 250,        // 正常行走
    MAX_RUN_SPEED: 320,         // 奔跑
    MAX_CROUCH_SPEED: 150,      // 蹲下移动
    MAX_JUMP_SPEED: 301.993377, // 跳跃时最大水平速度
    
    // 时间窗口（毫秒）
    SPEED_CHECK_INTERVAL: 100,  // 速度检测间隔
    POSITION_HISTORY_SIZE: 100, // 位置历史记录大小
    
    // 检测阈值
    SPEED_VIOLATION_THRESHOLD: 3,    // 速度违规次数阈值
    POSITION_TELEPORT_THRESHOLD: 500, // 瞬移检测阈值（units）
    AIMBOT_ANGLE_THRESHOLD: 0.1,      // 自瞄检测角度阈值（弧度）
    MAX_REACTION_TIME: 100,           // 最小反应时间（毫秒）
    
    // 射击检测
    MAX_FIRE_RATE: {
        'ak47': 600,   // 发/分钟
        'm4a1': 600,
        'awp': 41,
        'deagle': 267,
        'glock': 400
    },
    
    // 处罚设置
    WARNING_THRESHOLD: 3,    // 警告阈值
    KICK_THRESHOLD: 10,      // 踢出阈值
    BAN_THRESHOLD: 20        // 封禁阈值
};

const WEAPON_RECOIL_PATTERNS = {
    'ak47': [
        {x: 0, y: 0}, {x: -2, y: 30}, {x: -5, y: 50}, {x: -10, y: 70}, {x: -15, y: 85},
        {x: -20, y: 95}, {x: -25, y: 100}, {x: -30, y: 100}, {x: -30, y: 95}, {x: -25, y: 90}
    ],
    'm4a1': [
        {x: 0, y: 0}, {x: -1, y: 25}, {x: -3, y: 45}, {x: -7, y: 60}, {x: -12, y: 72},
        {x: -17, y: 80}, {x: -22, y: 85}, {x: -25, y: 85}, {x: -25, y: 82}, {x: -22, y: 78}
    ],
    'awp': [{x: 0, y: 0}, {x: -10, y: 80}],
    'deagle': [
        {x: 0, y: 0}, {x: -5, y: 45}, {x: -12, y: 70}, {x: -18, y: 85}, {x: -22, y: 92}
    ]
};

// ==================== SpeedLimiter 类 ====================
/**
 * 速度限制器 - 检测玩家移动速度异常
 */
class SpeedLimiter {
    constructor(config = ANTI_CHEAT_CONFIG) {
        this.config = config;
        this.playerSpeedHistory = new Map(); // 玩家速度历史
        this.violations = new Map();         // 违规记录
    }
    
    /**
     * 记录玩家位置并检测速度
     * @param {string} playerId - 玩家ID
     * @param {Object} position - 当前位置 {x, y, z}
     * @param {number} timestamp - 时间戳（毫秒）
     * @param {Object} playerState - 玩家状态 {isCrouching, isRunning, isJumping}
     * @returns {Object} 检测结果
     */
    checkSpeed(playerId, position, timestamp, playerState = {}) {
        // 初始化玩家记录
        if (!this.playerSpeedHistory.has(playerId)) {
            this.playerSpeedHistory.set(playerId, []);
        }
        
        const history = this.playerSpeedHistory.get(playerId);
        
        // 添加当前位置
        history.push({
            position: {...position},
            timestamp: timestamp,
            state: {...playerState}
        });
        
        // 保持历史记录大小
        if (history.length > this.config.POSITION_HISTORY_SIZE) {
            history.shift();
        }
        
        // 需要至少两个点才能计算速度
        if (history.length < 2) {
            return { valid: true };
        }
        
        // 获取最近两个位置点
        const current = history[history.length - 1];
        const previous = history[history.length - 2];
        
        // 计算时间差（秒）
        const timeDiff = (current.timestamp - previous.timestamp) / 1000;
        
        if (timeDiff <= 0) {
            return { valid: true };
        }
        
        // 计算移动距离
        const distance = this.calculateDistance(previous.position, current.position);
        
        // 计算速度（units/秒）
        const speed = distance / timeDiff;
        
        // 根据玩家状态确定最大速度
        let maxSpeed = this.config.MAX_WALK_SPEED;
        
        if (playerState.isCrouching) {
            maxSpeed = this.config.MAX_CROUCH_SPEED;
        } else if (playerState.isJumping) {
            maxSpeed = this.config.MAX_JUMP_SPEED;
        } else if (playerState.isRunning) {
            maxSpeed = this.config.MAX_RUN_SPEED;
        }
        
        // 容错范围（±10%）
        maxSpeed *= 1.1;
        
        // 检测是否超速
        const isViolation = speed > maxSpeed;
        
        if (isViolation) {
            // 记录违规
            if (!this.violations.has(playerId)) {
                this.violations.set(playerId, {
                    speedViolations: 0,
                    lastViolation: null
                });
            }
            
            const playerViolations = this.violations.get(playerId);
            playerViolations.speedViolations++;
            playerViolations.lastViolation = {
                speed: speed,
                maxSpeed: maxSpeed,
                timestamp: timestamp,
                position: {...position}
            };
        }
        
        return {
            valid: !isViolation,
            speed: speed,
            maxSpeed: maxSpeed,
            violations: this.violations.get(playerId)?.speedViolations || 0
        };
    }
    
    /**
     * 计算两点之间的距离
     */
    calculateDistance(pos1, pos2) {
        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        const dz = pos2.z - pos1.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    
    /**
     * 获取玩家违规统计
     */
    getPlayerViolations(playerId) {
        return this.violations.get(playerId) || { speedViolations: 0 };
    }
    
    /**
     * 重置玩家违规记录
     */
    resetPlayer(playerId) {
        this.playerSpeedHistory.delete(playerId);
        this.violations.delete(playerId);
    }
}

// ==================== PositionValidator 类 ====================
/**
 * 位置验证器 - 检测瞬移、穿墙等异常位置
 */
class PositionValidator {
    constructor(mapBounds = null, config = ANTI_CHEAT_CONFIG) {
        this.config = config;
        this.playerPositions = new Map();
        this.mapBounds = mapBounds; // 地图边界 {min: {x, y, z}, max: {x, y, z}}
        this.violations = new Map();
    }
    
    /**
     * 验证玩家位置合法性
     * @param {string} playerId - 玩家ID
     * @param {Object} position - 当前位置 {x, y, z}
     * @param {number} timestamp - 时间戳
     * @returns {Object} 验证结果
     */
    validatePosition(playerId, position, timestamp) {
        const issues = [];
        
        // 初始化玩家位置历史
        if (!this.playerPositions.has(playerId)) {
            this.playerPositions.set(playerId, []);
        }
        
        const history = this.playerPositions.get(playerId);
        
        // 1. 检测地图边界
        if (this.mapBounds) {
            if (this.isOutOfBounds(position)) {
                issues.push({
                    type: 'OUT_OF_BOUNDS',
                    position: {...position},
                    timestamp: timestamp
                });
            }
        }
        
        // 2. 检测瞬移
        if (history.length > 0) {
            const lastPos = history[history.length - 1];
            const distance = this.calculateDistance(lastPos.position, position);
            const timeDiff = timestamp - lastPos.timestamp;
            
            // 如果距离超过瞬移阈值且时间间隔合理（非复活）
            if (distance > this.config.POSITION_TELEPORT_THRESHOLD && timeDiff > 1000) {
                issues.push({
                    type: 'TELEPORT',
                    distance: distance,
                    timeDiff: timeDiff,
                    fromPosition: {...lastPos.position},
                    toPosition: {...position},
                    timestamp: timestamp
                });
            }
        }
        
        // 3. 检测无效坐标（NaN, Infinity等）
        if (!this.isValidPosition(position)) {
            issues.push({
                type: 'INVALID_COORDINATES',
                position: {...position},
                timestamp: timestamp
            });
        }
        
        // 记录位置
        history.push({
            position: {...position},
            timestamp: timestamp
        });
        
        // 保持历史记录大小
        if (history.length > this.config.POSITION_HISTORY_SIZE) {
            history.shift();
        }
        
        // 记录违规
        if (issues.length > 0) {
            if (!this.violations.has(playerId)) {
                this.violations.set(playerId, {
                    positionViolations: 0,
                    issues: []
                });
            }
            
            const playerViolations = this.violations.get(playerId);
            playerViolations.positionViolations += issues.length;
            playerViolations.issues.push(...issues);
            
            // 只保留最近100个问题
            if (playerViolations.issues.length > 100) {
                playerViolations.issues = playerViolations.issues.slice(-100);
            }
        }
        
        return {
            valid: issues.length === 0,
            issues: issues,
            violations: this.violations.get(playerId)?.positionViolations || 0
        };
    }
    
    /**
     * 检测位置是否超出地图边界
     */
    isOutOfBounds(position) {
        if (!this.mapBounds) return false;
        
        const { min, max } = this.mapBounds;
        return (
            position.x < min.x || position.x > max.x ||
            position.y < min.y || position.y > max.y ||
            position.z < min.z || position.z > max.z
        );
    }
    
    /**
     * 检测坐标是否有效
     */
    isValidPosition(position) {
        return (
            typeof position.x === 'number' && 
            typeof position.y === 'number' && 
            typeof position.z === 'number' &&
            isFinite(position.x) && 
            isFinite(position.y) && 
            isFinite(position.z) &&
            !isNaN(position.x) && 
            !isNaN(position.y) && 
            !isNaN(position.z)
        );
    }
    
    /**
     * 计算两点距离
     */
    calculateDistance(pos1, pos2) {
        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        const dz = pos2.z - pos1.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    
    /**
     * 获取玩家违规记录
     */
    getPlayerViolations(playerId) {
        return this.violations.get(playerId) || { positionViolations: 0, issues: [] };
    }
    
    /**
     * 重置玩家记录
     */
    resetPlayer(playerId) {
        this.playerPositions.delete(playerId);
        this.violations.delete(playerId);
    }
    
    /**
     * 设置地图边界
     */
    setMapBounds(bounds) {
        this.mapBounds = bounds;
    }
}

// ==================== RecoilPatternValidator 类 ====================
/**
 * 后座力模式验证器 - 检测无后座异常
 */
class RecoilPatternValidator {
    validateRecoilPattern(weapon, shots) {
        const expectedPattern = WEAPON_RECOIL_PATTERNS[weapon];
        if (!expectedPattern || shots.length < 3) return { valid: true };
        
        const actualPattern = this.calculatePattern(shots);
        const deviation = this.calculateDeviation(expectedPattern, actualPattern);
        
        if (deviation < 0.3) {
            return { valid: false, reason: 'NO_RECOIL_SUSPECTED', deviation };
        }
        return { valid: true };
    }
    
    calculatePattern(shots) {
        return shots.map((shot, i) => {
            if (i === 0) return { x: 0, y: 0 };
            return { x: shot.x - shots[0].x, y: shot.y - shots[0].y };
        });
    }
    
    calculateDeviation(expected, actual) {
        let totalDeviation = 0;
        const len = Math.min(expected.length, actual.length);
        
        for (let i = 0; i < len; i++) {
            const dx = expected[i].x - actual[i].x;
            const dy = expected[i].y - actual[i].y;
            totalDeviation += Math.sqrt(dx * dx + dy * dy);
        }
        return totalDeviation / len;
    }
}

// ==================== ShootValidator 类 ====================
/**
 * 射击验证器 - 检测异常射击行为（自瞄、射速异常等）
 */
class ShootValidator {
    constructor(config = ANTI_CHEAT_CONFIG) {
        this.config = config;
        this.recoilValidator = new RecoilPatternValidator();
        this.playerShots = new Map();  // 玩家射击记录
        this.violations = new Map();   // 违规记录
    }
    
    /**
     * 验证射击行为
     * @param {string} playerId - 玩家ID
     * @param {Object} shootData - 射击数据
     * @param {string} shootData.weapon - 武器名称
     * @param {Object} shootData.position - 射击位置 {x, y, z}
     * @param {Object} shootData.viewAngles - 视角 {yaw, pitch}
     * @param {Object} shootData.targetPosition - 目标位置（如果命中）
     * @param {number} shootData.timestamp - 时间戳
     * @returns {Object} 验证结果
     */
    validateShot(playerId, shootData) {
        const issues = [];
        
        // 初始化玩家射击记录
        if (!this.playerShots.has(playerId)) {
            this.playerShots.set(playerId, {
                shots: [],
                lastShot: null
            });
        }
        
        const playerData = this.playerShots.get(playerId);
        const { weapon, position, viewAngles, targetPosition, timestamp } = shootData;
        
        // 1. 检测射速异常
        if (playerData.lastShot) {
            const timeDiff = timestamp - playerData.lastShot.timestamp;
            const fireRateIssue = this.checkFireRate(weapon, timeDiff);
            
            if (fireRateIssue) {
                issues.push(fireRateIssue);
            }
        }
        
        // 2. 检测无后座（需要在 shootData 中包含 recentShots 数组）
        if (shootData.recentShots && shootData.recentShots.length >= 3) {
            const recoilResult = this.recoilValidator.validateRecoilPattern(
                shootData.weapon,
                shootData.recentShots
            );
            
            if (!recoilResult.valid) {
                issues.push({
                    type: recoilResult.reason,
                    weapon: shootData.weapon,
                    deviation: recoilResult.deviation,
                    timestamp: Date.now()
                });
            }
        }
        
        // 3. 检测自瞄（视角瞬间锁定）
        if (playerData.lastShot && targetPosition) {
            const aimbotIssue = this.checkAimbot(
                playerData.lastShot,
                shootData
            );
            
            if (aimbotIssue) {
                issues.push(aimbotIssue);
            }
        }
        
        // 4. 检测异常反应时间
        if (targetPosition) {
            const reactionIssue = this.checkReactionTime(
                playerId,
                shootData
            );
            
            if (reactionIssue) {
                issues.push(reactionIssue);
            }
        }
        
        // 记录射击
        playerData.shots.push({
            ...shootData,
            issues: issues
        });
        
        // 只保留最近200发子弹
        if (playerData.shots.length > 200) {
            playerData.shots.shift();
        }
        
        playerData.lastShot = {
            ...shootData
        };
        
        // 记录违规
        if (issues.length > 0) {
            if (!this.violations.has(playerId)) {
                this.violations.set(playerId, {
                    shootViolations: 0,
                    issues: []
                });
            }
            
            const playerViolations = this.violations.get(playerId);
            playerViolations.shootViolations += issues.length;
            playerViolations.issues.push(...issues);
            
            // 只保留最近100个问题
            if (playerViolations.issues.length > 100) {
                playerViolations.issues = playerViolations.issues.slice(-100);
            }
        }
        
        return {
            valid: issues.length === 0,
            issues: issues,
            violations: this.violations.get(playerId)?.shootViolations || 0
        };
    }
    
    /**
     * 检测射速异常
     */
    checkFireRate(weapon, timeDiff) {
        const maxFireRate = this.config.MAX_FIRE_RATE[weapon];
        
        if (!maxFireRate) return null;
        
        // 计算最小射击间隔（毫秒）
        const minInterval = 60000 / maxFireRate; // 60000ms = 1分钟
        
        // 容错范围（-20%）
        const allowedMinInterval = minInterval * 0.8;
        
        if (timeDiff < allowedMinInterval) {
            return {
                type: 'FIRE_RATE_VIOLATION',
                weapon: weapon,
                timeDiff: timeDiff,
                minInterval: minInterval,
                timestamp: Date.now()
            };
        }
        
        return null;
    }
    
    /**
     * 检测自瞄行为
     */
    checkAimbot(lastShot, currentShot) {
        if (!lastShot.viewAngles || !currentShot.viewAngles) {
            return null;
        }
        
        // 计算视角变化
        const yawDiff = Math.abs(currentShot.viewAngles.yaw - lastShot.viewAngles.yaw);
        const pitchDiff = Math.abs(currentShot.viewAngles.pitch - lastShot.viewAngles.pitch);
        
        // 角度变化过小且命中（可能是自瞄锁定）
        if (yawDiff < this.config.AIMBOT_ANGLE_THRESHOLD && 
            pitchDiff < this.config.AIMBOT_ANGLE_THRESHOLD &&
            currentShot.targetPosition) {
            
            return {
                type: 'AIMBOT_SUSPECTED',
                angleChange: { yaw: yawDiff, pitch: pitchDiff },
                threshold: this.config.AIMBOT_ANGLE_THRESHOLD,
                timestamp: Date.now()
            };
        }
        
        return null;
    }
    
    /**
     * 检测异常反应时间
     */
    checkReactionTime(playerId, shootData) {
        // 这里需要结合敌人出现的时间点
        // 简化版本：检测连续射击的间隔是否异常短（异常快连点）
        
        const playerData = this.playerShots.get(playerId);
        if (!playerData || playerData.shots.length < 3) {
            return null;
        }
        
        // 获取最近几发子弹
        const recentShots = playerData.shots.slice(-5);
        
        // 统计命中时间间隔
        const hitIntervals = [];
        for (let i = 1; i < recentShots.length; i++) {
            if (recentShots[i].targetPosition) {
                hitIntervals.push(
                    recentShots[i].timestamp - recentShots[i-1].timestamp
                );
            }
        }
        
        // 如果平均射击间隔过短（异常快连点）
        if (hitIntervals.length > 0) {
            const avgInterval = hitIntervals.reduce((a, b) => a + b, 0) / hitIntervals.length;
            
            if (avgInterval < 50) { // 50ms内连续射击（人类极限约60-70ms）
                return {
                    type: 'SUPERHUMAN_CLICK_SPEED',
                    avgInterval: avgInterval,
                    threshold: 50,
                    timestamp: Date.now()
                };
            }
        }
        
        return null;
    }
    
    /**
     * 获取玩家违规记录
     */
    getPlayerViolations(playerId) {
        return this.violations.get(playerId) || { shootViolations: 0, issues: [] };
    }
    
    /**
     * 重置玩家记录
     */
    resetPlayer(playerId) {
        this.playerShots.delete(playerId);
        this.violations.delete(playerId);
    }
    
    /**
     * 获取射击统计
     */
    getShootStats(playerId) {
        const playerData = this.playerShots.get(playerId);
        if (!playerData) {
            return {
                totalShots: 0,
                hits: 0,
                accuracy: 0
            };
        }
        
        const totalShots = playerData.shots.length;
        const hits = playerData.shots.filter(s => s.targetPosition).length;
        const accuracy = totalShots > 0 ? (hits / totalShots) * 100 : 0;
        
        return {
            totalShots,
            hits,
            accuracy: accuracy.toFixed(2)
        };
    }
}

// ==================== AntiCheatSystem 主类 ====================
/**
 * 反作弊系统主类
 */
class AntiCheatSystem {
    constructor(options = {}) {
        this.speedLimiter = new SpeedLimiter(options.speedConfig);
        this.positionValidator = new PositionValidator(options.mapBounds, options.positionConfig);
        this.shootValidator = new ShootValidator(options.shootConfig);
        
        this.playerWarnings = new Map();
        this.config = ANTI_CHEAT_CONFIG;
        
        // 事件回调
        this.onViolation = options.onViolation || null;
        this.onWarning = options.onWarning || null;
        this.onKick = options.onKick || null;
    }
    
    /**
     * 检查玩家移动
     */
    checkMovement(playerId, position, playerState) {
        const timestamp = Date.now();
        
        // 速度检测
        const speedResult = this.speedLimiter.checkSpeed(
            playerId, 
            position, 
            timestamp, 
            playerState
        );
        
        // 位置验证
        const positionResult = this.positionValidator.validatePosition(
            playerId,
            position,
            timestamp
        );
        
        // 处理违规
        if (!speedResult.valid) {
            this.handleViolation(playerId, 'SPEED', speedResult);
        }
        
        if (!positionResult.valid) {
            this.handleViolation(playerId, 'POSITION', positionResult);
        }
        
        return {
            speed: speedResult,
            position: positionResult,
            isValid: speedResult.valid && positionResult.valid
        };
    }
    
    /**
     * 检查射击行为
     */
    checkShoot(playerId, shootData) {
        const result = this.shootValidator.validateShot(playerId, {
            ...shootData,
            timestamp: shootData.timestamp || Date.now()
        });
        
        if (!result.valid) {
            this.handleViolation(playerId, 'SHOOT', result);
        }
        
        return result;
    }
    
    /**
     * 处理违规
     */
    handleViolation(playerId, type, data) {
        if (!this.playerWarnings.has(playerId)) {
            this.playerWarnings.set(playerId, {
                total: 0,
                byType: {}
            });
        }
        
        const warnings = this.playerWarnings.get(playerId);
        warnings.total++;
        warnings.byType[type] = (warnings.byType[type] || 0) + 1;
        
        // 触发回调
        if (this.onViolation) {
            this.onViolation(playerId, type, data);
        }
        
        // 检查是否需要警告/踢出/封禁
        if (warnings.total >= this.config.BAN_THRESHOLD) {
            if (this.onKick) {
                this.onKick(playerId, 'BAN', warnings);
            }
        } else if (warnings.total >= this.config.KICK_THRESHOLD) {
            if (this.onKick) {
                this.onKick(playerId, 'KICK', warnings);
            }
        } else if (warnings.total >= this.config.WARNING_THRESHOLD) {
            if (this.onWarning) {
                this.onWarning(playerId, warnings);
            }
        }
    }
    
    /**
     * 获取玩家完整报告
     */
    getPlayerReport(playerId) {
        return {
            speedViolations: this.speedLimiter.getPlayerViolations(playerId),
            positionViolations: this.positionValidator.getPlayerViolations(playerId),
            shootViolations: this.shootValidator.getPlayerViolations(playerId),
            shootStats: this.shootValidator.getShootStats(playerId),
            warnings: this.playerWarnings.get(playerId) || { total: 0, byType: {} }
        };
    }
    
    /**
     * 重置玩家所有记录
     */
    resetPlayer(playerId) {
        this.speedLimiter.resetPlayer(playerId);
        this.positionValidator.resetPlayer(playerId);
        this.shootValidator.resetPlayer(playerId);
        this.playerWarnings.delete(playerId);
    }
    
    /**
     * 设置地图边界
     */
    setMapBounds(bounds) {
        this.positionValidator.setMapBounds(bounds);
    }
}

// ==================== 导出 ====================
// 浏览器环境
if (typeof window !== 'undefined') {
    window.AntiCheatSystem = AntiCheatSystem;
    window.SpeedLimiter = SpeedLimiter;
    window.PositionValidator = PositionValidator;
    window.ShootValidator = ShootValidator;
    window.ANTI_CHEAT_CONFIG = ANTI_CHEAT_CONFIG;
}

// Node.js 环境
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AntiCheatSystem,
        SpeedLimiter,
        PositionValidator,
        ShootValidator,
        ANTI_CHEAT_CONFIG
    };
}
