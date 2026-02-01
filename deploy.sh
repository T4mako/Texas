#!/bin/bash

# Texas Poker - Docker 快速启动脚本

set -e

echo "=========================================="
echo "   Texas Poker - Docker 部署脚本"
echo "=========================================="
echo ""

# 检查 Docker 是否已安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装！请先安装 Docker。"
    echo "安装指南：https://docs.docker.com/get-docker/"
    exit 1
fi

# 检查 Docker Compose 是否已安装
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose 未安装！请先安装 Docker Compose。"
    echo "安装指南：https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker 已安装"
echo "✅ Docker Compose 已安装"
echo ""

# 选择操作
echo "请选择操作："
echo "1) 构建镜像并启动容器"
echo "2) 启动容器"
echo "3) 停止容器"
echo "4) 重启容器"
echo "5) 查看日志"
echo "6) 进入容器"
echo "7) 清理所有"
echo ""

read -p "请输入选项 (1-7): " choice

case $choice in
    1)
        echo ""
        echo "📦 正在构建镜像..."
        docker-compose build
        echo ""
        echo "🚀 正在启动容器..."
        docker-compose up -d
        echo ""
        echo "✅ 启动完成！"
        echo ""
        echo "应用访问地址：http://localhost:3001"
        echo ""
        echo "查看日志命令：docker-compose logs -f"
        ;;
    2)
        echo ""
        echo "🚀 正在启动容器..."
        docker-compose up -d
        echo "✅ 容器已启动"
        echo ""
        echo "应用访问地址：http://localhost:3001"
        ;;
    3)
        echo ""
        echo "🛑 正在停止容器..."
        docker-compose down
        echo "✅ 容器已停止"
        ;;
    4)
        echo ""
        echo "🔄 正在重启容器..."
        docker-compose restart
        echo "✅ 容器已重启"
        echo ""
        echo "应用访问地址：http://localhost:3001"
        ;;
    5)
        echo ""
        echo "📋 显示实时日志（按 Ctrl+C 退出）..."
        echo ""
        docker-compose logs -f
        ;;
    6)
        echo ""
        echo "🔧 进入容器 shell..."
        docker-compose exec texas-poker sh
        ;;
    7)
        echo ""
        read -p "⚠️  确定要清理所有数据吗？(y/N): " confirm
        if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
            echo "正在清理..."
            docker-compose down -v
            docker rmi texas-poker:latest || true
            echo "✅ 清理完成"
        else
            echo "已取消"
        fi
        ;;
    *)
        echo "❌ 无效的选项"
        exit 1
        ;;
esac

echo ""
