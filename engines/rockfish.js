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

    var keyImg = '';
    var allImgs = [];
    var mainEl = doc.querySelector('.keyImg img, .thumbnail img');
    if (mainEl) {
      keyImg = mainEl.getAttribute('src') || mainEl.getAttribute('ec-data-src') || '';
      if (keyImg.indexOf('//') === 0) keyImg = 'https:' + keyImg;
      else if (keyImg.indexOf('/') === 0) keyImg = root + keyImg;
    }

    var imgs = doc.querySelectorAll('img');
    for (var i = 0; i < imgs.length; i++) {
      var s = imgs[i].getAttribute('ec-data-src') || imgs[i].getAttribute('data-original') || imgs[i].getAttribute('src') || '';
      if (s.indexOf('/small/') !== -1) s = s.replace('/small/', '/big/');
      if (s.indexOf('//') === 0) s = 'https:' + s;
      else if (s.indexOf('/') === 0) s = root + s;
      
      var low = s.toLowerCase();
      var isJunk = low.indexOf('naver') !== -1 || low.indexOf('pay') !== -1 || low.indexOf('.gif') !== -1 || low.indexOf('icon') !== -1;
      if (!isJunk && (low.indexOf('/big/') !== -1 || low.indexOf('rockfish.cafe24.com') !== -1)) {
        if (!keyImg) keyImg = s;
        if (allImgs.indexOf(s) === -1) allImgs.push(s);
      }
    }

    var isShoe = /ballet|flat|shoe|boot|sneaker|loafer|mule|sandal|clog|heel/i.test(parsed.title) || /category\/230|shoes/i.test(url);
    var sizes = isShoe ? ['230', '235', '240', '245', '250', '255'] : [];

    return {
      vendor: 'Rockfish Weatherwear',
      type: isShoe ? 'Shoes' : 'Bags & Accessories',
      title: parsed.title,
      color: parsed.color,
      keyImage: keyImg,
      images: allImgs,
      sizes: sizes,
      sourceUrl: url
    };
  }
});
