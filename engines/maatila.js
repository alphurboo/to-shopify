window.REGISTERED_ENGINES = window.REGISTERED_ENGINES || [];

window.REGISTERED_ENGINES.push({
  id: 'maatila',
  name: 'Maatila',
  pageUrl: 'maatila.html',
  description: '專為 Maatila 設計：只保留 Four Seasons 款式、剔除按鈕色塊圖、完整抓取商品大圖與內文相片',

  parse: async function(html, url) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var root = new URL(url).origin;

    // 1. 韓英常用字典
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

    // 優化標題，明確標註 Four Seasons
    if (englishTitle.indexOf('Four Seasons') === -1 && englishTitle.indexOf('All Seasons') === -1) {
      englishTitle = englishTitle.replace(/Four Seasons\/Fever\/Interseasonal/i, 'Four Seasons').trim();
    }
    var cleanHandle = (englishTitle || 'maatila-product').toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/[\s_]+/g, '-');

    // 3. 基礎價格
    var price = '39900.00';
    var priceMatch = html.match(/product_price\s*=\s*'(\d+)'/);
    if (priceMatch) price = priceMatch[1] + '.00';

    // 4. 解析按鈕選項矩陣：【關鍵】只保留 사계절 (Four Seasons)
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

        // ★ 核心過濾：只允許「사계절」進入 CSV，其餘季節全部剔除
        if (rawSeason !== '사계절') {
          continue;
        }

        var color = COLOR_MAP[rawColor] || rawColor;
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

    // 5. 抓齊所有真實圖片（【關鍵】徹底封殺 /option/ 色塊圖標）
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

      // ★ 核心過濾：封殺 /option/ 按鈕色塊、品牌 banner 及雜誌圖標
      var isJunk = low.indexOf('.svg') !== -1 ||
                   low.indexOf('.gif') !== -1 ||
                   low.indexOf('/option/') !== -1 || // 徹底過濾色塊小圖
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
