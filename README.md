# KLTN - Hệ Thống Dự Báo Rủi Ro Tài Chính Doanh Nghiệp

## 📋 Mô Tả Dự Án

Dự án này phát triển một **hệ thống dự báo rủi ro tài chính (Financial Distress Prediction)** cho các doanh nghiệp Việt Nam, kết hợp:
- **Phân tích dữ liệu tài chính**: Xử lý các chỉ số tài chính từ báo cáo tài chính (BCTC)
- **Phân tích cảm xúc (Sentiment Analysis)**: Phân tích tin tức và tần suất xuất hiện
- **Machine Learning**: Mô hình Random Forest dự báo khả năng rủi ro tài chính
- **Ứng dụng Web**: Giao diện Flask để hiển thị dữ liệu và dự báo

## 🎯 Tính Năng Chính

### 1. **Dự Báo Rủi Ro Tài Chính**
- Tính toán 19 chỉ số tài chính (X1-X19) từ báo cáo tài chính
- Phân loại trạng thái: **Healthy** (Lành mạnh) hoặc **Distress Risk** (Rủi ro)
- Cung cấp xác suất rủi ro chi tiết

### 2. **Phân Tích Cảm Xúc Thị Trường**
- Crawl tin tức từ các nguồn tài chính
- Tính điểm cảm xúc (Sentiment Score) - SEN
- Thống kê lịch sử cảm xúc theo năm

### 3. **Quản Lý Người Dùng**
- Hệ thống đăng ký/đăng nhập an toàn
- Quản lý phiên người dùng
- Cơ sở dữ liệu SQLite tích hợp

### 4. **API Dự Báo**
- **Mode Basic**: Nhập dữ liệu tài chính thô (CA, CL, TA, E, S, etc.)
- **Mode Advanced**: Nhập trực tiếp các tỷ số X1-X19
- **Batch Prediction**: Dự báo hàng loạt từ file CSV

## 📊 Cấu Trúc Dự Án

```
KLTN/
├── app.py                           # Ứng dụng Flask chính
├── requirements.txt                 # Dependencies
├── model_rf_fin_sen.pkl            # Mô hình Random Forest đã train
├── FDP_VN_2010_2022_Train_Set.csv  # Dataset huấn luyện
├── unique_company_with_sector.csv  # Danh sách công ty theo ngành
├── users.db                        # Database người dùng SQLite
├── templates/                      # Các tệp HTML Jinja2
│   ├── login.html
│   ├── dashboard.html
│   └── predictor.html
├── static/                         # Tài nguyên tĩnh (CSS, JS)
├── Jupyter Notebooks/              # Phân tích và huấn luyện
│   ├── 000.ipynb
│   ├── sentiment_score.ipynb
│   ├── update_thesis.ipynb
│   └── uet_ggp_11.ipynb
└── data-label-kq/                  # Kết quả và dữ liệu
```

## 🔧 Cài Đặt & Chạy

### 1. **Yêu Cầu**
- Python 3.7+
- MySQL/MariaDB (nếu sử dụng database tài chính)

### 2. **Cài Đặt Dependencies**

```bash
pip install -r requirements.txt
```

**Dependencies chính:**
- `pandas`: Xử lý dữ liệu CSV
- `requests`: HTTP requests cho crawling
- `beautifulsoup4`: Web scraping
- `pymysql`: Kết nối MySQL
- `flask`: Web framework
- `flask-sqlalchemy`: ORM cho SQLite
- `joblib`: Load mô hình ML

### 3. **Cấu Hình Database**

Sửa file `app.py` (dòng 20-26):

```python
DB_CONFIG = { 
    'host': 'your_mysql_host',
    'user': 'your_mysql_user',
    'password': 'your_mysql_password',
    'database': 'cafef_news_db',
    'charset': 'utf8mb4'
}
```

### 4. **Chạy Ứng Dụng**

```bash
python app.py
```

Truy cập: **http://localhost:5000**

## 👤 Đăng Nhập Mặc Định

```
Username: admin
Password: 123456
```

## 📈 Các Chỉ Số Tài Chính Được Sử Dụng

