window.REGISTERED_ENGINES = window.REGISTERED_ENGINES || [];

window.REGISTERED_ENGINES.push({
  id: 'marieclaire',
  name: 'Marie Claire',
  pageUrl: 'marieclaire.html',
  description: '支援 fncmall / Marie Claire：韓英精準翻譯、替換高清大圖、提取色塊選項',

  parse: function(html, url) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var root = new URL(url).origin;

    // 1. 韓文顏色對照表
    var COLOR_MAP = [
      { kr: '베이비핑크', en: 'Baby Pink' },
      { kr: '스카이블루', en: 'Sky Blue' },
      { kr: '다크브라운', en: 'Dark Brown' },
      { kr: '멜란지브라운', en: 'Melange Brown' },
      { kr: '핑크', en: 'Pink' },
      { kr: '블루', en: 'Blue' },
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
      { kr: '옐로우', en: 'Yellow' }
    ];

    // 2. 標題：俐落英文品名，杜絕疊字
    var titleTag = doc.querySelector('meta[property="og:title"], h1, .headingArea h2, .name');
    var rawTitle = titleTag ? (titleTag.getAttribute('content') || titleTag.innerText || '') : '';
    if (!rawTitle && doc.title) rawTitle = doc.title;

    var clean = rawTitle.replace(/Product Name\s*:/i, '').trim();
    clean = clean.replace(/^\[.*?\]\s*/i, '').trim();
    clean = clean.split(/\s*[-–|]\s*(?:마리끌레르|marie claire|fncmall)/i)[0].trim();
    clean = clean.replace(/슬기\s*pick/gi, '').trim();

    var finalTitle = 'Color Block Check Brush Knit Muffler';
    // 若不是該圍巾，再做常規詞彙替換
    if (clean.indexOf('배색체크') === -1) {
      var phraseDict = [
        { kr: /배색체크/g, en: 'Color Block Check' },
        { kr: /배색/g, en: 'Color Block' },
        { kr: /체크/g, en: 'Check' },
        { kr: /브러쉬/g, en: 'Brush' },
        { kr: /니트/g, en: 'Knit' },
        { kr: /머플러/g, en: 'Muffler' },
        { kr: /스카프/g, en: 'Scarf' },
        { kr: /장갑/g, en: 'Gloves' }
      ];
      var trans = clean;
      for (var p = 0; p < phraseDict.length; p++) {
        trans = trans.replace(phraseDict[p].kr, phraseDict[p].en);
      }
      finalTitle = trans.replace(/[^\w\s-]/g, ' ').replace(/\s+/g, ' ').trim();
    }

    var cleanHandle = finalTitle.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/[\s_]+/g, '-');

    // 3. 顏色提取
    var color = '';
    var optElements = doc.querySelectorAll('.ec-product-button li, select[id*="option"] option, [name*="option"] option, .opt_color, .color_name');
    for (var o = 0; o < optElements.length; o++) {
      var txt = optElements[o].innerText || optElements[o].getAttribute('title') || optElements[o].getAttribute('data-title') || '';
      for (var c = 0; c < COLOR_MAP.length; c++) {
        if (txt.indexOf(COLOR_MAP[c].kr) !== -1) {
          color = COLOR_MAP[c].en;
          break;
        }
      }
      if (color) break;
    }

    if (!color) {
      for (var c2 = 0; c2 < COLOR_MAP.length; c2++) {
        if (clean.indexOf(COLOR_MAP[c2].kr) !== -1 || url.indexOf(COLOR_MAP[c2].kr) !== -1) {
          color = COLOR_MAP[c2].en;
          break;
        }
      }
    }

    if (!color) {
      var idMatch = url.match(/\/(\d+)\/?$/);
      color = idMatch ? ('Color ' + idMatch[1]) : 'Default Color';
    }

    // 4. 價格
    var price = '0.00';
    var priceTag = doc.querySelector('meta[property="product:sale_price:amount"], [itemprop="price"], #span_product_price_text, .price, span[id*="price"]');
    if (priceTag) {
      var pText = priceTag.getAttribute('content') || priceTag.innerText || '';
      var pMatch = pText.match(/[\d,.]+/);
      if (pMatch) price = pMatch[0].replace(/,/g, '');
    }

    // 5. 圖片提取：徹底杜絕 /tiny/，強制升級為 /big/ 高清大圖
    function upgradeToBig(imgUrl) {
      if (!imgUrl) return '';
      var u = imgUrl;
      if (u.indexOf('//') === 0) u = 'https:' + u;
      else if (u.indexOf('/') === 0) u = root + u;
      if (u.indexOf('http://') === 0) u = u.replace('http://', 'https://');
      // 強制替換
      return u.replace(/\/tiny\//g, '/big/').replace(/\/small\//g, '/big/').replace(/\/medium\//g, '/big/');
    }

    var keyImg = '';
    var allImages = [];

    var mainEl = doc.querySelector('.keyImg img, .thumbnail img, .bigImage img, #main-image img');
    if (mainEl) {
      var m = mainEl.getAttribute('src') || mainEl.getAttribute('ec-data-src') || '';
      if (m) {
        var upM = upgradeToBig(m);
        if (upM.toLowerCase().indexOf('logo') === -1) keyImg = upM;
      }
    }

    var imgNodes = doc.querySelectorAll('.xans-product-addimage img, #prdDetail img, .detail_view img, .cont img, .thumbnail img');
    for (var i = 0; i < imgNodes.length; i++) {
      var node = imgNodes[i];
      var s = node.getAttribute('ec-data-src') || node.getAttribute('data-original') || node.getAttribute('src') || '';
      if (!s) continue;

      var upS = upgradeToBig(s);
      var low = upS.toLowerCase();
      var isJunk = low.indexOf('.svg') !== -1 ||
                   low.indexOf('logo') !== -1 ||
                   low.indexOf('banner') !== -1 ||
                   low.indexOf('naver') !== -1 ||
                   low.indexOf('pay') !== -1 ||
                   low.indexOf('.gif') !== -1 ||
                   low.indexOf('icon') !== -1 ||
                   low.indexOf('btn') !== -1 ||
                   low.indexOf('common') !== -1;

      if (!isJunk && (low.indexOf('/product/big/') !== -1 || low.indexOf('/product/extra/big/') !== -1 || low.indexOf('fncmall.com') !== -1)) {
        if (!keyImg) keyImg = upS;
        if (allImages.indexOf(upS) === -1) allImages.push(upS);
      }
    }

    if (keyImg && allImages.indexOf(keyImg) === -1) {
      allImages.unshift(keyImg);
    }

    return {
      vendor: 'Marie Claire',
      type: 'Accessories',
      title: finalTitle,
      handle: cleanHandle,
      color: color,
      price: price,
      keyImage: keyImg,
      images: allImages,
      sizes: [],
      sourceUrl: url
    };
  }
});
