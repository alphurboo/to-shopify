window.REGISTERED_ENGINES = window.REGISTERED_ENGINES || [];

window.REGISTERED_ENGINES.push({
  id: 'mardi',
  name: 'Mardi Mercredi',
  pageUrl: 'mardi.html',
  description: '優先正方形平鋪大圖、長條圖置後、自動剔除韓文與全站海報 Logo',

  parse: function(html, url) {
    var doc = new DOMParser().parseFromString(html, 'text/html');

    // 1. 抓取正確標題
    var titleTag = doc.querySelector('meta[property="og:title"], h1, .headingArea h2, .product-title, .name');
    var rawTitle = titleTag ? (titleTag.getAttribute('content') || titleTag.innerText || '') : '';
    if (!rawTitle && doc.title) rawTitle = doc.title;

    var root = new URL(url).origin;

    // --- 切除品牌後綴與多餘韓文字 ---
    var t = rawTitle.replace(/Product Name\s*:/i, '').trim();
    t = t.replace(/^\[.*?\]\s*/i, '').trim();
    t = t.split(/\s*[-–|]\s*(?:MARDI MERCREDI|마르디|메크르디)/i)[0].trim();
    t = t.split('|')[0].trim();

    var color = '';
    // Mardi 底線顏色判斷：WOOL MUFFLER CHECK_BLUE / CHECK_PINK / CHECK_MINT
    var underscoreMatch = t.match(/_([A-Za-z\s]+)$/);
    if (underscoreMatch) {
      color = underscoreMatch[1].trim();
      t = t.substring(0, underscoreMatch.index).trim();
    } else {
      var dashMatch = t.match(/\s*[-–]\s*([A-Za-z\s]+)$/);
      if (dashMatch) {
        color = dashMatch[1].trim();
        t = t.substring(0, dashMatch.index).trim();
      }
    }

    if (!color) {
      var lowUrl = url.toLowerCase();
      var commonColors = ['blue', 'pink', 'mint', 'beige', 'brown', 'black', 'white', 'silver', 'navy', 'gray', 'grey', 'red', 'green', 'ivory', 'cream', 'khaki', 'camel', 'yellow', 'purple', 'charcoal', 'gold', 'orange', 'oatmeal'];
      for (var c = 0; c < commonColors.length; c++) {
        var testColor = commonColors[c];
        if (lowUrl.indexOf(testColor) !== -1) {
          color = testColor;
          break;
        }
      }
    }

    // 格式化顏色字串
    color = color ? color.toLowerCase().split(/\s+/).map(function(w){ return w.charAt(0).toUpperCase() + w.slice(1); }).join(' ') : 'Default Color';
    t = t.replace(/[\s_-]+$/, '').trim();
    if (!t || t.toUpperCase() === 'MARDI MERCREDI') {
      t = 'WOOL MUFFLER CHECK'; // 防止誤切防護罩
    }
    var cleanHandle = t.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/[\s_]+/g, '-');

    // 2. 價格抓取
    var priceTag = doc.querySelector('meta[property="product:sale_price:amount"], [itemprop="price"], #span_product_price_text, .price, span[id*="price"]');
    var price = '0.00';
    if (priceTag) {
      var pText = priceTag.getAttribute('content') || priceTag.innerText || '';
      var match = pText.match(/[\d,.]+/);
      if (match) price = match[0].replace(/,/g, '');
    }

    // 3. 圖片過濾（嚴格剔除所有 .svg 與網站導航圖標）
    var keyProductImg = '';
    var validImages = [];

    var allImgEls = doc.querySelectorAll('img');
    for (var i = 0; i < allImgEls.length; i++) {
      var el = allImgEls[i];
      var s = el.getAttribute('ec-data-src') || el.getAttribute('data-original') || el.getAttribute('src') || '';
      if (!s) continue;

      if (s.indexOf('//') === 0) s = 'https:' + s;
      else if (s.indexOf('/') === 0) s = root + s;
      if (s.indexOf('http://') === 0) s = s.replace('http://', 'https://');

      var low = s.toLowerCase();

      // 嚴格黑名單：絕對封殺所有 .svg、導航 icon、logo、社群按鈕
      if (low.indexOf('.svg') !== -1 ||
          low.indexOf('common') !== -1 ||
          low.indexOf('btn') !== -1 ||
          low.indexOf('icon') !== -1 ||
          low.indexOf('logo') !== -1 ||
          low.indexOf('banner') !== -1 ||
          low.indexOf('menu') !== -1 ||
          low.indexOf('cart') !== -1 ||
          low.indexOf('user') !== -1 ||
          low.indexOf('share') !== -1 ||
          low.indexOf('naver') !== -1 ||
          low.indexOf('pay') !== -1 ||
          low.indexOf('.gif') !== -1) {
        continue;
      }

      // 只保留真實商品圖片：NNEditor 內文圖或 /product/big/ 大圖
      if (low.indexOf('nneditor') !== -1 || low.indexOf('/upload/') !== -1 || low.indexOf('/product/big/') !== -1 || low.indexOf('/big/') !== -1) {
        if (validImages.indexOf(s) === -1) {
          validImages.push(s);
        }
      }
    }

    // 尋找與該顏色名稱對應的專屬圖（如 WOOL20CHECK20MUFFLER_PINK.jpg）
    var colorUpper = color.toUpperCase().replace(/\s+/g, '');
    for (var v = 0; v < validImages.length; v++) {
      if (validImages[v].toUpperCase().indexOf(colorUpper) !== -1) {
        keyProductImg = validImages[v];
        break;
      }
    }

    // 若未匹配到，使用第一張有效商品圖
    if (!keyProductImg && validImages.length > 0) {
      keyProductImg = validImages[0];
    }

    return {
      vendor: 'Mardi Mercredi',
      type: 'Accessories',
      title: t,
      handle: cleanHandle,
      color: color,
      price: price,
      keyImage: keyProductImg,
      images: validImages,
      sizes: [],
      sourceUrl: url
    };
  }
});