| Chỉ Số | Công Thức | Ý Nghĩa |
|--------|-----------|---------|
| **X1** | CA / CL | Chỉ số thanh khoản |
| **X2** | WC / TA | Vốn lưu động / Tổng tài sản |
| **X3** | WC / S | Vốn lưu động / Doanh thu |
| **X4** | EBIT / TA | Lợi nhuận EBIT / Tổng tài sản |
| **X5** | NI / E | ROE - Lợi nhuận trên vốn chủ |
| **X6** | NI / TA | ROA - Lợi nhuận trên tài sản |
| **X7** | EBIT / S | Tỷ suất lợi nhuận |
| **X8** | RE / TA | Lợi nhuận giữ lại / Tổng tài sản |
| **X9** | S / TA | Vòng quay tài sản |
| **X10-X14** | Các chỉ số nợ | Chỉ số khả năng thanh toán |
| **X15-X16** | Log(TA), Log(S) | Quy mô công ty |
| **X17-X19** | Cấu trúc tài chính | Cơ cấu vốn |
| **SEN** | Sentiment Score | Cảm xúc thị trường |

## 🔗 API Endpoints

### 1. **Đăng Ký / Đăng Nhập**
```
POST /register
POST /login
GET /logout
```

### 2. **Dashboard**
```
GET /dashboard          # Trang chính (yêu cầu đăng nhập)
GET /predictor          # Trang dự báo
```

### 3. **API Dữ Liệu**
```
GET /api/get_market_stats?ticker=ABC&year=2022
```

**Response:**
```json
{
  "news_count": 45,
  "sen_score": 0.5234,
  "actual_status": "Healthy",
  "financial_data": { "X1": 1.5, "X2": 0.3, ... },
  "history": [{"year": 2020, "sen": 0.48}, ...]
}
```

### 4. **Dự Báo**
```
POST /api/predict
```

**Mode Basic (Tính toán từ dữ liệu thô):**
```json
{
  "mode": "basic",
  "data": {
    "CA": 1000000, "CL": 500000, "TA": 2000000,
    "E": 1000000, "S": 5000000, "EBIT": 600000,
    "NI": 400000, "I": 50000, "RE": 200000,
    "TL": 1000000, "LTL": 200000, "FA": 800000,
    "SEN": 0.5
  }
}
```

**Mode Advanced (Dữ liệu đã tính toán):**
```json
{
  "mode": "advanced",
  "data": {
    "X1": 2.0, "X2": 0.25, "X3": 0.5, ..., "SEN": 0.5
  }
}
```

### 5. **Dự Báo Hàng Loạt**
```
POST /api/predict_batch
Content-Type: multipart/form-data
file: <CSV file>
```

**Format CSV:**
```csv
Ticker,Year,CA,CL,TA,E,S,NI,EBIT,I,RE,TL,LTL,FA,SEN
ABC,2024,100,50,200,80,150,20,30,10,5,120,40,60,0.5
```

### 6. **Tải Template**
```
GET /api/download_template
```

## 📊 Mô Hình Machine Learning

- **Thuật toán**: Random Forest
- **File mô hình**: `model_rf_fin_sen.pkl` (101.5 MB)
- **Features**: 20 biến (X1-X19 + SEN)
- **Output**: Xác suất rủi ro (0-1)
- **Ngưỡng quyết định**: 0.5 (0.55 cho batch)

## 🗂️ Jupyter Notebooks

- **000.ipynb**: Phân tích EDA và khám phá dữ liệu
- **sentiment_score.ipynb**: Tính toán điểm cảm xúc
- **update_thesis.ipynb**: Xử lý và cập nhật dữ liệu
- **uet_ggp_11.ipynb**: Huấn luyện mô hình

## 🚀 Cải Tiến Tương Lai

- [ ] Tích hợp API thực tế để crawl tin tức
- [ ] Cải thiện tính toán sentiment analysis
- [ ] Thêm các mô hình ML khác (XGBoost, LightGBM)
- [ ] Dashboard hiển thị đồ thị chi tiết
- [ ] Xuất báo cáo PDF
- [ ] API authentication với JWT
- [ ] Deploy lên cloud

## 📝 Ghi Chú

- Database MySQL cần được cấu hình với tin tức công ty
- Mô hình hiện tại được huấn luyện trên dữ liệu từ 2010-2022
- Cần cập nhật mô hình định kỳ với dữ liệu mới

## 👨‍💼 Thông Tin Dự Án

**Loại**: Khóa luận tốt nghiệp (KLTN)
**Ngôn ngữ chính**: Python (92.8%)
**Framework chính**: Flask, Scikit-learn

## 📧 Liên Hệ

Nếu có câu hỏi hoặc gợi ý, vui lòng tạo issue hoặc liên hệ trực tiếp.
