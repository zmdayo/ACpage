document.addEventListener('DOMContentLoaded', function() {
    //设置背景
    document.body.style.backgroundImage = `url(https://rikka-img.zmdayo.top?timestamp=${Date.now()})`
    // 常量定义
    const DIFFICULTY_LABELS = [
        "暂无评定", "入门", "普及−", "普及/提高−",
        "普及+/提高", "提高+/省选−", "省选/NOI−", "NOI/NOI+/CTSC"
    ];

    // 主执行流程
    fetch('/report.json')
        .then(handleResponse)
        .then(processReportData)
        .catch(handleFetchError);

    // 工具函数定义
    function formatTimestamp(date) {
        const pad = num => String(num).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
            `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    }

    function updateTextElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
            // 根据值设置class
            if (value === 'Error') {
                element.classList.remove('awake');
                element.classList.add('error');
            } else {
                element.classList.remove('error');
                element.classList.add('awake');
            }
        }
    }

    function formatBytes(bytes) {
        return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
    }

    function formatTime(ms) {
        return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(2)} s`;
    }

    function formatMemory(kb) {
        return kb < 1024 ? `${kb} KB` : `${(kb / 1024).toFixed(1)} MB`;
    }

    // 数据处理函数
    function handleResponse(response) {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
    }

    function processReportData(data) {
        // 更新基础数据
        updateTextElement('total_ac', data.total);
        updateTextElement('today_ac', data.today);

        // 更新时间戳
        if (data.timestamp) {
            const date = new Date(data.timestamp * 1000);
            updateTextElement('last-updated-number', formatTimestamp(date));
        }

        // 创建图表
        if (data.difficulty?.total) {
            createBarChart('total_chart', data.difficulty.total, DIFFICULTY_LABELS);
        }
        if (data.difficulty?.today) {
            createBarChart('today_chart', data.difficulty.today, DIFFICULTY_LABELS);
        }

        // 获取最后一条记录
        if (data.last_id) {
            fetchLastRecord(data.last_id);
        }
    }

    function createBarChart(containerId, values, labels) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.textContent = '';
        const maxValue = Math.max(...values) * 1.3 || 1; // 防止除以0

        values.forEach((value, index) => {
            const barWidth = Math.min((value / maxValue) * 100, 70);

            // 创建整个条形项的容器
            const barItem = document.createElement('div');
            barItem.className = 'bar-item';

            // 创建标签
            const label = document.createElement('span');
            label.className = 'bar-label';
            label.title = labels[index];
            label.textContent = labels[index];

            // 创建条形
            const bar = document.createElement('div');
            bar.className = 'bar';
            bar.style.width = `${barWidth}%`;

            // 添加数值（大于0时显示）
            if (value > 0) {
                const valueSpan = document.createElement('span');
                valueSpan.className = 'bar-value';
                valueSpan.textContent = value;
                bar.appendChild(valueSpan);
            }

            // 将标签和条形添加到容器
            barItem.appendChild(label);
            barItem.appendChild(bar);

            // 将整个条形项添加到图表容器
            container.appendChild(barItem);
        });
    }

    // 记录处理函数
    function fetchLastRecord(lastId) {
        fetch(`record/${lastId}.json`)
            .then(response => {
                if (!response.ok) throw new Error('Last record not found');
                return response.json();
            })
            .then(updateLastRecordCard)
            .catch(handleRecordError);
    }

    function updateLastRecordCard(recordData) {
        const titleLink = document.getElementById('last_record_title');
        if (titleLink) {
            titleLink.href = `https://www.luogu.com.cn/record/${recordData.id}`;
            titleLink.textContent = recordData.title || '未知题目';
        }

        updateTextElement('last_record_difficulty', DIFFICULTY_LABELS[recordData.difficulty] || '未知');
        updateTextElement('last_record_length', recordData.sourceCodeLength ? formatBytes(recordData.sourceCodeLength) : '未知');
        updateTextElement('last_record_time', recordData.time ? formatTime(recordData.time) : '未知');
        updateTextElement('last_record_memory', recordData.memory ? formatMemory(recordData.memory) : '未知');
    }

    // 错误处理函数
    function handleFetchError(error) {
        console.error('数据获取失败:', error);
        updateTextElement('total_ac', 'Error');
        updateTextElement('today_ac', 'Error');
    }

    function handleRecordError(error) {
        console.error('记录获取失败:', error);
        ['last_record_difficulty', 'last_record_length', 'last_record_time', 'last_record_memory'].forEach(id => {
            updateTextElement(id, 'Error');
        });
    }

    // 一言功能
    function initHitokoto() {
        const hitokotoElement = document.querySelector('#hitokoto_text');
        const sourceElement = document.getElementById('hitokoto_source');

        if (!hitokotoElement) return;

        fetch('https://v1.hitokoto.cn?c=a&c=b&c=d&c=i')
            .then(response => response.json())
            .then(data => {
                hitokotoElement.href = `https://hitokoto.cn/?uuid=${data.uuid}`;
                hitokotoElement.textContent = data.hitokoto;

                // 构建来源信息
                let sourceInfo = [];
                if (data.from_who) sourceInfo.push(data.from_who);
                if (data.from) sourceInfo.push(`「${data.from}」`);

                // 更新来源显示
                if (sourceElement && sourceInfo.length > 0) {
                    sourceElement.textContent = `—— ${sourceInfo.join(' ')}`;
                } else if (sourceElement) {
                    sourceElement.textContent = '';
                }

                const sourceInfoForTitle = [data.from_who, data.from].filter(Boolean).join('「');
                if (sourceInfoForTitle) {
                    hitokotoElement.title = `—— ${sourceInfoForTitle}${data.from ? '」' : ''}`;
                }
            })
            .catch(error => {
                console.error('一言获取失败:', error);
                hitokotoElement.textContent = '一言获取失败 :(';
                hitokotoElement.title = `错误: ${error.message}`;
                if (sourceElement) sourceElement.textContent = '';
            });
    }

    // 初始化一言
    initHitokoto();
});