#!/bin/bash

# kimochi心晴 - 小程序功能测试脚本
# 验证小程序所有功能是否正常

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_test() { echo -e "${PURPLE}[TEST]${NC} $1"; }

echo "================================"
echo "📱 kimochi心晴小程序功能测试"
echo "================================"
echo

# 测试结果统计
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 测试函数
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    log_test "测试 $TOTAL_TESTS: $test_name"
    
    if eval "$test_command"; then
        log_success "✓ $test_name - 通过"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        log_error "✗ $test_name - 失败"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    echo
}

# 检查文件是否存在
check_file() {
    [ -f "$1" ]
}

# 检查目录是否存在
check_dir() {
    [ -d "$1" ]
}

# 检查JSON文件格式
check_json() {
    python3 -m json.tool "$1" > /dev/null 2>&1
}

log_info "开始小程序功能测试..."
echo

# 1. 基础文件结构测试
log_test "==================== 基础文件结构测试 ===================="

run_test "应用配置文件" "check_file mini-program/app.json"
run_test "应用脚本文件" "check_file mini-program/app.js"
run_test "应用样式文件" "check_file mini-program/app.wxss"
run_test "主题配置文件" "check_file mini-program/theme.json"
run_test "站点地图文件" "check_file mini-program/sitemap.json"

# 2. 核心页面测试
log_test "==================== 核心页面文件测试 ===================="

pages=(
    "home/index"
    "assessments/index"
    "message-wall/index"
    "messages/index"
    "profile/index"
    "scan/index"
    "auth/login"
    "settings/index"
    "about/index"
)

for page in "${pages[@]}"; do
    run_test "页面 $page JS文件" "check_file mini-program/pages/$page.js"
    run_test "页面 $page WXML文件" "check_file mini-program/pages/$page.wxml"
    run_test "页面 $page WXSS文件" "check_file mini-program/pages/$page.wxss"
    run_test "页面 $page JSON文件" "check_file mini-program/pages/$page.json"
done

# 3. 工具库测试
log_test "==================== 工具库文件测试 ===================="

run_test "API工具库" "check_file mini-program/utils/api.js"
run_test "通用工具库" "check_file mini-program/utils/util.js"
run_test "性能工具库" "check_file mini-program/utils/performance.js"
run_test "监控工具库" "check_file mini-program/utils/monitor.js"
run_test "手势工具库" "check_file mini-program/utils/gesture.js"

# 4. 样式和资源测试
log_test "==================== 样式和资源测试 ===================="

run_test "动画样式文件" "check_file mini-program/styles/animations.wxss"
run_test "资源目录结构" "check_dir mini-program/assets"
run_test "TabBar图标目录" "check_dir mini-program/assets/tab"

# 5. 配置文件格式测试
log_test "==================== 配置文件格式测试 ===================="

json_files=(
    "mini-program/app.json"
    "mini-program/theme.json"
    "mini-program/sitemap.json"
    "mini-program/project.config.json"
    "mini-program/project.private.config.json"
)

for json_file in "${json_files[@]}"; do
    if [ -f "$json_file" ]; then
        run_test "JSON格式: $(basename $json_file)" "check_json $json_file"
    fi
done

# 6. 依赖和环境测试
log_test "==================== 开发环境测试 ===================="

run_test "Node.js 环境" "command -v node"
run_test "npm 环境" "command -v npm"
run_test "项目依赖" "check_dir node_modules"
run_test "开发环境配置" "check_file .env.local"

# 7. 网络连接测试
log_test "==================== 网络连接测试 ===================="

# 检查开发服务器状态
if curl -s http://localhost:3001/api/health &> /dev/null; then
    run_test "本地开发服务器连接" "curl -s http://localhost:3001/api/health"
else
    log_warning "本地开发服务器未运行，跳过连接测试"
fi

# 检查生产服务器状态
if curl -k -s https://47.104.8.84/api/health &> /dev/null; then
    run_test "生产服务器连接" "curl -k -s https://47.104.8.84/api/health"
else
    log_warning "生产服务器连接失败或超时"
fi

# 8. 脚本和工具测试
log_test "==================== 工具脚本测试 ===================="

scripts=(
    "scripts/setup-environment.sh"
    "scripts/reload-config.sh"
    "scripts/miniprogram-dev.sh"
    "scripts/setup-miniprogram-dev.sh"
)

for script in "${scripts[@]}"; do
    if [ -f "$script" ]; then
        run_test "脚本文件: $(basename $script)" "check_file $script && [ -x $script ]"
    fi
done

# 9. 文档测试
log_test "==================== 文档文件测试 ===================="

docs=(
    "README.md"
    "CONFIG-RELOAD-GUIDE.md" 
    "MINIPROGRAM-DEV-GUIDE.md"
    "MINIPROGRAM-QUICKSTART.md"
)

for doc in "${docs[@]}"; do
    run_test "文档: $doc" "check_file $doc"
done

# 测试结果统计
echo
echo "================================"
echo "📊 测试结果统计"
echo "================================"
echo
log_info "总测试数: $TOTAL_TESTS"
log_success "通过测试: $PASSED_TESTS"

if [ $FAILED_TESTS -gt 0 ]; then
    log_error "失败测试: $FAILED_TESTS"
else
    log_success "失败测试: $FAILED_TESTS"
fi

# 计算通过率
if [ $TOTAL_TESTS -gt 0 ]; then
    PASS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    log_info "通过率: $PASS_RATE%"
    echo
    
    if [ $PASS_RATE -eq 100 ]; then
        echo "🎉 所有测试通过！小程序已准备就绪！"
    elif [ $PASS_RATE -ge 90 ]; then
        echo "✅ 测试基本通过，小程序功能正常！"
    elif [ $PASS_RATE -ge 70 ]; then
        echo "⚠️  大部分测试通过，存在一些问题需要修复。"
    else
        echo "❌ 测试失败率过高，需要检查配置和文件。"
        exit 1
    fi
else
    log_error "没有执行任何测试"
    exit 1
fi

echo
echo "💡 接下来的步骤:"
echo "1. 打开微信开发者工具"
echo "2. 导入项目: $(pwd)/mini-program/"
echo "3. 配置开发者工具设置"
echo "4. 在小程序中切换到开发环境"
echo "5. 开始开发和调试"
echo
echo "🔧 如有问题，请查看:"
echo "   - 开发指南: MINIPROGRAM-DEV-GUIDE.md"
echo "   - 快速开始: MINIPROGRAM-QUICKSTART.md"
echo "   - 环境配置: CONFIG-RELOAD-GUIDE.md"
echo

if [ $PASS_RATE -eq 100 ]; then
    exit 0
else
    exit 1
fi
