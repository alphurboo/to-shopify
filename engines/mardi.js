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

    var squareImg = '';
    var detailImages = [];
    var longScrollImgs = [];

    var mainEl = doc.querySelector('.keyImg img, .thumbnail img, #main-image img');
    if (mainEl) {
      squareImg = mainEl.getAttribute('src') || mainEl.getAttribute('ec-data-src') || '';
      if (squareImg.indexOf('//') === 0) squareImg = 'https:' + squareImg;
      else if (squareImg.indexOf('/') === 0) squareImg = root + squareImg;
    }

    var editorImgs = doc.querySelectorAll('#prdDetail img, .detail_view img, div[class*="editor"] img');
    for (var i = 0; i < editorImgs.length; i++) {
      var s = editorImgs[i].getAttribute('src') || editorImgs[i].getAttribute('ec-data-src') || '';
      if (s.indexOf('//') === 0) s = 'https:' + s;
      else if (s.indexOf('/') === 0) s = root + s;

      var low = s.toLowerCase();
      var isJunk = low.indexOf('meta_logo') !== -1 || low.indexOf('promotion') !== -1 || low.indexOf('banner') !== -1 || low.indexOf('naver') !== -1 || low.indexOf('pay') !== -1;
      if (!isJunk && (low.indexOf('nneditor') !== -1 || low.indexOf('/upload/') !== -1 || low.indexOf('/big/') !== -1)) {
        if (low.indexOf('muffler_') !== -1 || low.indexOf('check_') !== -1) {
          if (longScrollImgs.indexOf(s) === -1) longScrollImgs.push(s);
        } else {
          if (detailImages.indexOf(s) === -1) detailImages.push(s);
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
      keyImage: squareImg,
      images: allImgs,
      sizes: [],
      sourceUrl: url
    };
  }
});
