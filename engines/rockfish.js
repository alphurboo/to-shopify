window.REGISTERED_ENGINES = window.REGISTERED_ENGINES || [];

window.REGISTERED_ENGINES.push({
  id: 'rockfish',
  name: 'Rockfish Weatherwear',
  pageUrl: 'rockfish.html',
  description: '支援鞋款尺碼配對（含 Slippers/Flats 230-260）、手袋免碼、extra/big 高清模特相',

  parse: function(html, url) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var rawTitle = doc.querySelector('meta[property="og:title"], h1, .headingArea h2, .product-title, .name')?.innerText || doc.title || 'Product';
    var root = new URL(url).origin;

    // --- 切字邏輯 ---
    var t = rawTitle.replace(/Product Name\s*:/i, '').trim();
    t = t.replace(/^\[.*?\]\s*/i, '').trim();
    t = t.split(/\s*[-–|]\s*(?:ROCKFISH|WEATHERWEAR)/i)[0].trim();
    t = t.split('|')[0].trim();

    var color = '';
    var dashMatch = t.match(/\s*[-–]\s*([A-Za-z\s]+)$/);
    if (dashMatch) {
      color = dashMatch[1].trim();
      t = t.substring(0, dashMatch.index).trim();
    }

    if (!color) {
      var lowUrl = url.toLowerCase();
      var compoundSlugs = [
        { key: 'sky-blue', name: 'Sky Blue' },
        { key: 'light-grey', name: 'Light Grey' },
        { key: 'light-gray', name: 'Light Grey' },
        { key: 'melange-brown', name: 'Melange Brown' },
        { key: 'melange-grey', name: 'Melange Grey' }
      ];
      for (var k = 0; k < compoundSlugs.length; k++) {
        if (lowUrl.indexOf(compoundSlugs[k].key) !== -1) {
          color = compoundSlugs[k].name;
          break;
        }
      }
      if (!color) {
        var commonColors = ['blue', 'pink', 'mint', 'beige', 'brown', 'black', 'white', 'silver', 'navy', 'gray', 'grey', 'red', 'green', 'ivory', 'cream', 'khaki', 'camel', 'yellow', 'purple', 'charcoal', 'gold', 'orange', 'oatmeal', 'melange', 'chestnut', 'sand', 'cocoa', 'choco'];
        for (var c = 0; c < commonColors.length; c++) {
          var testColor = commonColors[c];
          var reg = new RegExp('[-_/]' + testColor + '([-_/]|$)', 'i');
          if (reg.test(lowUrl)) {
            color = testColor;
            break;
          }
        }
      }
    }

    color = color ? color.toLowerCase().split(/\s+/).map(function(w){ return w.charAt(0).toUpperCase() + w.slice(1); }).join(' ') : 'Default Color';
    t = t.replace(/[\s_-]+$/, '').trim();
    var cleanHandle = t.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/[\s_]+/g, '-');

    // --- 價格 ---
    var priceTag = doc.querySelector('meta[property="product:sale_price:amount"], [itemprop="price"], #span_product_price_text, .price, span[id*="price"]');
    var price = '0.00';
    if (priceTag) {
      var pText = priceTag.getAttribute('content') || priceTag.innerText || '';
      var match = pText.match(/[\d,.]+/);
      if (match) price = match[0].replace(/,/g, '');
    }

    // --- 抓圖 ---
    var keyImg = '';
    var allImgs = [];
    var mainEl = doc.querySelector('.keyImg img, .thumbnail img');
    if (mainEl) {
      var m = mainEl.getAttribute('src') || mainEl.getAttribute('ec-data-src') || '';
      if (m.indexOf('//') === 0) m = 'https:' + m;
      else if (m.indexOf('/') === 0) m = root + m;
      if (m.indexOf('http://') === 0) m = m.replace('http://', 'https://');
      if (m.toLowerCase().indexOf('logo') === -1 && m.toLowerCase().indexOf('node') === -1) {
        keyImg = m;
      }
    }

    var imgs = doc.querySelectorAll('img');
    for (var i = 0; i < imgs.length; i++) {
      var s = imgs[i].getAttribute('ec-data-src') || imgs[i].getAttribute('data-original') || imgs[i].getAttribute('src') || '';
      if (s.indexOf('/small/') !== -1) s = s.replace('/small/', '/big/');
      if (s.indexOf('//') === 0) s = 'https:' + s;
      else if (s.indexOf('/') === 0) s = root + s;
      if (s.indexOf('http://') === 0) s = s.replace('http://', 'https://');

      var low = s.toLowerCase();
      var isJunk = low.indexOf('naver') !== -1 || low.indexOf('pay') !== -1 || low.indexOf('.gif') !== -1 ||
                   low.indexOf('icon') !== -1 || low.indexOf('blank') !== -1 || low.indexOf('logo') !== -1 || low.indexOf('node.png') !== -1;

      if (!isJunk && (low.indexOf('/big/') !== -1 || low.indexOf('rockfish.cafe24.com') !== -1)) {
        if (!keyImg) keyImg = s;
        if (allImgs.indexOf(s) === -1) allImgs.push(s);
      }
    }

    // --- 關鍵修正：加入 slipper / slide / clog / sandal ---
    var isShoe = /ballet|flat|shoe|boot|sneaker|loafer|mule|sandal|clog|heel|slipper|slide/i.test(t) || /category\/230|shoes/i.test(url);
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
    // 預設鞋類尺碼（含 260）
    if (isShoe && sizes.length === 0) {
      sizes = ['230', '235', '240', '245', '250', '255', '260'];
    }

    return {
      vendor: 'Rockfish Weatherwear',
      type: isShoe ? 'Shoes' : 'Bags & Accessories',
      title: t,
      handle: cleanHandle,
      color: color,
      price: price,
      keyImage: keyImg,
      images: allImgs,
      sizes: sizes,
      sourceUrl: url
    };
  }
});
