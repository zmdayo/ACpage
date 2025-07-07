// ==UserScript==
// @name    推送洛谷AC记录至Github
// @namespace    https://github.com/zmdayo/ACpage/
// @copyright    GPL-3.0-only
// @version    1.0
// @description    自动将洛谷AC记录推送到GitHub仓库
// @author    DeepSeek R1 & zmdayo
// @icon64URL    https://ACpage.zmdayo.top/static/favicon.ico
// @match    https://www.luogu.com.cn/record/*
// @match    https://www.luogu.com.cn/
// @resource toastifyCSS https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css
// @require    https://cdn.jsdelivr.net/npm/toastify-js
// @grant    unsafeWindow
// @grant    GM_getValue
// @grant    GM_setValue
// @grant    GM_addStyle
// @grant    GM_getResourceText
// @grant    GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';
    //引入通知样式
    GM_addStyle(GM_getResourceText("toastifyCSS"));
    //全局通知
    function showNotice(message) {
        window.Toastify({
            text: message,
            duration: 2000,
            destination: null,
            newWindow: true,
            close: false,
            gravity: "top", // `top` or `bottom`
            position: "left", // `left`, `center` or `right`
            stopOnFocus: true, // Prevents dismissing of toast on hover
            style: {
                background: "linear-gradient(to right, #00b09b, #96c93d)",
            },
            onClick: null // Callback after click
        }).showToast();
        console.log(message);
    }

    // 通用的GitHub API请求函数
    function githubRequest(method, url, data, token) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: method,
                url: url,
                headers: {
                    "Authorization": `token ${token}`,
                    "Accept": "application/vnd.github.v3+json",
                    "Content-Type": "application/json"
                },
                data: data ? JSON.stringify(data) : undefined,
                onload: response => {
                    if (response.status >= 200 && response.status < 300) {
                        resolve({
                            status: response.status,
                            headers: response.headers,
                            responseText: response.responseText
                        });
                    } else {
                        reject(new Error(`HTTP ${response.status}: ${response.statusText}`));
                    }
                },
                onerror: err => reject(err)
            });
        });
    }

    // 创建设置面板
    function createSettingsPanel() {
        const CONFIG_SCHEMA = [{
                key: 'UID',
                type: 'number',
                placeholder: '您的洛谷UID（如114514）'
            },
            {
                key: 'TIME',
                type: 'number',
                placeholder: '开始记录时间的秒级时间戳（如1735660800）'
            },
            {
                key: 'GITHUB_TOKEN',
                type: 'password',
                placeholder: '您的GitHub Personal Access Token'
            },
            {
                key: 'REPO_OWNER',
                type: 'text',
                placeholder: 'Github仓库的所有者'
            },
            {
                key: 'REPO_NAME',
                type: 'text',
                placeholder: 'Github仓库的名称'
            },
            {
                key: 'DIR_PATH',
                type: 'text',
                placeholder: '存放记录文件的路径（如record）'
            }
        ];

        // 创建按钮
        const navItem = document.createElement('a');
        navItem.href = 'javascript:void(0)';
        navItem.className = 'color-none';
        navItem.style.color = 'inherit';
        navItem.textContent = '脚本设置';

        // 插入按钮至导航栏
        const navBar = document.querySelector('nav.lfe-body');
        if (navBar) {
            const referenceNode = document.querySelector('a[href="/article"]');
            if (referenceNode) {
                referenceNode.parentNode.insertBefore(navItem, referenceNode.nextSibling);
            }
        }

        // 创建设置面板
        const panelHTML = `
            <div class="am-modal" tabindex="-1" id="script-settings-panel">
                <div class="am-modal-dialog">
                    <div class="am-modal-hd">
                        脚本设置
                        <a href="javascript:void(0)" class="am-close am-close-alt" data-am-modal-close>&times;</a>
                    </div>
                    <div class="am-modal-bd">
                        <form id="settings-form" class="am-form"></form>
                    </div>
                    <div class="am-modal-footer">
                        <button type="button" class="am-btn am-btn-default" data-am-modal-close>取消</button>
                        <button type="button" class="am-btn am-btn-primary" id="save-settings">保存设置</button>
                    </div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', panelHTML);

        // 动态生成输入框
        function renderSettingsForm() {
            const form = document.getElementById('settings-form');
            form.innerHTML = '';

            CONFIG_SCHEMA.forEach(item => {
                const value = GM_getValue(item.key) || '';
                const fieldHTML = `
                    <div class="am-form-group">
                        <label for="${item.key}">${item.key}</label>
                        <input type="${item.type}"
                               class="am-form-field"
                               id="${item.key}"
                               value="${value.replace(/"/g, '&quot;')}"
                               placeholder="${item.placeholder}">
                    </div>`;
                form.insertAdjacentHTML('beforeend', fieldHTML);
            });
        }

        // 显示设置面板
        navItem.addEventListener('click', () => {
            try {
                renderSettingsForm();
                $('#script-settings-panel').modal({
                    relatedTarget: this,
                    closeViaDimmer: false
                }).modal('open');
            } catch (error) {
                showNotice('❌ 设置面板初始化失败: ' + error.message);
            }
        });

        // 保存设置
        document.getElementById('save-settings').addEventListener('click', () => {
            try {
                CONFIG_SCHEMA.forEach(item => {
                    const inputEl = document.getElementById(item.key);
                    if (inputEl) {
                        GM_setValue(item.key, inputEl.value);
                    }
                });
                $('#script-settings-panel').modal('close');
                showNotice('✅ 设置已保存！');
            } catch (error) {
                showNotice('❌ 保存设置失败: ' + error.message);
            }
        });
    }

    function allDefined(obj) {
        return Object.keys(obj).every(key => obj[key] !== undefined);
    }

    // 路径清理函数
    function cleanPath(path) {
        return path.replace(/^\/+|\/+$/g, '');
    }

    // 处理记录数据
    function processRecordData() {
        try {
            if (!unsafeWindow._feInjection) {
                showNotice('❌ 未找到页面数据');
                return;
            }

            if (unsafeWindow._feInjection.code !== 200) {
                showNotice('❌ 网络错误: ' + (unsafeWindow._feInjection.code || '未知错误'));
                return;
            }

            const record = unsafeWindow._feInjection.currentData.record;
            if (!record) {
                showNotice('❌ 无法获取记录数据');
                return;
            }

            const recordData = {
                id: record.id,
                contest: record.contest,
                submitTime: record.submitTime,
                status: record.status,
                uid: record.user?.uid,
                difficulty: record.problem?.difficulty,
                pid: record.problem?.pid,
                title: record.problem?.title,
                time: record.time,
                memory: record.memory,
                sourceCodeLength: record.sourceCodeLength
            };

            // 验证字段完整性
            if (!allDefined(recordData)) {
                showNotice("❌ 记录数据不完整！");
                return;
            }

            // 获取配置
            const configValues = {
                UID: GM_getValue('UID'),
                TIME: GM_getValue('TIME'),
                GITHUB_TOKEN: GM_getValue('GITHUB_TOKEN'),
                REPO_OWNER: GM_getValue('REPO_OWNER'),
                REPO_NAME: GM_getValue('REPO_NAME'),
                DIR_PATH: GM_getValue('DIR_PATH')
            };

            // 验证配置
            if (!allDefined(configValues)) {
                showNotice("❌ 脚本未配置！");
                return;
            }

            // 检查是否为AC记录
            if (recordData.status !== 12) {
                return; // 非AC记录，静默退出
            }

            // 检查用户UID
            if (Number(configValues.UID) !== recordData.uid) {
                return; // 非当前用户记录，静默退出
            }

            // 检查提交时间
            if (Number(configValues.TIME) > recordData.submitTime) {
                return; // 非设定时间之后记录，静默退出
            }

            showNotice('ℹ️ 正在推送记录到GitHub...');
            const jsonData = JSON.stringify(recordData, null, 2);
            pushToGitHub(
                configValues.GITHUB_TOKEN,
                configValues.REPO_OWNER,
                configValues.REPO_NAME,
                configValues.DIR_PATH,
                recordData.id,
                jsonData
            );
        } catch (error) {
            showNotice('❌ 处理记录失败: ' + error.message);
        }
    }

    // 推送到GitHub
    async function pushToGitHub(token, owner, repo, path, recordId, content) {
        try {
            const cleanDir = cleanPath(path);
            const filePath = `${cleanDir}/${recordId}.json`;
            const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

            try {
                // 使用HEAD请求检查文件是否存在
                await githubRequest('HEAD', apiUrl, null, token);
                showNotice(`⚠️ 记录已存在: ${filePath}`);
            } catch (checkError) {
                if (checkError.message.includes('404')) {
                    // 创建新文件
                    const encodedContent = btoa(unescape(encodeURIComponent(content)));
                    await githubRequest('PUT', apiUrl, {
                        message: `添加洛谷记录: ${recordId}`,
                        content: encodedContent
                    }, token);
                    showNotice('✅ 记录已成功推送到GitHub！');
                } else {
                    throw checkError;
                }
            }
        } catch (error) {
            console.error('GitHub推送错误:', error);
            showNotice(`❌ 推送失败: ${error.message.split('\n')[0]}`);
        }
    }

    // 处理记录列表
    async function processRecordList() {
        try {
            // 获取配置
            const configValues = {
                GITHUB_TOKEN: GM_getValue('GITHUB_TOKEN'),
                REPO_OWNER: GM_getValue('REPO_OWNER'),
                REPO_NAME: GM_getValue('REPO_NAME'),
                DIR_PATH: GM_getValue('DIR_PATH')
            };

            // 验证配置
            if (!allDefined(configValues)) {
                showNotice("❌ 脚本未配置！");
                return;
            }

            const records = unsafeWindow._feInjection.currentData.records.result;
            const statusElements = document.querySelectorAll('.lfe-caption.tag.status-name');

            // 并行处理所有AC记录
            const promises = [];
            for (let i = 0; i < statusElements.length; i++) {
                if (records[i].status === 12) {
                    // 设置初始状态为灰色（检查中）
                    statusElements[i].style.border = '2px solid gray';
                    statusElements[i].style.boxSizing = 'border-box';

                    // 准备API请求
                    const cleanDir = cleanPath(configValues.DIR_PATH);
                    const filePath = `${cleanDir}/${records[i].id}.json`;
                    const apiUrl = `https://api.github.com/repos/${configValues.REPO_OWNER}/${configValues.REPO_NAME}/contents/${filePath}`;

                    // 添加请求到队列
                    promises.push((async (element, recordId) => {
                        try {
                            await githubRequest('HEAD', apiUrl, null, configValues.GITHUB_TOKEN);
                            element.style.border = '2px solid gold'; // 文件存在
                        } catch (error) {
                            if (error.message.includes('404')) {
                                element.style.border = '2px solid red'; // 文件不存在
                            } else {
                                element.style.border = '2px solid purple'; // 其他错误
                                console.error(`检查记录 ${recordId} 失败:`, error);
                            }
                        }
                    })(statusElements[i], records[i].id));
                }
            }

            // 等待所有请求完成
            await Promise.allSettled(promises);
            //showNotice(`✅ 已完成 ${promises.length} 条AC记录的检查`);
        } catch (error) {
            showNotice('❌ 记录列表处理失败: ' + error.message);
        }
    }

    // 主入口
    if (unsafeWindow._feInjection?.currentTemplate === 'Excited') {
        createSettingsPanel();
    }
    if (unsafeWindow._feInjection?.currentTemplate === 'RecordShow') {
        processRecordData();
    }
    if (unsafeWindow._feInjection?.currentTemplate === 'RecordList' && new URLSearchParams(window.location.search).get("user") === GM_getValue('UID')) {
        processRecordList();
    }
})();