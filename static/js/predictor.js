// static/js/predictor.js

/**
 * ============================================================
 * 1. CẤU HÌNH & KHỞI TẠO
 * ============================================================
 */

/* Danh sách 19 biến tính toán (Dành cho Advanced Mode) */
const featuresMap = [
    // Liquidity
    { id: 'X1', label: 'Current ratio', group: 'Liquidity', formula: 'CA / CL' },
    { id: 'X2', label: 'WC/TA ratio', group: 'Liquidity', formula: 'WC / TA' },
    { id: 'X3', label: 'WC/S ratio', group: 'Liquidity', formula: 'WC / S' },
    // Profitability
    { id: 'X4', label: 'EBIT/TA ratio', group: 'Profitability', formula: 'EBIT / TA' },
    { id: 'X5', label: 'ROE', group: 'Profitability', formula: 'NI / E' },
    { id: 'X6', label: 'ROA', group: 'Profitability', formula: 'NI / TA' },
    { id: 'X7', label: 'EBIT/S ratio', group: 'Profitability', formula: 'EBIT / S' },
    { id: 'X8', label: 'RE/TA ratio', group: 'Profitability', formula: 'RE / TA' },
    // Turnover
    { id: 'X9', label: 'S/TA ratio', group: 'Turnover', formula: 'S / TA' },
    // Indebtedness
    { id: 'X10', label: 'CL/TA ratio', group: 'Indebtedness', formula: 'CL / TA' },
    { id: 'X11', label: 'LTL/TA ratio', group: 'Indebtedness', formula: 'LTL / TA' },
    { id: 'X12', label: 'TL/TA ratio', group: 'Indebtedness', formula: 'TL / TA' },
    { id: 'X13', label: 'I/WC ratio', group: 'Indebtedness', formula: 'I / WC' },
    { id: 'X14', label: 'LTL/CA ratio', group: 'Indebtedness', formula: 'LTL / CA' },
    // Size
    { id: 'X15', label: 'ln(Total Assets)', group: 'Size Factors', formula: 'ln(TA)' },
    { id: 'X16', label: 'ln(Sales)', group: 'Size Factors', formula: 'ln(S)' },
    // Structure
    { id: 'X17', label: 'FA/TA ratio', group: 'Structure', formula: 'FA / TA' },
    { id: 'X18', label: 'E/TA ratio', group: 'Structure', formula: 'E / TA' },
    { id: 'X19', label: 'CL/TL ratio', group: 'Structure', formula: 'CL / TL' }
];

const featureIds = featuresMap.map(f => f.id);

/* Khởi tạo Grid nhập liệu cho Advanced Tab */
function initInputs() {
    const container = document.getElementById('dynamicFields');
    if (!container) return;
    container.innerHTML = ""; 

    const groups = [...new Set(featuresMap.map(f => f.group))];

    groups.forEach(groupName => {
        // Tạo Section
        const section = document.createElement('div');
        section.style.marginBottom = "30px";
        section.innerHTML = `
            <div style="margin-bottom: 15px;">
                <h6 style="font-weight: 700; color: var(--accent-gold); text-transform: uppercase; font-size: 0.75rem; border-left: 3px solid var(--accent-gold); padding-left: 10px; margin: 0;">
                    ${groupName}
                </h6>
            </div>
        `;

        // Tạo Grid
        const gridContainer = document.createElement('div');
        gridContainer.style.display = "grid";
        gridContainer.style.gridTemplateColumns = "repeat(3, 1fr)";
        gridContainer.style.gap = "15px";

        featuresMap.filter(f => f.group === groupName).forEach(f => {
            const cardHtml = `
                <div class="card-modern" style="padding: 12px !important; border-radius: 16px; border: 1px solid var(--border-color); background: var(--glass-bg);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <label style="font-size: 0.7rem; font-weight: 700; color: var(--text-muted); margin: 0;">${f.label}</label>
                        <span style="font-size: 0.6rem; font-weight: 800; color: #007bff; background: rgba(0,123,255,0.1); padding: 2px 6px; border-radius: 6px;">${f.id}</span>
                    </div>
                    <input type="number" step="0.0001" class="form-control form-control-sm fw-bold" id="X_${f.id}" value="0">
                    <div style="font-size: 0.55rem; color: #6c757d; margin-top: 4px;">Form: ${f.formula}</div>
                </div>
            `;
            gridContainer.insertAdjacentHTML('beforeend', cardHtml);
        });

        section.appendChild(gridContainer);
        container.appendChild(section);
    });
}

