import os
import re
import time
import requests
from bs4 import BeautifulSoup
import pandas as pd
import streamlit as st

BASE_URL = "https://en.rockfish-weatherwear.co.kr"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    )
}

def clean_handle(title):
    handle = re.sub(r'[^a-zA-Z0-9\s-]', '', title).strip().lower()
    return re.sub(r'[\s_]+', '-', handle)

def parse_options(soup):
    """解析 Cafe24 產品頁的顏色與尺碼下拉選項"""
    color_options = []
    size_options = []

    # 尋找所有選項選單
    selects = soup.select("select[id*='product_option_id'], select.ProductOption0")
    for sel in selects:
        label_text = ""
        # 尋找對應的 th / label 判斷是 Color 還是 Size
        parent_tr = sel.find_parent("tr")
        if parent_tr:
            th = parent_tr.find("th")
            if th:
                label_text = th.get_text(strip=True).lower()

        options = [
            opt.get_text(strip=True)
            for opt in sel.find_all("option")
            if opt.get("value") and opt.get("value") not in ["*", "**"]
        ]
        # 去除已售罄或無效提示
        options = [re.sub(r'\[.*?(sold out|품절).*?\]', '', o, flags=re.IGNORECASE).strip() for o in options]
        options = [o for o in options if o and "choose" not in o.lower() and "select" not in o.lower()]

        if "color" in label_text or "색상" in label_text:
            color_options.extend(options)
        elif "size" in label_text or "사이즈" in label_text:
            size_options.extend(options)
        else:
            # 若無明確標籤，根據長度或內容簡單歸類
            if not color_options:
                color_options.extend(options)
            elif not size_options:
                size_options.extend(options)

    # 去重
    color_options = list(dict.fromkeys(color_options))
    size_options = list(dict.fromkeys(size_options))
    return color_options, size_options

def scrape_single_product(url):
    """抓取單個 Rockfish 產品的完整資料"""
    try:
        res = requests.get(url.strip(), headers=HEADERS, timeout=15)
        if res.status_code != 200:
            return None
        soup = BeautifulSoup(res.text, "html.parser")

        # 1. 抓取標題
        name_tag = soup.select_one(".headingArea h2, .name, font.ec-product-name")
        title = name_tag.get_text(strip=True) if name_tag else ""
        if not title:
            title = soup.title.get_text(strip=True) if soup.title else "Rockfish Product"

        # 2. 抓取售價
        price_tag = soup.select_one("#span_product_price_text, .price, span[id*='price']")
        price = "0.00"
        if price_tag:
            price_match = re.search(r'[\d,.]+', price_tag.get_text())
            if price_match:
                price = price_match.group(0).replace(",", "")

        # 3. 抓取高清圖片
        images = []
        img_tags = soup.select(".keyImg img, .detail_view img, #prdDetail img")
        for img in img_tags:
            src = img.get("src") or img.get("ec-data-src")
            if src:
                if src.startswith("//"):
                    src = "https:" + src
                elif src.startswith("/"):
                    src = BASE_URL + src
                if not any(k in src.lower() for k in ["icon", "btn", "blank", "common", "logo"]):
                    if src not in images:
                        images.append(src)

        # 4. 抓取顏色與尺碼選項
        colors, sizes = parse_options(soup)
        if not colors:
            colors = ["Default Color"]
        if not sizes:
            sizes = ["Default Size"]

        return {
            "title": title,
            "handle": clean_handle(title),
            "price": price,
            "images": images,
            "colors": colors,
            "sizes": sizes
        }
    except Exception as e:
        st.error(f"抓取連結失敗 ({url}): {e}")
        return None

def build_shopify_rows(products_data):
    """將抓取的資料轉換為 Shopify 規格 CSV 格式"""
    rows = []

    for prod in products_data:
        handle = prod["handle"]
        title = prod["title"]
        price = prod["price"]
        images = prod["images"]
        colors = prod["colors"]
        sizes = prod["sizes"]

        # 生成所有變體組合 (Color x Size)
        variants = []
        has_color = colors != ["Default Color"]
        has_size = sizes != ["Default Size"]

        for c in colors:
            for s in sizes:
                variants.append((c, s))

        # 決定圖片與變體的最大行數
        max_rows = max(len(variants), len(images))

        for idx in range(max_rows):
            is_first = (idx == 0)
            
            # 變體資料
            var_color = ""
            var_size = ""
            if idx < len(variants):
                var_color = variants[idx][0] if has_color else "Default Title"
                var_size = variants[idx][1] if has_size else ""

            # 圖片資料
            img_src = images[idx] if idx < len(images) else ""
            img_pos = idx + 1 if img_src else ""

            row = {
                "Handle": handle,
                "Title": title if is_first else "",
                "Body (HTML)": f"<p>{title}</p>" if is_first else "",
                "Vendor": "Rockfish Weatherwear" if is_first else "",
                "Type": "Shoes" if is_first else "",
                "Tags": "Rockfish, 代購, Korea" if is_first else "",
                "Published": "TRUE" if is_first else "",
                "Option1 Name": "Color" if has_color else "Title",
                "Option1 Value": var_color,
                "Option2 Name": "Size" if has_size else "",
                "Option2 Value": var_size,
                "Variant Price": price if idx < len(variants) else "",
                "Variant Requires Shipping": "TRUE" if idx < len(variants) else "",
                "Variant Taxable": "TRUE" if idx < len(variants) else "",
                "Image Src": img_src,
                "Image Position": img_pos,
                "Status": "active" if is_first else ""
            }
            rows.append(row)

    return pd.DataFrame(rows)

# ----------------- Streamlit UI -----------------
st.set_page_config(page_title="Rockfish to Shopify 轉換工具", page_icon="🛍️", layout="wide")

st.title("🛍️ Rockfish 代購商品快速匯出工具")
st.write("將多條 Rockfish Weatherwear 商品網址貼入下方文字框，自動抓取顏色、尺碼、圖片與售價並輸出成 Shopify 專用 CSV。")

urls_text = st.text_area(
    "請輸入商品網址（每行一條）：",
    height=200,
    placeholder="https://en.rockfish-weatherwear.co.kr/product/detail.html?product_no=1234\nhttps://en.rockfish-weatherwear.co.kr/product/detail.html?product_no=5678"
)

if st.button("🚀 開始抓取商品資料", type="primary"):
    url_list = [u.strip() for u in urls_text.splitlines() if u.strip()]
    if not url_list:
        st.warning("請先輸入至少一條商品網址！")
    else:
        progress_bar = st.progress(0)
        status_text = st.empty()
        
        extracted_data = []
        for i, url in enumerate(url_list):
            status_text.text(f"正在抓取 ({i+1}/{len(url_list)}): {url}")
            data = scrape_single_product(url)
            if data:
                extracted_data.append(data)
            progress_bar.progress((i + 1) / len(url_list))
            time.sleep(0.5)

        if extracted_data:
            df = build_shopify_rows(extracted_data)
            st.success(f"🎉 成功抓取 {len(extracted_data)} 件商品！")
            
            st.subheader("預覽即將匯出的資料")
            st.dataframe(df[["Handle", "Title", "Option1 Value", "Option2 Value", "Variant Price", "Image Src"]].head(20))

            csv_data = df.to_csv(index=False, encoding="utf-8-sig")
            st.download_button(
                label="📥 下載 Shopify 標準 CSV 檔",
                data=csv_data,
                file_name="rockfish_shopify_products.csv",
                mime="text/csv",
                type="primary"
            )
