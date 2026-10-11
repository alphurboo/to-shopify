import os
import re
import time
import requests
from bs4 import BeautifulSoup
import pandas as pd

BASE_URL = "https://en.rockfish-weatherwear.co.kr"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    )
}

def clean_handle(title):
    """將產品名稱轉成 Shopify Handle (URL 格式)"""
    handle = re.sub(r'[^a-zA-Z0-9\s-]', '', title).strip().lower()
    return re.sub(r'[\s_]+', '-', handle)

def get_product_images(product_url):
    """進入產品詳細頁，抓取所有高清主圖與細節圖"""
    try:
        res = requests.get(product_url, headers=HEADERS, timeout=15)
        if res.status_code != 200:
            return []
        soup = BeautifulSoup(res.text, "html.parser")
        
        images = []
        # Cafe24 詳細頁圖片 selector
        img_tags = soup.select(".keyImg img, .detail_view img, #prdDetail img")
        for img in img_tags:
            src = img.get("src") or img.get("ec-data-src")
            if src:
                if src.startswith("//"):
                    src = "https:" + src
                elif src.startswith("/"):
                    src = BASE_URL + src
                # 過濾 icon、按鈕與空白佔位圖
                if not any(k in src.lower() for k in ["icon", "btn", "blank", "common", "logo"]):
                    if src not in images:
                        images.append(src)
        return images
    except Exception as e:
        print(f"抓取詳細頁出錯 ({product_url}): {e}")
        return []

def scrape_category(category_url, max_pages=1):
    """抓取分類頁面，並生成符合 Shopify 標準格式的清單"""
    rows = []
    
    for page in range(1, max_pages + 1):
        url = f"{category_url}?page={page}"
        print(f"正在掃描頁面: {url}")
        res = requests.get(url, headers=HEADERS, timeout=15)
        if res.status_code != 200:
            print(f"無法讀取頁面: {url}")
            break
            
        soup = BeautifulSoup(res.text, "html.parser")
        items = soup.select(".prdList > li, ul[class*='prdList'] > li")
        
        if not items:
            print("本頁未找到任何商品。")
            break
            
        for item in items:
            link_tag = item.select_one("a[href*='/product/']")
            if not link_tag:
                continue
                
            href = link_tag.get("href")
            prod_url = BASE_URL + href if href.startswith("/") else href
            
            # 抓取產品標題
            name_tag = item.select_one(".name a, .description .name, strong.name")
            raw_title = name_tag.get_text(strip=True) if name_tag else ""
            title = raw_title.replace("Product Name :", "").strip()
            if not title:
                continue
                
            # 抓取價格 (USD 數值)
            price_tag = item.select_one("li[rel*='Price'], .price, span[id*='price']")
            price = ""
            if price_tag:
                price_match = re.search(r'[\d,.]+', price_tag.get_text())
                if price_match:
                    price = price_match.group(0).replace(",", "")
            
            # 列表頁縮圖
            thumb = item.select_one(".thumbnail img")
            main_img = ""
            if thumb:
                main_img = thumb.get("src") or thumb.get("ec-data-src") or ""
                if main_img.startswith("//"):
                    main_img = "https:" + main_img
                elif main_img.startswith("/"):
                    main_img = BASE_URL + main_img
            
            handle = clean_handle(title)
            print(f"發現商品: {title} | 標價: ${price}")
            
            # 進入詳細頁抓取全部細節圖
            time.sleep(0.5)
            detail_images = get_product_images(prod_url)
            
            all_images = []
            if main_img and main_img not in detail_images:
                all_images.append(main_img)
            all_images.extend(detail_images)
            if not all_images and main_img:
                all_images = [main_img]
                
            # 按照 Shopify 格式排版 (第一行填寫商品詳情，其後行只保留 Handle 及相片網址)
            if all_images:
                for idx, img_url in enumerate(all_images):
                    if idx == 0:
                        rows.append({
                            "Handle": handle,
                            "Title": title,
                            "Body (HTML)": f"<p>{title}</p>",
                            "Vendor": "Rockfish Weatherwear",
                            "Type": "Shoes",
                            "Tags": "Rockfish, Shoes, Korea",
                            "Published": "TRUE",
                            "Option1 Name": "Title",
                            "Option1 Value": "Default Title",
                            "Variant Price": price,
                            "Variant Requires Shipping": "TRUE",
                            "Variant Taxable": "TRUE",
                            "Image Src": img_url,
                            "Image Position": idx + 1,
                            "Status": "active"
                        })
                    else:
                        rows.append({
                            "Handle": handle,
                            "Title": "",
                            "Body (HTML)": "",
                            "Vendor": "",
                            "Type": "",
                            "Tags": "",
                            "Published": "",
                            "Option1 Name": "",
                            "Option1 Value": "",
                            "Variant Price": "",
                            "Variant Requires Shipping": "",
                            "Variant Taxable": "",
                            "Image Src": img_url,
                            "Image Position": idx + 1,
                            "Status": ""
                        })
            else:
                rows.append({
                    "Handle": handle,
                    "Title": title,
                    "Body (HTML)": f"<p>{title}</p>",
                    "Vendor": "Rockfish Weatherwear",
                    "Type": "Shoes",
                    "Tags": "Rockfish, Shoes, Korea",
                    "Published": "TRUE",
                    "Option1 Name": "Title",
                    "Option1 Value": "Default Title",
                    "Variant Price": price,
                    "Variant Requires Shipping": "TRUE",
                    "Variant Taxable": "TRUE",
                    "Image Src": "",
                    "Image Position": "",
                    "Status": "active"
                })

    df = pd.DataFrame(rows)
    output_filename = "rockfish_shopify_import.csv"
    df.to_csv(output_filename, index=False, encoding="utf-8-sig")
    print(f"\n抓取完成！檔案已儲存為: {output_filename}")

if __name__ == "__main__":
    # 預設目標：Shoes 分類第一頁
    target_category = "https://en.rockfish-weatherwear.co.kr/category/shoes/333/"
    scrape_category(target_category, max_pages=1)