/**
 * ============================================================
 * 2. LOGIC DỰ BÁO (MODE 1 & MODE 2)
 * ============================================================
 */

/* MODE 1: BASIC ANALYST (Dự báo từ BCTC thô) */
function predictFromRaw() {
    // Thu thập dữ liệu từ các ô input thô
    const rawData = {
        CA: parseFloat(document.getElementById('raw_CA').value) || 0,
        CL: parseFloat(document.getElementById('raw_CL').value) || 0,
        TA: parseFloat(document.getElementById('raw_TA').value) || 0,
        E:  parseFloat(document.getElementById('raw_E').value) || 0,
        S:  parseFloat(document.getElementById('raw_S').value) || 0,
        NI: parseFloat(document.getElementById('raw_NI').value) || 0,
        EBIT: parseFloat(document.getElementById('raw_EBIT').value) || 0,
        I:    parseFloat(document.getElementById('raw_I').value) || 0,
        RE:   parseFloat(document.getElementById('raw_RE').value) || 0,
        TL:   parseFloat(document.getElementById('raw_TL').value) || 0,
        LTL:  parseFloat(document.getElementById('raw_LTL').value) || 0,
        FA:   parseFloat(document.getElementById('raw_FA').value) || 0,
        SEN:  parseFloat(document.getElementById('raw_SEN').value) || 0
    };

    const btn = document.getElementById('btnPredictRaw');
    setLoading(btn, true);

    // Gửi API với mode 'basic'
    fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'basic', data: rawData })
    })
    .then(res => res.json())
    .then(result => showResult(result))
    .catch(err => alert("Lỗi hệ thống: " + err))
    .finally(() => setLoading(btn, false, '<i class="bi bi-lightning-charge-fill me-2"></i> PHÂN TÍCH NGAY'));
}

/* MODE 2: ADVANCED RESEARCHER (Dự báo từ X1-X19) */
function runPrediction() {
    const payload = {};
    featureIds.forEach(f => { 
        payload[f] = document.getElementById('X_'+f).value; 
    });
    payload['SEN'] = document.getElementById('X_SEN').value;

    const btn = document.getElementById('btnPredictAdv');
    setLoading(btn, true);

    // Gửi API với mode 'advanced' (hoặc mặc định)
    fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'advanced', data: payload })
    })
    .then(res => res.json())
    .then(result => showResult(result))
    .catch(err => alert("Lỗi hệ thống: " + err))
    .finally(() => setLoading(btn, false, 'DETECT'));
}

