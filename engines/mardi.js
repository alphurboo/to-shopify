window.REGISTERED_ENGINES = window.REGISTERED_ENGINES || [];

window.REGISTERED_ENGINES.push({
  id: 'mardi',
  name: 'Mardi Mercredi',
  pageUrl: 'mardi.html',
  description: '優先正方形平鋪大圖、長條圖置後、自動剔除韓文與全站海報 Logo',

  parse: function(html, url) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var rawTitle = doc.querySelector('meta[property="og:title"], h1, .headingArea h2, .product-title, .name')?.innerText || doc.title || 'Product';
    var root = new URL(url).origin;

    // --- Mardi 專屬切字邏輯 ---
    var t = rawTitle.replace(/Product Name\s*:/i, '').trim();
    t = t.replace(/^\[.*?\]\s*/i, '').trim();
    // 切除後綴 - MARDI MERCREDI | 마르디 메크르디
    t = t.split(/\s*[-–|]\s*(?:MARDI MERCREDI|마르디|메크르디)/i)[0].trim();
    t = t.split('|')[0].trim();

    var color = '';
    // Mardi 官網底線命名：WOOL MUFFLER CHECK_BLUE
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

    color = color ? color.toLowerCase().split(/\s+/).map(function(w){ return w.charAt(0).toUpperCase() + w.slice(1); }).join(' ') : 'Default Color';
    t = t.replace(/[\s_-]+$/, '').trim();
    var cleanHandle = t.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/[\s_]+/g, '-');

    // --- 抓價格 ---
    var priceTag = doc.querySelector('meta[property="product:sale_price:amount"], [itemprop="price"], #span_product_price_text, .price, span[id*="price"]');
    var price = '0.00';
    if (priceTag) {
      var pText = priceTag.getAttribute('content') || priceTag.innerText || '';
      var match = pText.match(/[\d,.]+/);
      if (match) price = match[0].replace(/,/g, '');
    }

    // --- 抓圖（正方形主圖置頂，長條圖置後，過濾宣傳海報） ---
    var squareImg = '';
    var detailImages = [];
    var longScrollImgs = [];

    var allImgEls = doc.querySelectorAll('img');
    for (var i = 0; i < allImgEls.length; i++) {
      var el = allImgEls[i];
      var s = el.getAttribute('ec-data-src') || el.getAttribute('data-original') || el.getAttribute('src') || '';
      if (!s) continue;

      if (s.indexOf('//') === 0) s = 'https:' + s;
      else if (s.indexOf('/') === 0) s = root + s;
      if (s.indexOf('http://') === 0) s = s.replace('http://', 'https://');

      var low = s.toLowerCase();
      var isJunk = low.indexOf('meta_logo') !== -1 || low.indexOf('promotion') !== -1 ||
                   low.indexOf('submenu') !== -1 || low.indexOf('collection_sub') !== -1 ||
                   low.indexOf('banner') !== -1 || low.indexOf('naver') !== -1 || 
                   low.indexOf('pay') !== -1 || low.indexOf('icon') !== -1 || low.indexOf('.gif') !== -1;

      if (isJunk) continue;

      // 正方形平鋪商品大圖
      if (low.indexOf('/product/big/') !== -1 || low.indexOf('/big/') !== -1) {
        if (!squareImg) squareImg = s;
        else if (detailImages.indexOf(s) === -1) detailImages.push(s);
      }
      // NNEditor 內文圖
      else if (low.indexOf('nneditor') !== -1 || low.indexOf('/upload/') !== -1) {
        if (low.indexOf('muffler_') !== -1 || low.indexOf('check_') !== -1) {
          if (longScrollImgs.indexOf(s) === -1) longScrollImgs.push(s);
        } else {
          if (detailImages.indexOf(s) === -1) detailImages.push(s);
        }
      }
    }

    if (!squareImg && detailImages.length > 0) squareImg = detailImages.shift();
    if (!squareImg && longScrollImgs.length > 0) squareImg = longScrollImgs[0];

    var finalImages = [];
    if (squareImg) finalImages.push(squareImg);
    finalImages = finalImages.concat(detailImages).concat(longScrollImgs);

    return {
      vendor: 'Mardi Mercredi',
      type: 'Accessories',
      title: t,
      handle: cleanHandle,
      color: color,
      price: price,
      keyImage: squareImg,
      images: finalImages,
      sizes: [],
      sourceUrl: url
    };
  }
});
