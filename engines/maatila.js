window.REGISTERED_ENGINES = window.REGISTERED_ENGINES || [];

window.REGISTERED_ENGINES.push({
  id: 'maatila',
  name: 'Maatila',
  pageUrl: 'maatila.html',
  description: '專為 Maatila (MakeShop) 設計：抓取全部圖片、解析按鈕選項矩陣 (Season/Color/Size)、自動轉譯韓英品名',

  parse: async function(html, url) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var root = new URL(url).origin;

    // 1. 韓英常用字典（顏色與規格翻譯）
    var COLOR_MAP = {
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
      '화이트': 'White'
    };

    var SEASON_MAP = {
      '사계절': 'All Seasons',
      '발열': 'Warm Heated',
      '간절기': 'In-between Seasons'
    };

    var SIZE_MAP = {
      '슈퍼싱글SS': 'Super Single (SS)',
      '퀸Q': 'Queen (Q)',
      '킹K': 'King (K)',
      'SS': 'Super Single (SS)',
      'Q': 'Queen (Q)',
      'K': 'King (K)'
    };

    // 2. 標題擷取
    var ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content') || doc.title || '';
    var cleanTitle = ogTitle.replace(/^maatila\s*-\s*/i, '').replace(/마틸라\s*-\s*/i, '').trim();

    // 呼叫免費 Google 翻譯轉為俐落英文
    var englishTitle = cleanTitle;
    try {
      if (/[\uac00-\ud7af]/.test(cleanTitle)) {
        var gUrl = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=ko&tl=en&dt=t&q=' + encodeURIComponent(cleanTitle);
        var res = await fetch(gUrl);
        if (res.ok) {
          var data = await res.json();
          if (data && data[0]) {
            englishTitle = data[0].map(function(item) { return item[0]; }).join('').trim();
          }
        }
      }
    } catch (e) {}

    var cleanHandle = (englishTitle || 'maatila-product').toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/[\s_]+/g, '-');

    // 3. 基礎價格
    var price = '39900.00';
    var priceMatch = html.match(/product_price\s*=\s*'(\d+)'/);
    if (priceMatch) price = priceMatch[1] + '.00';

    // 4. 解析 MakeShop 底層 Option 按鈕矩陣 (optionJsonData)
    var variants = [];
    var optValuesMatches = html.matchAll(/opt_values:'([^']+)',sto_price:'([^']+)'/g);
    var seenVariants = {};

    for (var m of optValuesMatches) {
      var rawVals = m[1].split(',');
      var addPrice = parseFloat(m[2]) || 0;
      var finalPrice = (parseFloat(price) + addPrice).toFixed(2);

      // rawVals 結構: [0] 계절, [1] 색상, [2] 사이즈, [3] 구성
      if (rawVals.length >= 3) {
        var rawSeason = rawVals[0].trim();
        var rawColor = rawVals[1].trim();
        var rawSize = rawVals[2].trim();
        var rawSet = rawVals[3] ? rawVals[3].trim() : '';

        var season = SEASON_MAP[rawSeason] || rawSeason;
        var color = COLOR_MAP[rawColor] || rawColor;
        var size = SIZE_MAP[rawSize] || rawSize;

        // 如果只有「單被」，保留核心尺寸；如果有套裝，可標註於 Size 欄
        if (rawSet && rawSet.indexOf('베개') !== -1) {
          size += ' (Set)';
        }

        var key = season + '__' + color + '__' + size;
        if (!seenVariants[key]) {
          seenVariants[key] = true;
          variants.push({
            season: season,
            color: color,
            size: size,
            price: finalPrice
          });
        }
      }
    }

    // 5. 抓齊所有圖片（首圖輪播 + 縮圖列 + 內文詳細說明大圖）
    var allImages = [];
    var keyImage = '';

    // 尋找輪播大圖、makeshop cdn 圖與內文大圖
    var imgTags = doc.querySelectorAll('img');
    for (var i = 0; i < imgTags.length; i++) {
      var src = imgTags[i].getAttribute('src') || imgTags[i].getAttribute('data-src') || imgTags[i].getAttribute('ec-data-src') || '';
      if (!src) continue;

      if (src.indexOf('//') === 0) src = 'https:' + src;
      else if (src.indexOf('/') === 0) src = root + src;
      if (src.indexOf('http://') === 0) src = src.replace('http://', 'https://');

      var low = src.toLowerCase();

      // 過濾垃圾圖標
      var isJunk = low.indexOf('.svg') !== -1 ||
                   low.indexOf('.gif') !== -1 ||
                   low.indexOf('icon') !== -1 ||
                   low.indexOf('btn') !== -1 ||
                   low.indexOf('logo') !== -1 ||
                   low.indexOf('common') !== -1 ||
                   low.indexOf('banner') !== -1 ||
                   low.indexOf('naver') !== -1;

      // 篩選真實產品相（makeshop cdn / img18 / shopimages / thumbnail）
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
