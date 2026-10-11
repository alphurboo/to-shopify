window.REGISTERED_ENGINES = window.REGISTERED_ENGINES || [];

window.REGISTERED_ENGINES.push({
  id: 'mardi',
  name: 'Mardi Mercredi',
  pageUrl: 'mardi.html',
  description: '優先正方形平鋪大圖、長條圖置後、自動剔除韓文與全站海報 Logo',

  parse: function(html, url) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var rawTitle = doc.querySelector('meta[property="og:title"], h1, .headingArea h2, .product-title, .name')?.innerText || doc.title || 'Product';
    var parsed = window.ENGINE_UTILS.parseColors(rawTitle, url);
    var root = new URL(url).origin;

    // 1. 真實價格抓取
    var priceTag = doc.querySelector('meta[property="product:sale_price:amount"], [itemprop="price"], #span_product_price_text, .price, span[id*="price"]');
    var price = '0.00';
    if (priceTag) {
      var pText = priceTag.getAttribute('content') || priceTag.innerText || '';
      var match = pText.match(/[\d,.]+/);
      if (match) price = match[0].replace(/,/g, '');
    }

    // 2. 圖片分離（正方形主圖 vs 內文大圖 vs 長條圖）
    var squareImg = '';
    var detailImages = [];
    var longScrollImgs = [];

    var thumbEls = doc.querySelectorAll('.keyImg img, .thumbnail img, #main-image img');
    for (var t = 0; t < thumbEls.length; t++) {
      var tSrc = thumbEls[t].getAttribute('src') || thumbEls[t].getAttribute('ec-data-src') || '';
      if (tSrc) {
        if (tSrc.indexOf('//') === 0) tSrc = 'https:' + tSrc;
        else if (tSrc.indexOf('/') === 0) tSrc = root + tSrc;
        if (tSrc.indexOf('http://') === 0) tSrc = tSrc.replace('http://', 'https://');
        if (tSrc.toLowerCase().indexOf('meta_logo') === -1 && tSrc.toLowerCase().indexOf('/small/') === -1) {
          squareImg = tSrc;
          break;
        }
      }
    }

    var editorImgs = doc.querySelectorAll('#prdDetail img, .detail_view img, div[class*="editor"] img');
    for (var i = 0; i < editorImgs.length; i++) {
      var s = editorImgs[i].getAttribute('src') || editorImgs[i].getAttribute('ec-data-src') || '';
      if (s) {
        if (s.indexOf('//') === 0) s = 'https:' + s;
        else if (s.indexOf('/') === 0) s = root + s;
        if (s.indexOf('http://') === 0) s = s.replace('http://', 'https://');

        var low = s.toLowerCase();
        var isJunk = low.indexOf('meta_logo') !== -1 || low.indexOf('promotion') !== -1 ||
                     low.indexOf('submenu') !== -1 || low.indexOf('collection_sub') !== -1 ||
                     low.indexOf('banner') !== -1 || low.indexOf('naver') !== -1 || low.indexOf('pay') !== -1;

        if (!isJunk && (low.indexOf('nneditor') !== -1 || low.indexOf('/upload/') !== -1 || low.indexOf('/big/') !== -1)) {
          if (low.indexOf('muffler_') !== -1 || low.indexOf('check_') !== -1) {
            if (longScrollImgs.indexOf(s) === -1) longScrollImgs.push(s);
          } else {
            if (detailImages.indexOf(s) === -1) detailImages.push(s);
          }
        }
      }
    }

    if (!squareImg && longScrollImgs.length > 0) squareImg = longScrollImgs[0];

    var allImgs = [];
    if (squareImg) allImgs.push(squareImg);
    allImgs = allImgs.concat(detailImages).concat(longScrollImgs);

    return {
      vendor: 'Mardi Mercredi',
      type: 'Accessories',
      title: parsed.title,
      color: parsed.color,
      price: price,
      keyImage: squareImg,
      images: allImgs,
      sizes: [],
      sourceUrl: url
    };
  }
});
