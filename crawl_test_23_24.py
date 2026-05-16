import pandas as pd
import requests
from bs4 import BeautifulSoup
import pymysql  
from datetime import datetime
import time
import random
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

# ================= CẤU HÌNH DATABASE =================
DB_CONFIG = {
    'host': '127.0.0.1',
    'user': 'root',
    'password': 'password',
    'database': 'cafef_news_db',
    'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.Cursor 
}

# ================= CẤU HÌNH CRAWLER =================
YEARS_TO_CRAWL = [2023, 2024]
INPUT_FILE = 'unique_company_with_sector (1).csv'
MAX_WORKERS = 8

EXCLUDE_KEYWORDS_TITLE = [
    "Nghị quyết", "Thông báo", "Lịch chốt quyền", "Mời họp", 
    "Giải trình", "Biên bản", "đính chính", "báo cáo quản trị",
    "báo cáo thường niên", "phát hành cổ phiếu", "chốt danh sách",
    "nhận cổ tức", "tổ chức đhđcđ", "bổ nhiệm", "miễn nhiệm", "từ nhiệm",
    "thay đổi nhân sự", "đăng ký mua", "đăng ký bán"
]

print_lock = threading.Lock()

def create_connection():
    """Tạo kết nối riêng cho mỗi luồng dùng PyMySQL"""
    try:
        # PyMySQL connect syntax
        conn = pymysql.connect(**DB_CONFIG)
        return conn
    except pymysql.Error as err:
        with print_lock:
            print(f"Lỗi kết nối DB: {err}")
        return None

def is_valid_article(ticker, title, content):
    title_upper = title.upper()
    if title_upper.strip() == ticker.upper(): return False
    pattern = rf"^{ticker}[:\s]+CÔNG TY.*"
    if re.match(pattern, title_upper): return False
    for keyword in EXCLUDE_KEYWORDS_TITLE:
        if keyword.upper() in title_upper: return False
    if len(content.split()) < 30: return False
    return True

def get_article_content(url):
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://s.cafef.vn/',
        }
        if not url.startswith('http'):
            url = 'https://cafef.vn' + url
        resp = requests.get(url, headers=headers, timeout=10)
        if resp.status_code != 200: return None
        soup = BeautifulSoup(resp.content, 'html.parser')
        
        content_div = soup.find('div', class_='detail-content')
        if not content_div: content_div = soup.find('div', class_='content_detail')
        if not content_div: content_div = soup.find('div', class_='news-body')
            
        if content_div:
            return content_div.get_text(separator=' ', strip=True)
        return None
    except:
        return None

def process_one_company(ticker):
    conn = create_connection()
    if not conn: return
    cursor = conn.cursor()
    
    page = 1
    stop_crawling = False
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': f'https://s.cafef.vn/hastc/{ticker}-cong-ty.chn',
        'X-Requested-With': 'XMLHttpRequest'
    }

    count_saved = 0

    while not stop_crawling:
        ajax_url = f"https://s.cafef.vn/Ajax/Events_RelatedNews_New.aspx?symbol={ticker}&floorID=0&configID=0&PageIndex={page}&PageSize=20&Type=1&_={int(time.time())}"
        
        try:
            resp = requests.get(ajax_url, headers=headers, timeout=20)
            if resp.status_code != 200 or not resp.text.strip():
                break
            
            soup = BeautifulSoup(resp.content, 'html.parser')
            li_list = soup.find_all('li')
            
            if not li_list: break
            
            found_news_in_page = False
            for li in li_list:
                try:
                    title_tag = li.find('a')
                    if not title_tag: continue
                    title = title_tag.get_text(strip=True)
                    link = title_tag.get('href', '')
                    
                    date_str = ""
                    time_tag = li.find('span', class_='time')
                    if time_tag: date_str = time_tag.get_text(strip=True)
                    else:
                        match = re.search(r'\d{2}/\d{2}/\d{4}', li.get_text())
                        if match: date_str = match.group(0) + " 00:00"
                    
                    if not date_str: continue

                    try:
                        pub_date = datetime.strptime(date_str, "%d/%m/%Y %H:%M")
                    except ValueError:
                        try: pub_date = datetime.strptime(date_str, "%d/%m/%Y")
                        except: continue

                    if pub_date.year < min(YEARS_TO_CRAWL):
                        stop_crawling = True
                        break 
                    
                    if pub_date.year not in YEARS_TO_CRAWL: continue
                    
                    found_news_in_page = True
                    
                    content = get_article_content(link)
                    if content and is_valid_article(ticker, title, content):
                        full_link = link if link.startswith('http') else 'https://cafef.vn' + link
                        
                        sql = """
                        INSERT IGNORE INTO company_news (ticker, title, content, publication_date, year, url)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        """
                        cursor.execute(sql, (ticker, title, content, pub_date, pub_date.year, full_link))
                        conn.commit()
                        count_saved += 1
                except Exception:
                    continue
            
            if not found_news_in_page and stop_crawling:
                break
                
            page += 1
            time.sleep(1) 
            
        except Exception as e:
            break
            
    cursor.close()
    conn.close()
    
    with print_lock:
        if count_saved > 0:
            print(f"✅ {ticker}: Đã lưu {count_saved} bài.")
        else:
            print(f"⚪ {ticker}: Không có bài mới hoặc đã lọc hết.")
            


def main():
    try:
        df = pd.read_csv(INPUT_FILE)
        tickers = df['ticker'].unique()
        print(f"Tổng số công ty ban đầu: {len(tickers)}")
        
        # # --- BƯỚC LỌC BỎ SCR ---
        # if 'SCR' in tickers:
        #     tickers = [t for t in tickers if t != 'SCR']
        #     print("🚫 Đã loại bỏ mã 'SCR' khỏi danh sách chạy (Skip).")
        # # -----------------------
            
    except:
        print("Lỗi đọc file CSV")
        return

    print(f"Bắt đầu crawl {len(tickers)} công ty với {MAX_WORKERS} luồng song song...")
    
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = [executor.submit(process_one_company, ticker) for ticker in tickers]
        
        for future in as_completed(futures):
            pass

    print("\nHOÀN TẤT TOÀN BỘ QUÁ TRÌNH CRAWL.")

if __name__ == "__main__":
    main()