window.REGISTERED_ENGINES = window.REGISTERED_ENGINES || [];

window.REGISTERED_ENGINES.push({
  id: 'rockfish',
  name: 'Rockfish Weatherwear',
  pageUrl: 'rockfish.html',
  description: '支援鞋款尺碼配對（230-255）、手袋免碼、extra/big 高清模特相',

  parse: function(html, url) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var rawTitle = doc.querySelector('meta[property="og:title"], h1, .headingArea h2, .product-title, .name')?.innerText || doc.title || 'Product';
    var parsed = window.ENGINE_UTILS.parseColors(rawTitle, url);
    var root = new URL(url).origin;

    // 1. 價格抓取
    var priceTag = doc.querySelector('meta[property="product:sale_price:amount"], [itemprop="price"], #span_product_price_text, .price, span[id*="price"]');
    var price = '0.00';
    if (priceTag) {
      var pText = priceTag.getAttribute('content') || priceTag.innerText || '';
      var match = pText.match(/[\d,.]+/);
      if (match) price = match[0].replace(/,/g, '');
    }

    // 2. 主圖抓取（剔除 logo_node）
    var keyImg = '';
    var allImgs = [];
    var mainEl = doc.querySelector('.keyImg img, .thumbnail img');
    if (mainEl) {
      var m = mainEl.getAttribute('src') || mainEl.getAttribute('ec-data-src') || '';
      if (m.indexOf('//') === 0) m = 'https:' + m;
      else if (m.indexOf('/') === 0) m = root + m;
      if (m.indexOf('http://') === 0) m = m.replace('http://', 'https://');
      
      var mLow = m.toLowerCase();
      if (mLow.indexOf('logo') === -1 && mLow.indexOf('node') === -1) {
        keyImg = m;
      }
    }

    // 3. 所有大圖掃描（嚴格過濾 logo_node, naver, pay）
    var imgs = doc.querySelectorAll('img');
    for (var i = 0; i < imgs.length; i++) {
      var s = imgs[i].getAttribute('ec-data-src') || imgs[i].getAttribute('data-original') || imgs[i].getAttribute('src') || '';
      if (s.indexOf('/small/') !== -1) s = s.replace('/small/', '/big/');
      if (s.indexOf('//') === 0) s = 'https:' + s;
      else if (s.indexOf('/') === 0) s = root + s;
      if (s.indexOf('http://') === 0) s = s.replace('http://', 'https://');

      var low = s.toLowerCase();
      var isJunk = low.indexOf('naver') !== -1 ||
                   low.indexOf('pay') !== -1 ||
                   low.indexOf('.gif') !== -1 ||
                   low.indexOf('icon') !== -1 ||
                   low.indexOf('blank') !== -1 ||
                   low.indexOf('logo') !== -1 ||
                   low.indexOf('node.png') !== -1;

      if (!isJunk && (low.indexOf('/big/') !== -1 || low.indexOf('rockfish.cafe24.com') !== -1)) {
        if (!keyImg) keyImg = s;
        if (allImgs.indexOf(s) === -1) allImgs.push(s);
      }
    }

    // 4. 尺碼判斷
    var isShoe = /ballet|flat|shoe|boot|sneaker|loafer|mule|sandal|clog|heel/i.test(parsed.title) || /category\/230|shoes/i.test(url);
    var sizes = [];
    var sizeMatch = html.match(/"option_value":\s*"(\d{3})"/g);
    if (sizeMatch) {
      for (var sm = 0; sm < sizeMatch.length; sm++) {
        var val = sizeMatch[sm].replace(/[^0-9]/g, '');
        if (sizes.indexOf(val) === -1 && parseInt(val) >= 220 && parseInt(val) <= 270) {
          sizes.push(val);
        }
      }
    }
    if (isShoe && sizes.length === 0) {
      sizes = ['230', '235', '240', '245', '250', '255'];
    }

    return {
      vendor: 'Rockfish Weatherwear',
      type: isShoe ? 'Shoes' : 'Bags & Accessories',
      title: parsed.title,
      color: parsed.color,
      price: price,
      keyImage: keyImg,
      images: allImgs,
      sizes: sizes,
      sourceUrl: url
    };
  }
});
