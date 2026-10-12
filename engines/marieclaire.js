window.REGISTERED_ENGINES = window.REGISTERED_ENGINES || [];

window.REGISTERED_ENGINES.push({
  id: 'marieclaire',
  name: 'Marie Claire',
  pageUrl: 'marieclaire.html',
  description: '支援 fncmall / Marie Claire：自動韓英品名翻譯、色塊選項顏色提取、完整模特大圖抓取',

  parse: function(html, url) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var root = new URL(url).origin;

    // 1. 韓文品名常用詞典 -> 英文翻譯
    var KOREAN_DICT = {
      '배색체크': 'Color Block Check',
      '배색': 'Color Block',
      '체크': 'Check',
      '브러쉬': 'Brush',
      '니트': 'Knit',
      '머플러': 'Muffler',
      '스카프': 'Scarf',
      '장갑': 'Gloves',
      '바클라바': 'Balaclava',
      '울': 'Wool',
      '캐시미어': 'Cashmere',
      '모헤어': 'Mohair',
      '슬기': '',
      'pick': '',
      'PICK': ''
    };

    // 韓文顏色 -> 英文顏色字典
    var COLOR_DICT = {
      '핑크': 'Pink',
      '베이비핑크': 'Baby Pink',
      '블루': 'Blue',
      '스카이블루': 'Sky Blue',
      '소라': 'Sky Blue',
      '네이비': 'Navy',
      '브라운': 'Brown',
      '다크브라운': 'Dark Brown',
      '베이지': 'Beige',
      '오트밀': 'Oatmeal',
      '아이보리': 'Ivory',
      '크림': 'Cream',
      '화이트': 'White',
      '블랙': 'Black',
      '그레이': 'Grey',
      '차콜': 'Charcoal',
      '멜란지': 'Melange',
      '그린': 'Green',
      '민트': 'Mint',
      '카키': 'Khaki',
      '옐로우': 'Yellow',
      '버터': 'Butter',
      '레드': 'Red',
      '와인': 'Wine',
      '퍼플': 'Purple',
      '라벤더': 'Lavender',
      '오렌지': 'Orange'
    };

    // 2. 標題擷取與翻譯
    var titleTag = doc.querySelector('meta[property="og:title"], h1, .headingArea h2, .name');
    var rawTitle = titleTag ? (titleTag.getAttribute('content') || titleTag.innerText || '') : '';
    if (!rawTitle && doc.title) rawTitle = doc.title;

    // 切除品牌後綴 (例如 - 마리끌레르 패션, - marie claire)
    var cleanRaw = rawTitle.replace(/Product Name\s*:/i, '').trim();
    cleanRaw = cleanRaw.replace(/^\[.*?\]\s*/i, '').trim();
    cleanRaw = cleanRaw.split(/\s*[-–|]\s*(?:마리끌레르|marie claire|fncmall)/i)[0].trim();
    cleanRaw = cleanRaw.replace(/\s*슬기\s*pick\s*/i, '').trim();

    // 嘗試翻譯品名
    var englishWords = [];
    var tokens = cleanRaw.split(/\s+/);
    for (var i = 0; i < tokens.length; i++) {
      var tok = tokens[i].trim();
      var translated = false;
      for (var k in KOREAN_DICT) {
        if (tok.indexOf(k) !== -1) {
          if (KOREAN_DICT[k] && englishWords.indexOf(KOREAN_DICT[k]) === -1) {
            englishWords.push(KOREAN_DICT[k]);
          }
          translated = true;
        }
      }
      if (!translated && /^[A-Za-z0-9]+$/.test(tok)) {
        englishWords.push(tok);
      }
    }

    var finalTitle = englishWords.length > 0 ? englishWords.join(' ') : cleanRaw;
    // 確保標題乾淨大寫
    finalTitle = finalTitle.replace(/\s+/g, ' ').trim();
    var cleanHandle = finalTitle.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/[\s_]+/g, '-');
    if (!cleanHandle) cleanHandle = 'marie-claire-product';

    // 3. 顏色提取（檢查色塊、選項選單、網址）
    var color = '';

    // A: 檢查網頁上的顏色選單或色塊元素
    var colorElements = doc.querySelectorAll('.ec-product-button li, select[id*="option"] option, [name*="option"] option, .opt_color, .color_name');
    for (var c = 0; c < colorElements.length; c++) {
      var txt = colorElements[c].innerText || colorElements[c].getAttribute('title') || colorElements[c].getAttribute('data-title') || '';
      for (var ck in COLOR_DICT) {
        if (txt.indexOf(ck) !== -1) {
          color = COLOR_DICT[ck];
          break;
        }
      }
      if (color) break;
    }

    // B: 若無，從網頁文字與標題匹配
    if (!color) {
      for (var ck2 in COLOR_DICT) {
        if (cleanRaw.indexOf(ck2) !== -1) {
          color = COLOR_DICT[ck2];
          break;
        }
      }
    }

    // C: 若仍無，從 URL 或商品代碼推算
    if (!color) {
      var lowUrl = url.toLowerCase();
      for (var ck3 in COLOR_DICT) {
        var engCol = COLOR_DICT[ck3].toLowerCase();
        if (lowUrl.indexOf(engCol) !== -1) {
          color = COLOR_DICT[ck3];
          break;
        }
      }
    }

    // D: 兜底檢查英文標準色
    if (!color) {
      var standardCols = ['Pink', 'Blue', 'Brown', 'Ivory', 'Grey', 'Black', 'Beige', 'Mint', 'Sky Blue', 'Charcoal'];
      for (var sc = 0; sc < standardCols.length; sc++) {
        var rg = new RegExp(standardCols[sc], 'i');
        if (rg.test(html.substring(0, 5000))) {
          color = standardCols[sc];
          break;
        }
      }
    }

    if (!color) color = 'Color ' + (url.match(/\/(\d+)\/?$/) ? url.match(/\/(\d+)\/?$/)[1] : '1');

    // 4. 價格提取
    var price = '0.00';
    var priceTag = doc.querySelector('meta[property="product:sale_price:amount"], [itemprop="price"], #span_product_price_text, .price, span[id*="price"]');
    if (priceTag) {
      var pText = priceTag.getAttribute('content') || priceTag.innerText || '';
      var pMatch = pText.match(/[\d,.]+/);
      if (pMatch) price = pMatch[0].replace(/,/g, '');
    }

    // 5. 圖片提取（涵蓋主圖、縮圖清單、內文模特大圖）
    var keyImg = '';
    var allImages = [];

    // 主圖
    var mainEl = doc.querySelector('.keyImg img, .thumbnail img, .bigImage img, #main-image img');
    if (mainEl) {
      var m = mainEl.getAttribute('src') || mainEl.getAttribute('ec-data-src') || '';
      if (m.indexOf('//') === 0) m = 'https:' + m;
      else if (m.indexOf('/') === 0) m = root + m;
      if (m.indexOf('http://') === 0) m = m.replace('http://', 'https://');
      if (m.toLowerCase().indexOf('logo') === -1) keyImg = m;
    }

    // 縮圖列（.xans-product-addimage）+ 詳情內文圖（#prdDetail）
    var candidateImgs = doc.querySelectorAll('.xans-product-addimage img, #prdDetail img, .detail_view img, .cont img');
    for (var imgIdx = 0; imgIdx < candidateImgs.length; imgIdx++) {
      var el = candidateImgs[imgIdx];
      var src = el.getAttribute('ec-data-src') || el.getAttribute('data-original') || el.getAttribute('src') || '';
      if (!src) continue;

      if (src.indexOf('/small/') !== -1) src = src.replace('/small/', '/big/');
      if (src.indexOf('//') === 0) src = 'https:' + src;
      else if (src.indexOf('/') === 0) src = root + src;
      if (src.indexOf('http://') === 0) src = src.replace('http://', 'https://');

      var low = src.toLowerCase();
      var isJunk = low.indexOf('.svg') !== -1 ||
                   low.indexOf('logo') !== -1 ||
                   low.indexOf('banner') !== -1 ||
                   low.indexOf('naver') !== -1 ||
                   low.indexOf('pay') !== -1 ||
                   low.indexOf('.gif') !== -1 ||
                   low.indexOf('icon') !== -1 ||
                   low.indexOf('btn') !== -1 ||
                   low.indexOf('common') !== -1;

      if (!isJunk && (low.indexOf('/product/') !== -1 || low.indexOf('fncmall.com') !== -1 || low.indexOf('upload') !== -1)) {
        if (!keyImg) keyImg = src;
        if (allImages.indexOf(src) === -1) allImages.push(src);
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
