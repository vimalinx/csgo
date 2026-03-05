#!/bin/bash
# 第十九轮验证脚本

echo "=== 第十九轮迭代验证 ==="
echo ""

echo "1. 检查语法..."
node --check bot-combat.js
if [ $? -eq 0 ]; then
    echo "   ✅ bot-combat.js 语法正确"
else
    echo "   ❌ bot-combat.js 语法错误"
    exit 1
fi

node --check main.js
if [ $? -eq 0 ]; then
    echo "   ✅ main.js 语法正确"
else
    echo "   ❌ main.js 语法错误"
    exit 1
fi

echo ""
echo "2. 检查行数..."
MAIN_LINES=$(wc -l < main.js)
COMBAT_LINES=$(wc -l < bot-combat.js)
echo "   main.js: $MAIN_LINES 行"
echo "   bot-combat.js: $COMBAT_LINES 行"

EXPECTED_MAIN=$((7144 - 80))
if [ $MAIN_LINES -le $EXPECTED_MAIN ]; then
    echo "   ✅ main.js 减少了至少 80 行（当前：$((7144 - MAIN_LINES)) 行）"
else
    echo "   ⚠️  main.js 减少不足 80 行（当前：$((7144 - MAIN_LINES)) 行）"
fi

echo ""
echo "3. 检查新函数导出..."
EXPORTED=$(grep "^export function checkBotReactionTime\|^export function decideBotState" bot-combat.js | wc -l)
if [ $EXPORTED -eq 2 ]; then
    echo "   ✅ 2 个新函数已导出"
else
    echo "   ❌ 新函数导出不完整（预期 2，实际 $EXPORTED）"
    exit 1
fi

echo ""
echo "4. 检查 main.js 导入..."
IMPORTED=$(grep "checkBotReactionTime\|decideBotState" main.js | wc -l)
if [ $IMPORTED -ge 2 ]; then
    echo "   ✅ 新函数已在 main.js 中导入"
else
    echo "   ❌ 新函数未在 main.js 中导入"
    exit 1
fi

echo ""
echo "=== 验证完成 ==="
echo ""
echo "📊 统计："
echo "   - main.js 减少行数：$((7144 - MAIN_LINES))"
echo "   - bot-combat.js 增加行数：$((COMBAT_LINES - 359))"
echo "   - 净减少：$((7144 - MAIN_LINES - (COMBAT_LINES - 359)))"