/* Hàm hiển thị kết quả chung (Dùng cho cả 2 mode) */
function showResult(data) {
    const resArea = document.getElementById('resultArea');
    const statusBox = document.getElementById('statusBox');
    const probText = document.getElementById('resProbability');
    const statusText = document.getElementById('resStatus');
    
    resArea.style.display = 'block';
    
    const prob = (data.probability * 100).toFixed(2);
    probText.innerText = prob + '%';
    statusText.innerText = data.status;

    if(data.probability > 0.5) {
        statusBox.className = "status-badge status-distress";
        resArea.style.borderColor = "#ef4444"; 
        probText.style.color = "#ef4444";
    } else {
        statusBox.className = "status-badge status-healthy";
        resArea.style.borderColor = "#22c55e";
        probText.style.color = "#22c55e";
    }
    
    // Cuộn xuống vùng kết quả
    resArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/**
 * ============================================================
 * 3. TIỆN ÍCH HỆ THỐNG (AUTO-FILL, BATCH UPLOAD)
 * ============================================================
 */

/* Auto-fill cho Advanced Mode */
function autoFillData() {
    const ticker = document.getElementById('tickerPredict').value;
    const year = document.getElementById('yearPredict').value;
    if(!ticker) return alert("Vui lòng chọn mã cổ phiếu!");

    const btn = document.getElementById('btnLoadData');
    setLoading(btn, true);

    fetch(`/api/get_market_stats?ticker=${ticker}&year=${year}`)
        .then(res => res.json())
        .then(data => {
            if(data.financial_data) {
                // Fill vào Tab Advanced
                featureIds.forEach(f => {
                    const input = document.getElementById('X_'+f);
                    if (input) {
                        input.value = data.financial_data[f] || 0;
                        input.style.backgroundColor = "#fff3cd"; // Highlight
                        setTimeout(() => input.style.backgroundColor = "#fff", 500);
                    }
                });
                
                // Fill SEN cho cả 2 Tab
                const senVal = data.sen_score || 0;
                const senAdv = document.getElementById('X_SEN');
                const senRaw = document.getElementById('raw_SEN');
                
                if (senAdv) {
                    senAdv.value = senVal;
                    document.getElementById('senValDisplay').innerText = senVal;
                }
                if (senRaw) senRaw.value = senVal;

                // Tự động chuyển sang Tab Advanced để người dùng thấy dữ liệu
                const advTab = new bootstrap.Tab(document.getElementById('advanced-tab'));
                advTab.show();

            } else {
                alert(`Không tìm thấy dữ liệu cho ${ticker} năm ${year}`);
            }
        })
        .catch(err => console.error(err))
        .finally(() => setLoading(btn, false, '<i class="bi bi-cloud-download me-1"></i> Lấy số liệu'));
}

/* Upload Batch File */
function uploadBatch() {
    const fileInput = document.getElementById('batchFile');
    if (fileInput.files.length === 0) return alert("Vui lòng chọn file CSV!");

    const btn = document.querySelector('.btn-batch-run');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Processing...';
    btn.disabled = true;

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    fetch('/api/predict_batch', {
        method: 'POST',
        body: formData
    })
    .then(res => res.json())
    .then(data => {
        if(data.error) return alert(data.error);
        
        const body = document.getElementById('batchTableBody');
        body.innerHTML = "";
        
        data.forEach(item => {
            const isDistress = item.Prob > 50; 
            const statusClass = isDistress ? 'status-distress-text' : 'status-healthy-text';
            const statusLabel = isDistress ? 'Distress Risk' : 'Healthy';
            
            body.innerHTML += `
                <tr>
                    <td class="ticker-name">${item.Ticker}</td>
                    <td class="${statusClass}">${item.Prob}%</td>
                    <td align="right" class="${statusClass}">${statusLabel}</td>
                </tr>`;
        });
        document.getElementById('batchResultArea').style.display = 'block';
    })
    .catch(err => alert("Lỗi định dạng file hoặc hệ thống!"))
    .finally(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
    });
}

/* Helper: Hiệu ứng Loading cho nút bấm */
function setLoading(btn, isLoading, text = '') {
    if (isLoading) {
        btn.dataset.originalText = btn.innerHTML; // Lưu text cũ
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Loading...';
        btn.disabled = true;
    } else {
        btn.innerHTML = text || btn.dataset.originalText;
        btn.disabled = false;
    }
}

/**
 * ============================================================
 * 4. SỰ KIỆN GIAO DIỆN (DRAG DROP)
 * ============================================================
 */
const fileInput = document.getElementById('batchFile');
const dropZone = document.getElementById('dropZone');
const fileNameDisplay = document.getElementById('fileNameDisplay');

if (fileInput) {
    fileInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            fileNameDisplay.innerText = "📄 " + this.files[0].name;
            fileNameDisplay.style.display = 'block';
        }
    });
}

if (dropZone) {
    ['dragenter', 'dragover'].forEach(name => {
        dropZone.addEventListener(name, (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
    });

    ['dragleave', 'drop'].forEach(name => {
        dropZone.addEventListener(name, (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            if (name === 'drop') {
                fileInput.files = e.dataTransfer.files;
                fileNameDisplay.innerText = "📄 " + e.dataTransfer.files[0].name;
                fileNameDisplay.style.display = 'block';
            }
        });
    });
}

// Khởi chạy khi trang tải xong
window.onload = initInputs;