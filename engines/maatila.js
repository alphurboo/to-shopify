window.REGISTERED_ENGINES = window.REGISTERED_ENGINES || [];

// 免費 Google Translate API (韓翻英輔助)
async function translateKoToEn(text) {
  if (!text || !/[\uac00-\ud7af]/.test(text)) return text;
  try {
    var url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=ko&tl=en&dt=t&q=' + encodeURIComponent(text);
    var res = await fetch(url);
    if (res.ok) {
      var data = await res.json();
      if (data && data[0]) {
        var translated = data[0].map(function(item) { return item[0]; }).join('').trim();
        if (translated) {
          // 首字母大寫格式化
          return translated.split(/\s+/).map(function(w){
            return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
          }).join(' ');
        }
      }
    }
  } catch (e) {}
  return text;
}

window.REGISTERED_ENGINES.push({
  id: 'maatila',
  name: 'Maatila',
  pageUrl: 'maatila.html',
  description: '專為 Maatila 設計：只保留 Four Seasons、動態/字典雙軌花色翻譯、剔除按鈕色塊圖、完整抓取商品大圖',

  parse: async function(html, url) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var root = new URL(url).origin;

    // 1. Maatila 精準花色字典庫（包含純色、條紋、格仔、甜品系列）
    var COLOR_MAP = {
      // 純色系列
      '아이보리': 'Ivory',
      '크림': 'Cream',
      '너티크림': 'Nutty Cream',
      '그린라떼': 'Green Latte',
      '스모키밀크': 'Smoky Milk',
      '밀크티': 'Milk Tea',
      '로즈무스': 'Rose Mousse',
      '크리미블루': 'Creamy Blue',
      '크리미 블루': 'Creamy Blue',
      '퓨어바닐라': 'Pure Vanilla',
      '차콜': 'Charcoal',
      '민트크림': 'Mint Cream',
      '그레이': 'Grey',
      '딥블랙': 'Deep Black',
      '화이트': 'White',

      // 圖 1：甜品/蘇打/條紋系列
      '레몬딜버터': 'Lemon Dill Butter',
      '딸기밀크소다': 'Strawberry Milk Soda',
      '바나나살구잼': 'Banana Apricot Jam',
      '밀키오레오팝': 'Milky Oreo Pop',
      '딸기생크림': 'Strawberry Fresh Cream',
      '로즈실버볼': 'Rose Silver Ball',
      '메론피치푸딩': 'Melon Peach Pudding',
      '블루레몬젤리': 'Blue Lemon Jelly',
      '라즈베리캔디': 'Raspberry Candy',
      '블루크림소다': 'Blue Cream Soda',
      '쿠키크럼블': 'Cookie Crumble',
      '피치브라우니': 'Peach Brownie',

      // 圖 2：居家日常/花草條紋系列
      '핑크원피스': 'Pink Dress',
      '버터쇼츠': 'Butter Shorts',
      '블루팬츠': 'Blue Pants',
      '클로버셔츠': 'Clover Shirts',
      '로즈캐미솔': 'Rose Camisole',
      '코튼마가렛': 'Cotton Margaret',
      '블랙슈가삭스': 'Black Sugar Socks',

      // 圖 3：法式休閒/條紋/瑪莉珍系列
      '페일블루진': 'Pale Blue Jean',
      '프렌치캐주얼': 'French Casual',
      '프렌치모닝': 'French Morning',
      '프렌치그린': 'French Green',
      '버터스윗셔츠': 'Butter Sweet Shirts',
      '프렌치모던': 'French Modern',
      '핑크리본슈즈': 'Pink Ribbon Shoes',
      '버터리본슈즈': 'Butter Ribbon Shoes',
      '블랙메리제인': 'Black Mary Jane',
      '그린더블자켓': 'Green Double Jacket'
    };

    var SIZE_MAP = {
      '슈퍼싱글SS': 'Super Single (SS)',
      '퀸Q': 'Queen (Q)',
      '킹K': 'King (K)',
      'SS': 'Super Single (SS)',
      'Q': 'Queen (Q)',
      'K': 'King (K)'
    };

    // 2. 標題擷取與翻譯
    var ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content') || doc.title || '';
    var cleanTitle = ogTitle.replace(/^maatila\s*-\s*/i, '').replace(/마틸라\s*-\s*/i, '').trim();

    var englishTitle = cleanTitle;
    if (/[\uac00-\ud7af]/.test(cleanTitle)) {
      englishTitle = await translateKoToEn(cleanTitle);
    }

    if (englishTitle.indexOf('Four Seasons') === -1 && englishTitle.indexOf('All Seasons') === -1) {
      englishTitle = englishTitle.replace(/Four Seasons\/Fever\/Interseasonal/i, 'Four Seasons')
                                 .replace(/Four Seasons\/Warm Heated\/In-between Seasons/i, 'Four Seasons')
                                 .replace(/간절기\/사계절/i, 'Four Seasons')
                                 .trim();
    }
    var cleanHandle = (englishTitle || 'maatila-product').toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/[\s_]+/g, '-');

    // 3. 基礎價格
    var price = '39900.00';
    var priceMatch = html.match(/product_price\s*=\s*'(\d+)'/);
    if (priceMatch) price = priceMatch[1] + '.00';

    // 4. 解析按鈕選項矩陣：【嚴格只保留 사계절 (Four Seasons)】
    var variants = [];
    var optValuesMatches = html.matchAll(/opt_values:'([^']+)',sto_price:'([^']+)'/g);
    var seenVariants = {};

    for (var m of optValuesMatches) {
      var rawVals = m[1].split(',');
      var addPrice = parseFloat(m[2]) || 0;
      var finalPrice = (parseFloat(price) + addPrice).toFixed(2);

      // rawVals: [0] 계절, [1] 색상, [2] 사이즈, [3] 구성
      if (rawVals.length >= 3) {
        var rawSeason = rawVals[0].trim();
        var rawColor = rawVals[1].trim();
        var rawSize = rawVals[2].trim();
        var rawSet = rawVals[3] ? rawVals[3].trim() : '';

        // ★ 核心：非四季款直接剔除
        if (rawSeason !== '사계절') {
          continue;
        }

        // 雙軌顏色翻譯：先查字典，若為新色則即時 Google 翻譯
        var color = COLOR_MAP[rawColor];
        if (!color) {
          color = await translateKoToEn(rawColor);
          COLOR_MAP[rawColor] = color; // 記錄快取
        }

        var size = SIZE_MAP[rawSize] || rawSize;
        if (rawSet && rawSet.indexOf('베개') !== -1) {
          size += ' (Set)';
        }

        var key = color + '__' + size;
        if (!seenVariants[key]) {
          seenVariants[key] = true;
          variants.push({
            color: color,
            size: size,
            price: finalPrice
          });
        }
      }
    }

    // 5. 抓齊所有真實圖片（徹底封殺 /option/ 色塊圖標）
    var allImages = [];
    var keyImage = '';

    var imgTags = doc.querySelectorAll('img');
    for (var i = 0; i < imgTags.length; i++) {
      var src = imgTags[i].getAttribute('src') || imgTags[i].getAttribute('data-src') || imgTags[i].getAttribute('ec-data-src') || '';
      if (!src) continue;

      if (src.indexOf('//') === 0) src = 'https:' + src;
      else if (src.indexOf('/') === 0) src = root + src;
      if (src.indexOf('http://') === 0) src = src.replace('http://', 'https://');

      var low = src.toLowerCase();

      // 黑名單過濾：封殺 /option/ 按鈕色塊、品牌 banner 及雜誌圖標
      var isJunk = low.indexOf('.svg') !== -1 ||
                   low.indexOf('.gif') !== -1 ||
                   low.indexOf('/option/') !== -1 || // 剔除按鈕色塊小圖
                   low.indexOf('icon') !== -1 ||
                   low.indexOf('btn') !== -1 ||
                   low.indexOf('logo') !== -1 ||
                   low.indexOf('banner') !== -1 ||
                   low.indexOf('naver') !== -1 ||
                   low.indexOf('top_brand') !== -1;

      // 只保留真實商品輪播大圖與詳細內容圖片
      if (!isJunk && (low.indexOf('shopimages/maatila') !== -1 || low.indexOf('img18.kr') !== -1 || low.indexOf('thumbnail') !== -1 || low.indexOf('jpg3.kr') !== -1)) {
        if (!keyImage) keyImage = src;
        if (allImages.indexOf(src) === -1) {
          allImages.push(src);
        }
      }
    }

    return {
      vendor: 'Maatila',
      type: 'Bedding',
      title: englishTitle,
      handle: cleanHandle,
      price: price,
      keyImage: keyImage,
      images: allImages,
      matrixVariants: variants,
      sourceUrl: url
    };
  }
});
