document.addEventListener('DOMContentLoaded', function() {
    fetch('https://api.lolicon.app/setu/v2')
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            if (data.data && data.data[0] && data.data[0].urls && data.data[0].urls.original) {
                document.body.style.backgroundImage = `url('${data.data[0].urls.original}')`;
            } else {
                throw new Error('No image URL found in response');
            }
        })
        .catch(error => {
            console.error('Error fetching background image:', error);
            document.body.style.background = '#61adfc';
        });

    // difficulty labels
    const DIFFICULTY_LABELS = [
        "暂无评定",
        "入门",
        "普及−",
        "普及/提高−",
        "普及+/提高",
        "提高+/省选−",
        "省选/NOI−",
        "NOI/NOI+/CTSC"
    ];

    fetch('/report.json')
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            updateTextElement('total_ac', data.total);
            updateTextElement('today_ac', data.today);

            // Update timestamp if available (convert from 10-digit Unix timestamp)
            if (data.timestamp) {
                const date = new Date(data.timestamp * 1000);
                const formattedDate = formatTimestamp(date);
                updateTextElement('last-updated', '最后更新: ' + formattedDate);
            }

            if (data.difficulty && data.difficulty.total && data.difficulty.today) {
                createBarChart('total_chart', data.difficulty.total, DIFFICULTY_LABELS);
                createBarChart('today_chart', data.difficulty.today, DIFFICULTY_LABELS);
            }

            // Add this new section for last record
            if (data.last_id) {
                fetchLastRecord(data.last_id);
            }
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            updateTextElement('total_ac', 'Error');
            updateTextElement('today_ac', 'Error');
        });

    function formatTimestamp(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }

    function updateTextElement(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    }

    function fetchLastRecord(lastId) {
        fetch(`record/${lastId}.json`)
            .then(response => {
                if (!response.ok) throw new Error('Last record not found');
                return response.json();
            })
            .then(data => {
                updateLastRecordCard(lastId, data);
            })
            .catch(error => {
                console.error('Error fetching last record:', error);
                const lastRecordCard = document.getElementById('last_record');
                lastRecordCard.textContent = '';
                const errorMsg = document.createElement('p');
                errorMsg.textContent = '无法获取最近提交记录';
                lastRecordCard.appendChild(errorMsg);
            });
    }

    function updateLastRecordCard(lastId, recordData) {
        const lastRecordCard = document.getElementById('last_record');

        // Clear existing content
        lastRecordCard.textContent = '';

        // Create heading with link
        const heading = document.createElement('h2');
        const link = document.createElement('a');
        link.href = `https://www.luogu.com.cn/record/${recordData.id}`;
        link.target = '_blank';
        link.textContent = '最新提交：' + (recordData.title || '未知题目');
        heading.appendChild(link);
        lastRecordCard.appendChild(heading);

        // Create container for record items
        const container = document.createElement('div');
        container.className = 'last-record-container';

        // Add difficulty item
        addRecordItem(container, '难度', DIFFICULTY_LABELS[recordData.difficulty] || '未知');

        // Add code length item
        addRecordItem(container, '代码长度',
            recordData.sourceCodeLength ? formatBytes(recordData.sourceCodeLength) : '未知');

        // Add time item
        addRecordItem(container, '运行时间',
            recordData.time ? formatTime(recordData.time) : '未知');

        // Add memory item
        addRecordItem(container, '内存占用',
            recordData.memory ? formatMemory(recordData.memory) : '未知');

        lastRecordCard.appendChild(container);
    }

    function addRecordItem(container, label, value) {
        const item = document.createElement('div');
        item.className = 'last-record-item';

        const h4 = document.createElement('h4');
        h4.textContent = label;

        const p = document.createElement('p');
        p.textContent = value;

        item.appendChild(h4);
        item.appendChild(p);
        container.appendChild(item);
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

    function createBarChart(containerId, values, labels) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.textContent = '';

        // Calculate max value with conservative scaling
        const maxValue = Math.max(...values) * 1.3;

        values.forEach((value, index) => {
            // Ensure bars never exceed 80% width
            const barWidth = Math.min((value / maxValue) * 100, 70);
            const bar = document.createElement('div');
            bar.className = 'bar';
            bar.style.width = `${barWidth}%`;

            // Create label
            const label = document.createElement('span');
            label.className = 'bar-label';
            label.title = labels[index];
            label.textContent = labels[index];
            bar.appendChild(label);

            // Add value if > 0
            if (value > 0) {
                const valueSpan = document.createElement('span');
                valueSpan.className = 'bar-value';
                valueSpan.textContent = value;
                bar.appendChild(valueSpan);
            }

            container.appendChild(bar);
        });
    }

    const hitokotoElement = document.querySelector('#hitokoto_text');
    try {
        fetch('https://v1.hitokoto.cn')
            .then(response => response.json())
            .then(data => {
                console.log(`[Hitokoto] enabled and got response`);
                hitokotoElement.href = `https://hitokoto.cn/?uuid=${data.uuid}`;
                hitokotoElement.textContent = data.hitokoto;
                if (data.from || data.from_who) {
                    hitokotoElement.title = `—— ${data.from_who ? data.from_who : ''}${data.from ? ' 「' + data.from + '」' : ''}`;
                }
            })
    } catch (error) {
        console.error(`[Hitokoto] fetch error: ${error}`);
        hitokotoElement.textContent = '一言获取失败 :(';
        hitokotoElement.title = `Error: ${error}`;
    }
});