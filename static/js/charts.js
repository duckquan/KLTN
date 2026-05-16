// static/js/charts.js

// 1. Danh sách 19 biến tài chính để tạo Form tự động
const features = [
    'X1','X2','X3','X4','X5','X6','X7','X8','X9','X10',
    'X11','X12','X13','X14','X15','X16','X17','X18','X19'
];

let senChart = null; // Biến toàn cục để quản lý đối tượng biểu đồ

// 2. Hàm khởi tạo các ô Input khi trang web load
function initInputs() {
    features.forEach((f, index) => {
        const colId = index < 6 ? 'col1' : (index < 13 ? 'col2' : 'col3');
        const container = document.getElementById(colId);
        if (container) {
            container.innerHTML += `
                <div class="mb-3">
                    <label class="small fw-bold">${f}:</label>
                    <input type="number" step="0.0001" class="form-control form-control-sm feature-input" id="X_${f}" value="0">
                </div>
            `;
        }
    });
}

// 3. Hàm vẽ/cập nhật biểu đồ đường Sentiment
function renderLineChart(historyData, ticker) {
    const ctx = document.getElementById('senLineChart').getContext('2d');
    
    // Nếu biểu đồ đã tồn tại, hủy nó đi để vẽ mới (tránh lỗi đè dữ liệu)
    if (senChart) {
        senChart.destroy();
    }

    const labels = historyData.map(item => item.year);
    const dataPoints = historyData.map(item => item.sen);

    senChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `Diễn biến Sentiment của ${ticker}`,
                data: dataPoints,
                borderColor: '#001f3f', // Màu Navy
                backgroundColor: 'rgba(0, 31, 63, 0.1)',
                fill: true,
                tension: 0.3, // Độ cong của đường
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    min: -1,
                    max: 1,
                    title: { display: true, text: 'Sentiment Score' }
                },
                x: {
                    title: { display: true, text: 'Năm' }
                }
            },
            plugins: {
                legend: { display: true, position: 'top' }
            }
        }
    });
}

// 4. Hàm cập nhật Dashboard khi thay đổi Ticker hoặc Năm
function updateDashboard() {
    const ticker = document.getElementById('tickerSelect').value;
    const year = document.getElementById('yearSelect').value;
    
    fetch(`/api/get_stats/${ticker}/${year}`)
        .then(response => response.json())
        .then(data => {
            // Cập nhật 3 card chỉ số
            document.getElementById('newsCount').innerText = data.news_count;
            document.getElementById('senScore').innerText = data.sen_score !== null ? data.sen_score : "N/A";
            document.getElementById('actualStatus').innerText = data.actual_status;

            const statusDiv = document.getElementById('actualStatus');
            statusDiv.className = 'metric-value ' + (data.actual_status === 'Distress' ? 'text-danger' : 'text-success');

            // Điền dữ liệu tài chính
            if (data.financial_data) {
                features.forEach(f => {
                    const inputElement = document.getElementById('X_' + f);
                    if (inputElement && data.financial_data[f] !== undefined) {
                        inputElement.value = data.financial_data[f];
                    }
                });
                if (data.sen_score !== null) {
                    document.getElementById('X_SEN').value = data.sen_score;
                    document.getElementById('senValDisplay').innerText = data.sen_score;
                }
            }

            // Cập nhật biểu đồ đường từ mảng history nhận được từ API
            if (data.history && data.history.length > 0) {
                renderLineChart(data.history, ticker);
            }
        })
        .catch(err => console.error("Lỗi cập nhật Dashboard:", err));
}

// 5. Hàm gọi API dự báo rủi ro
function runPrediction() {
    const payload = {};
    features.forEach(f => {
        payload[f] = document.getElementById('X_'+f).value;
    });
    payload['SEN'] = document.getElementById('X_SEN').value;

    fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(data => {
        const resArea = document.getElementById('resultArea');
        resArea.style.display = 'block';
        resArea.style.backgroundColor = data.color === 'red' ? '#ffebee' : (data.color === 'orange' ? '#fff3e0' : '#e8f5e9');
        
        document.getElementById('resProbability').innerText = (data.probability * 100).toFixed(2) + '%';
        document.getElementById('resProbability').style.color = data.color;
        
        document.getElementById('resStatus').innerText = data.status;
        document.getElementById('resStatus').style.color = data.color;
        
        resArea.scrollIntoView({ behavior: 'smooth' });
    })
    .catch(err => alert("Lỗi khi thực hiện dự báo!"));
}

// 6. Đăng ký sự kiện
document.getElementById('tickerSelect').addEventListener('change', updateDashboard);
document.getElementById('yearSelect').addEventListener('change', updateDashboard);

document.addEventListener('DOMContentLoaded', () => {
    initInputs();
    updateDashboard();
});