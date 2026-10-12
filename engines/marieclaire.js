window.REGISTERED_ENGINES = window.REGISTERED_ENGINES || [];

window.REGISTERED_ENGINES.push({
  id: 'marieclaire',
  name: 'Marie Claire',
  pageUrl: 'marieclaire.html',
  description: '專為 Marie Claire (fncmall) 設計：動態韓英翻譯、自動區分不同款式、精準綁定顏色模特圖',

  parse: function(html, url) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var root = new URL(url).origin;

    // 1. 通用韓英翻譯字典庫（按詞彙由長至短匹配替換）
    var DICT = [
      // 複合詞
      { kr: /배색체크/g, en: 'Color Block Check ' },
      { kr: /코튼캔디/g, en: 'Cotton Candy ' },
      { kr: /브러쉬/g, en: 'Brush ' },
      { kr: /스트라이프/g, en: 'Stripe ' },
      { kr: /솔리드/g, en: 'Solid ' },
      { kr: /헤어리/g, en: 'Hairy ' },
      // 單詞
      { kr: /미니/g, en: 'Mini ' },
      { kr: /퍼지/g, en: 'Fuzzy ' },
      { kr: /울/g, en: 'Wool ' },
      { kr: /니트/g, en: 'Knit ' },
      { kr: /머플러/g, en: 'Muffler ' },
      { kr: /스카프/g, en: 'Scarf ' },
      { kr: /체크/g, en: 'Check ' },
      { kr: /배색/g, en: 'Color Block ' },
      { kr: /장갑/g, en: 'Gloves ' },
      { kr: /바클라바/g, en: 'Balaclava ' },
      { kr: /패딩/g, en: 'Padding ' },
      { kr: /모자/g, en: 'Hat ' },
      { kr: /비니/g, en: 'Beanie ' },
      { kr: /베스트/g, en: 'Vest ' },
      { kr: /가디건/g, en: 'Cardigan ' },
      { kr: /자켓/g, en: 'Jacket ' },
      { kr: /코트/g, en: 'Coat ' }
    ];

    // 2. 韓文顏色對照表
    var COLOR_MAP = [
      { kr: '핑크', en: 'Pink' },
      { kr: '베이비핑크', en: 'Baby Pink' },
      { kr: '블루', en: 'Blue' },
      { kr: '스카이블루', en: 'Sky Blue' },
      { kr: '소라', en: 'Sky Blue' },
      { kr: '네이비', en: 'Navy' },
      { kr: '브라운', en: 'Brown' },
      { kr: '베이지', en: 'Beige' },
      { kr: '오트밀', en: 'Oatmeal' },
      { kr: '아이보리', en: 'Ivory' },
      { kr: '크림', en: 'Cream' },
      { kr: '화이트', en: 'White' },
      { kr: '블랙', en: 'Black' },
      { kr: '그레이', en: 'Grey' },
      { kr: '차콜', en: 'Charcoal' },
      { kr: '민트', en: 'Mint' },
      { kr: '카키', en: 'Khaki' },
      { kr: '레드', en: 'Red' },
      { kr: '와인', en: 'Wine' },
      { kr: '옐로우', en: 'Yellow' },
      { kr: '버터', en: 'Butter' },
      { kr: '라벤더', en: 'Lavender' }
    ];

    // 3. 標題擷取與動態翻譯
    var rawTitle = '';
    var titleTag = doc.querySelector('meta[property="og:title"], h1, .headingArea h2, .name');
    if (titleTag) rawTitle = titleTag.getAttribute('content') || titleTag.innerText || '';
    if (!rawTitle && doc.title) rawTitle = doc.title;

    var clean = rawTitle.replace(/Product Name\s*:/i, '').trim();
    clean = clean.replace(/^\[.*?\]\s*/i, '').trim(); // 去除 [Seulgi's Pick] 等
    clean = clean.split(/\s*[-–|]\s*(?:마리끌레르|marie claire|fncmall)/i)[0].trim();
    clean = clean.replace(/슬기\s*pick/gi, '').trim();

    // 執行通用動態翻譯
    var translated = clean;
    for (var d = 0; d < DICT.length; d++) {
      translated = translated.replace(DICT[d].kr, DICT[d].en);
    }

    // 清理多餘符號與空白，確保首字母大寫
    var words = translated.replace(/[^\w\s-]/g, ' ').trim().split(/\s+/);
    var titleWords = [];
    for (var w = 0; w < words.length; w++) {
      var word = words[w].trim();
      if (word) {
        titleWords.push(word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
      }
    }

    var finalTitle = titleWords.join(' ');
    if (!finalTitle || finalTitle.length < 3) {
      finalTitle = 'Marie Claire Item';
    }

    var cleanHandle = finalTitle.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/[\s_]+/g, '-');

    // 4. 顏色提取
    var color = '';
    var optEls = doc.querySelectorAll('.ec-product-button li, select[id*="option"] option, [name*="option"] option, .opt_color');
    for (var i = 0; i < optEls.length; i++) {
      var optText = optEls[i].innerText || optEls[i].getAttribute('title') || optEls[i].getAttribute('data-title') || '';
      for (var c = 0; c < COLOR_MAP.length; c++) {
        if (optText.indexOf(COLOR_MAP[c].kr) !== -1) {
          color = COLOR_MAP[c].en;
          break;
        }
      }
      if (color) break;
    }

    // 若按鈕未標示，從標題與 URL 中提取顏色
    if (!color) {
      for (var c2 = 0; c2 < COLOR_MAP.length; c2++) {
        if (clean.indexOf(COLOR_MAP[c2].kr) !== -1 || url.indexOf(COLOR_MAP[c2].kr) !== -1) {
          color = COLOR_MAP[c2].en;
          break;
        }
      }
    }

    // 兜底提取商品 ID 作為顏色代號
    if (!color) {
      var idMatch = url.match(/\/(\d+)\/?$/);
      color = idMatch ? ('Color ' + idMatch[1]) : 'Default Color';
    }

    // 5. 價格提取
    var price = '0.00';
    var priceTag = doc.querySelector('meta[property="product:sale_price:amount"], [itemprop="price"], #span_product_price_text, .price, span[id*="price"]');
    if (priceTag) {
      var pText = priceTag.getAttribute('content') || priceTag.innerText || '';
      var m = pText.match(/[\d,.]+/);
      if (m) price = m[0].replace(/,/g, '');
    }

    // 6. 圖片提取：精準抓取真實存在的商品大圖
    var keyProductImg = '';
    var allValidImgs = [];

    // 當前顏色頁面的專屬封面模特圖
    var mainEl = doc.querySelector('.keyImg img, .thumbnail img, .bigImage img, #main-image img');
    if (mainEl) {
      var mSrc = mainEl.getAttribute('src') || mainEl.getAttribute('ec-data-src') || '';
      if (mSrc.indexOf('//') === 0) mSrc = 'https:' + mSrc;
      else if (mSrc.indexOf('/') === 0) mSrc = root + mSrc;
      if (mSrc.indexOf('http://') === 0) mSrc = mSrc.replace('http://', 'https://');
      
      if (mSrc.toLowerCase().indexOf('logo') === -1 && mSrc.indexOf('/tiny/') === -1) {
        keyProductImg = mSrc;
      }
    }

    var allImgs = doc.querySelectorAll('img');
    for (var j = 0; j < allImgs.length; j++) {
      var src = allImgs[j].getAttribute('ec-data-src') || allImgs[j].getAttribute('data-original') || allImgs[j].getAttribute('src') || '';
      if (!src) continue;

      if (src.indexOf('//') === 0) src = 'https:' + src;
      else if (src.indexOf('/') === 0) src = root + src;
      if (src.indexOf('http://') === 0) src = src.replace('http://', 'https://');

      var low = src.toLowerCase();
      var isJunk = low.indexOf('.svg') !== -1 ||
                   low.indexOf('/tiny/') !== -1 ||
                   low.indexOf('/small/') !== -1 ||
                   low.indexOf('logo') !== -1 ||
                   low.indexOf('banner') !== -1 ||
                   low.indexOf('naver') !== -1 ||
                   low.indexOf('pay') !== -1 ||
                   low.indexOf('.gif') !== -1 ||
                   low.indexOf('icon') !== -1 ||
                   low.indexOf('btn') !== -1 ||
                   low.indexOf('common') !== -1;

      if (!isJunk && (low.indexOf('/product/big/') !== -1 || low.indexOf('/product/extra/big/') !== -1)) {
        if (!keyProductImg) keyProductImg = src;
        if (allValidImgs.indexOf(src) === -1) {
          allValidImgs.push(src);
        }
      }
    }

    if (keyProductImg && allValidImgs.indexOf(keyProductImg) === -1) {
      allValidImgs.unshift(keyProductImg);
    }

    return {
      vendor: 'Marie Claire',
      type: 'Accessories',
      title: finalTitle,
      handle: cleanHandle,
      color: color,
      price: price,
      keyImage: keyProductImg,
      images: allValidImgs,
      sizes: [],
      sourceUrl: url
    };
  }
});
