const MLswitch = document.getElementById('moonlight');
const sliderInput = document.getElementById('sliderRange');

// ================= 主题系统 =================
// 保存主题偏好
function saveThemePreference(isDark) {
    localStorage.setItem('themePref', isDark ? 'dark' : 'light');
}

// 获取主题偏好
function getThemePreference() {
    return localStorage.getItem('themePref') || 'auto';
}

// 应用主题
function applyTheme(theme) {
    document.querySelectorAll('.light, .dark').forEach(el => {
        if (theme === 'dark' && el.classList.contains('light')) {
            el.classList.replace('light', 'dark');
        } else if (theme === 'light' && el.classList.contains('dark')) {
            el.classList.replace('dark', 'light');
        }
    });
}

// ================= 透明度系统 =================
// 应用保存的透明度
function applySavedOpacity() {
    const savedOpacity = localStorage.getItem('cardOpacity');
    if (savedOpacity) {
        document.documentElement.style.setProperty('--card-alpha', savedOpacity);
        if (sliderInput) sliderInput.value = savedOpacity;
    }
}

// ================= 初始化 =================
document.addEventListener('DOMContentLoaded', () => {
    // 应用保存的主题
    const savedTheme = getThemePreference();
    if (savedTheme !== 'auto') {
        applyTheme(savedTheme);
    }

    // 应用保存的透明度
    applySavedOpacity();
});

// ================= 主题切换事件 =================
MLswitch.onclick = function() {
    document.querySelectorAll('.light, .dark').forEach(el => {
        el.classList.toggle('light');
        el.classList.toggle('dark');
    });
    saveThemePreference(document.querySelector('.dark') !== null);
};

// ================= 滑块交互逻辑 =================
document.addEventListener('DOMContentLoaded', () => {
    const sliderInput = document.getElementById('sliderRange');

    if (sliderInput) {
        // 点击按钮显示/隐藏滑块
        document.getElementById('slider').addEventListener('click', (e) => {
            e.stopPropagation();
            sliderInput.style.display = sliderInput.style.display === 'block' ? 'none' : 'block';
        });

        // 用户拖动滑块时更新透明度
        sliderInput.addEventListener('input', function(e) {
            e.stopPropagation();
            const alpha = e.target.value;
            document.documentElement.style.setProperty('--card-alpha', alpha);
            localStorage.setItem('cardOpacity', alpha);
        });

        // 阻止滑块点击事件冒泡
        sliderInput.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
});