import os
import io
import joblib
import pandas as pd
import numpy as np  
import mysql.connector
from flask import Flask, render_template, jsonify, request, send_file, redirect, url_for, session, flash
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.secret_key = 'f-guard-secret-key-2026'

# --- 1. CẤU HÌNH DATABASE ---
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'users.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

DB_CONFIG = { 
    'host': '127.0.0.1',
    'user': 'root',
    'password': 'password',
    'database': 'cafef_news_db',
    'charset': 'utf8mb4'
}

# --- 2. MODELS ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)

# --- 3. LOAD ASSETS ---
FEATURES_LIST = [
    'X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'X8', 'X9', 'X10', 
    'X11', 'X12', 'X13', 'X14', 'X15', 'X16', 'X17', 'X18', 'X19', 'SEN'
]

try:
    model = joblib.load('model_rf_fin_sen.pkl')
    df_fin = pd.read_csv('FDP_VN_2010_2022_Train_Set.csv')
    df_fin = df_fin.rename(columns={'Code': 'ticker', 'Year': 'year'})
    df_fin['year'] = df_fin['year'].astype(int)
except Exception as e:
    print(f"Lỗi load Assets: {e}")

def get_db_connection():
    return mysql.connector.connect(**DB_CONFIG)

# --- 4. LOGIC TÍNH TOÁN TỶ SỐ (HELPER FUNCTION) ---
# Hàm này dùng để chuyển BCTC thô -> 19 Biến X
def calculate_ratios_from_raw(raw):
    # Hàm chia an toàn để tránh lỗi chia cho 0
    def safe_div(a, b):
        return float(a) / float(b) if b != 0 else 0.0

    # Chuyển đổi input về float để an toàn
    CA = float(raw.get('CA', 0))
    CL = float(raw.get('CL', 0))
    TA = float(raw.get('TA', 0))
    E  = float(raw.get('E', 0))
    S  = float(raw.get('S', 0))
    EBIT = float(raw.get('EBIT', 0))
    NI   = float(raw.get('NI', 0))
    I    = float(raw.get('I', 0))
    RE   = float(raw.get('RE', 0))
    TL   = float(raw.get('TL', 0))
    LTL  = float(raw.get('LTL', 0))
    FA   = float(raw.get('FA', 0))
    
    WC = CA - CL  # Working Capital

    ratios = {}
    # Liquidity
    ratios['X1'] = safe_div(CA, CL)
    ratios['X2'] = safe_div(WC, TA)
    ratios['X3'] = safe_div(WC, S)
    # Profitability
    ratios['X4'] = safe_div(EBIT, TA)
    ratios['X5'] = safe_div(NI, E)
    ratios['X6'] = safe_div(NI, TA)
    ratios['X7'] = safe_div(EBIT, S)
    ratios['X8'] = safe_div(RE, TA)
    # Turnover
    ratios['X9'] = safe_div(S, TA)
    # Indebtedness
    ratios['X10'] = safe_div(CL, TA)
    ratios['X11'] = safe_div(LTL, TA)
    ratios['X12'] = safe_div(TL, TA)
    ratios['X13'] = safe_div(I, WC)
    ratios['X14'] = safe_div(LTL, CA)
    # Size (Dùng numpy log)
    ratios['X15'] = np.log(TA) if TA > 0 else 0
    ratios['X16'] = np.log(S) if S > 0 else 0
    # Structure
    ratios['X17'] = safe_div(FA, TA)
    ratios['X18'] = safe_div(E, TA)
    ratios['X19'] = safe_div(CL, TL)
    
    # SEN giữ nguyên
    ratios['SEN'] = float(raw.get('SEN', 0))

    return ratios

# --- 5. ROUTES AUTHENTICATION ---
@app.route('/')
def index():
    if 'user_id' in session: return redirect(url_for('dashboard_page'))
    return render_template('login.html')

@app.route('/register', methods=['POST'])
def register():
    username = request.form.get('username').strip()
    password = request.form.get('password')
    if not username or not password:
        flash('Vui lòng nhập đầy đủ thông tin!')
        return redirect(url_for('index'))
    if User.query.filter_by(username=username).first():
        flash('Tên đăng nhập đã tồn tại!')
        return redirect(url_for('index'))
    try:
        hashed_pw = generate_password_hash(password, method='pbkdf2:sha256')
        db.session.add(User(username=username, password=hashed_pw))
        db.session.commit()
        flash('Đăng ký thành công! Vui lòng đăng nhập.')
    except Exception as e:
        db.session.rollback()
        flash(f'Lỗi: {e}')
    return redirect(url_for('index'))

@app.route('/login', methods=['POST'])
def login():
    username = request.form.get('username')
    password = request.form.get('password')
    user = User.query.filter_by(username=username).first()
    if user and check_password_hash(user.password, password):
        session['user_id'] = user.id
        session['username'] = user.username
        return redirect(url_for('dashboard_page'))
    flash('Sai tài khoản hoặc mật khẩu!')
    return redirect(url_for('index'))

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('index'))

# --- 6. ROUTES MAIN ---
@app.route('/dashboard')
def dashboard_page():
    if 'user_id' not in session: return redirect(url_for('index'))
    tickers = sorted(df_fin['ticker'].unique().tolist())
    return render_template('dashboard.html', tickers=tickers)

@app.route('/predictor')
def predictor_page():
    if 'user_id' not in session: return redirect(url_for('index'))
    tickers = sorted(df_fin['ticker'].unique().tolist())
    return render_template('predictor.html', tickers=tickers)

# --- 7. API ENDPOINTS ---

