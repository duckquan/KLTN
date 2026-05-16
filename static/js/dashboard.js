// static/js/dashboard.js
let senChart = null;

/**
 * Hàm lấy màu sắc dựa trên trạng thái Dark Mode
 */
function getChartColors() {
    const isDark = document.body.classList.contains('dark-mode');
    return {
        borderColor: isDark ? '#facc15' : '#001f3f', // Gold neon nếu dark, Navy nếu light
        gridColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
        textColor: isDark ? '#e2e8f0' : '#1e293b',
        gradientStart: isDark ? 'rgba(250, 204, 21, 0.3)' : 'rgba(0, 31, 63, 0.2)',
        gradientStop: 'rgba(255, 255, 255, 0)'
    };
}

function updateDashboard() {
    const ticker = document.getElementById('tickerSelect').value;
    const year = document.getElementById('yearSelect').value;
    
    fetch(`/api/get_market_stats?ticker=${ticker}&year=${year}`)
        .then(res => res.json())
        .then(data => {
            // --- BỔ SUNG: Lọc dữ liệu chỉ lấy trong khoảng 2010 - 2022 ---
            // Điều này đảm bảo biểu đồ luôn đồng nhất với yêu cầu kinh doanh
            const filteredHistory = data.history.filter(item => {
                const yearVal = parseInt(item.year);
                return yearVal >= 2010 && yearVal <= 2022;
            });

            // 1. Cập nhật các con số (Metrics)
            document.getElementById('newsCount').innerText = data.news_count.toLocaleString();
            document.getElementById('senScore').innerText = data.sen_score.toFixed(4);
            
            const statusEl = document.getElementById('actualStatus');
            statusEl.innerText = data.actual_status;
            
            // Đổi màu status dựa trên giá trị
            if (data.actual_status === 'Distress') {
                statusEl.style.color = '#ef4444';
            } else if (data.actual_status === 'Healthy') {
                statusEl.style.color = '#22c55e';
            } else {
                statusEl.style.color = 'var(--text-main)';
            }

            // 2. Cấu hình biểu đồ
            const ctx = document.getElementById('senLineChart').getContext('2d');
            const colors = getChartColors();

            const gradient = ctx.createLinearGradient(0, 0, 0, 400);
            gradient.addColorStop(0, colors.gradientStart);
            gradient.addColorStop(1, colors.gradientStop);

            if (senChart) senChart.destroy();

            senChart = new Chart(ctx, {
                type: 'line',
                data: {
                    // Sử dụng filteredHistory thay vì data.history gốc
                    labels: filteredHistory.map(i => i.year),
                    datasets: [{
                        label: ticker === 'all' ? 'Tâm lý Thị trường (SEN)' : `Tâm lý mã ${ticker}`,
                        data: filteredHistory.map(i => i.sen),
                        borderColor: colors.borderColor,
                        borderWidth: 3,
                        pointBackgroundColor: colors.borderColor,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        backgroundColor: gradient,
                        fill: true,
                        tension: 0.4 
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleFont: { size: 14, weight: 'bold' },
                            padding: 12,
                            cornerRadius: 10,
                            displayColors: false,
                            callbacks: {
                                label: function(context) {
                                    return ` SEN Score: ${context.parsed.y.toFixed(4)}`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            min: -1,
                            max: 1,
                            grid: { color: colors.gridColor },
                            ticks: { color: colors.textColor, font: { weight: '600' } }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { color: colors.textColor, font: { weight: '600' } }
                        }
                    },
                    interaction: {
                        intersect: false,
                        mode: 'index',
                    }
                }
            });
        })
        .catch(err => console.error("Lỗi lấy dữ liệu:", err));
}

function resetFilter() {
    document.getElementById('tickerSelect').value = 'all';
    document.getElementById('yearSelect').value = 'all';
    updateDashboard();
}

// Lắng nghe sự kiện đổi Dark Mode
window.addEventListener('darkModeChanged', () => {
    if (senChart) updateDashboard();
});

document.getElementById('tickerSelect').addEventListener('change', updateDashboard);
document.getElementById('yearSelect').addEventListener('change', updateDashboard);

window.onload = updateDashboard;