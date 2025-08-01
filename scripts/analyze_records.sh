#!/bin/bash

# 确保 jq 已安装
if ! command -v jq &> /dev/null; then
    echo "安装 jq..."
    sudo apt-get update
    sudo apt-get install -y jq
fi

# 初始化统计变量
total_count=0
today_count=0
declare -a total_diff=(0 0 0 0 0 0 0 0)
declare -a today_diff=(0 0 0 0 0 0 0 0)
max_time=0
last_id=0

# 北京时间 (UTC+8)
today=$(TZ='Asia/Shanghai' date +%Y-%m-%d)
time_stamp=$(TZ='Asia/Shanghai' date +%s)

echo "开始分析记录文件... 今日日期: $today"

# 遍历record目录下的所有JSON文件
for file in record/*.json; do
    # 跳过目录
    [[ -f "$file" ]] || continue

    # 读取JSON内容
    content=$(<"$file")
    submitTime=$(jq -r '.submitTime' <<< "$content")
    difficulty=$(jq -r '.difficulty' <<< "$content")
    id=$(jq -r '.id' <<< "$content")
    
    # 总AC计数
    ((total_count++))
    
    # 转换提交时间为日期 (UTC)
    file_date=$(date -u -d "@$submitTime" +%Y-%m-%d 2>/dev/null)
    
    # 检查是否为今日提交
    if [[ "$file_date" == "$today" ]]; then
        ((today_count++))
        # 更新今日难度统计
        if (( difficulty >= 0 && difficulty <= 7 )); then
            (( today_diff[difficulty]++ ))
        fi
    fi
    
    # 更新总难度统计
    if (( difficulty >= 0 && difficulty <= 7 )); then
        (( total_diff[difficulty]++ ))
    fi
    
    # 追踪最新提交
    if (( submitTime > max_time )); then
        max_time=$submitTime
        last_id=$id
    fi
done

# 生成JSON报告
echo "生成报告:"
echo "时间戳: $time_stamp"
echo "总AC数: $total_count"
echo "今日AC数: $today_count"
echo "最后提交ID: $last_id"
echo "难度统计:"
printf "总: %s\n" "${total_diff[*]}"
printf "今日: %s\n" "${today_diff[*]}"

jq -n \
    --argjson timestamp "$time_stamp" \
    --argjson total "$total_count" \
    --argjson today "$today_count" \
    --argjson last_id "$last_id" \
    --argjson total_diff "$(printf '%s\n' "${total_diff[@]}" | jq -s .)" \
    --argjson today_diff "$(printf '%s\n' "${today_diff[@]}" | jq -s .)" \
    '{
        timestamp: $timestamp,
        total: $total,
        today: $today,
        difficulty: {
            total: $total_diff,
            today: $today_diff
        },
        last_id: $last_id
    }' > "report.json"

cat report.json