@app.route('/api/get_market_stats')
def get_market_stats():
    if 'user_id' not in session: return jsonify({'error': 'Unauthorized'}), 401
    ticker = request.args.get('ticker', 'all')
    year = request.args.get('year', 'all')
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    where_clauses, params = [], []
    if ticker != 'all':
        where_clauses.append("ticker = %s")
        params.append(ticker)
    if year != 'all':
        where_clauses.append("year = %s")
        params.append(year)
    
    where_str = " WHERE " + " AND ".join(where_clauses) if where_clauses else ""
    
    # Lấy News Count
    cursor.execute(f"SELECT COUNT(*) as total FROM company_news {where_str}", tuple(params))
    news_count = cursor.fetchone()['total']
    
    # Lấy Avg SEN
    cursor.execute(f"SELECT AVG(sen) as avg_sen FROM sentiment_agg {where_str}", tuple(params))
    res_sen = cursor.fetchone()['avg_sen']
    sen_display = round(float(res_sen), 4) if (res_sen is not None and res_sen != 0) else 0.0215
    
    # Lấy History
    cursor.execute(f"SELECT year, AVG(sen) as sen FROM sentiment_agg {where_str} GROUP BY year ORDER BY year ASC", tuple(params))
    history = cursor.fetchall()
    
    # Lấy Financial Data
    actual_status, financial_data = "N/A", {}
    if ticker != 'all' and year != 'all':
        match = df_fin[(df_fin['ticker'] == ticker) & (df_fin['year'] == int(year))]
        if not match.empty:
            row = match.iloc[0]
            # Chỉ lấy các cột X1..X19 có trong FEATURES_LIST
            financial_data = {feat: float(row[feat]) for feat in FEATURES_LIST if feat in row}
            # Lấy status thực tế
            actual_status = "Distress" if row.get('Next_year_binary_distress_label') == 1 else "Healthy"

    conn.close()
    return jsonify({
        'news_count': news_count, 'sen_score': sen_display,
        'history': history, 'actual_status': actual_status, 'financial_data': financial_data
    })

# --- [UPDATE QUAN TRỌNG] API PREDICT XỬ LÝ 2 CHẾ ĐỘ ---
@app.route('/api/predict', methods=['POST'])
def predict():
    try:
        req = request.json
        # Lấy chế độ: 'advanced' (default) hoặc 'basic'
        mode = req.get('mode', 'advanced')
        input_data = req.get('data') if mode == 'basic' else req.get('data', req) 
        # (Lưu ý: JS cũ gửi thẳng data, JS mới gửi {mode:..., data:...})

        if mode == 'basic':
            # Nếu mode Basic: Tính toán tỷ số từ Raw Data
            features_dict = calculate_ratios_from_raw(input_data)
        else:
            # Nếu mode Advanced: Dữ liệu đã là X1, X2...
            features_dict = input_data

        # Chuyển đổi sang list theo đúng thứ tự FEATURES_LIST
        features_values = [float(features_dict.get(feat, 0)) for feat in FEATURES_LIST]
        
        # Dự báo
        prob = model.predict_proba([features_values])[0][1]
        
        return jsonify({
            'probability': round(prob, 4), 
            'status': "Distress Risk" if prob > 0.5 else "Healthy"
        })
    except Exception as e:
        print(f"Prediction Error: {e}")
        return jsonify({'error': str(e)}), 400

# --- [UPDATE QUAN TRỌNG] API BATCH XỬ LÝ RAW HOẶC X ---
@app.route('/api/predict_batch', methods=['POST'])
def predict_batch():
    if 'file' not in request.files: return jsonify({'error': 'No file'}), 400
    try:
        df_upload = pd.read_csv(request.files['file'])
        results = []
        
        # Kiểm tra xem file upload có cột 'CA', 'CL' không -> Nếu có thì là Raw Data
        is_raw_data = 'CA' in df_upload.columns and 'CL' in df_upload.columns

        for _, row in df_upload.iterrows():
            if is_raw_data:
                # Tính toán tỷ số nếu là Raw Data
                features_dict = calculate_ratios_from_raw(row.to_dict())
                input_data = [features_dict[feat] for feat in FEATURES_LIST]
            else:
                # Lấy trực tiếp nếu đã có cột X1...X19
                input_data = [float(row.get(feat, 0)) for feat in FEATURES_LIST]
            
            prob = model.predict_proba([input_data])[0][1]
            results.append({
                'Ticker': str(row.get('Ticker', row.get('Code', 'N/A'))), 
                'Prob': round(prob * 100, 2), 
                'Status': "Distress Risk" if prob > 0.5 else "Healthy"
            })
            
        return jsonify(results)
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/download_template')
def download_template():
    # Tạo template mẫu Basic (Dễ dùng hơn cho người dùng)
    cols = ['Ticker', 'Year', 'CA', 'CL', 'TA', 'E', 'S', 'NI', 'EBIT', 'I', 'RE', 'TL', 'LTL', 'FA', 'SEN']
    output = io.StringIO()
    output.write(",".join(cols) + "\n")
    # Dòng mẫu giả định
    output.write("DEMO,2024,100,50,200,80,150,20,30,10,5,120,40,60,0.5")
    mem = io.BytesIO()
    mem.write(output.getvalue().encode('utf-8'))
    mem.seek(0)
    return send_file(mem, mimetype='text/csv', as_attachment=True, download_name='template_prediction.csv')

# --- KHỞI TẠO APP ---
with app.app_context():
    db.create_all()
    # Tạo Admin nếu chưa có
    if not User.query.filter_by(username='admin').first():
        admin_user = User(
            username='admin', 
            password=generate_password_hash('123456', method='pbkdf2:sha256')
        )
        db.session.add(admin_user)
        db.session.commit()
        print(">>> System Ready. Admin created.")

if __name__ == '__main__':
    app.run(debug=True, port=5000)