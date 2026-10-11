// 全局引擎註冊中心
window.REGISTERED_ENGINES = window.REGISTERED_ENGINES || [];

// 通用輔助工具
window.ENGINE_UTILS = {
  sanitizeHandle: function(str) {
    return (str || 'product').toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/[\s_]+/g, '-');
  },
  
  parseColors: function(rawTitle, url) {
    var t = rawTitle.replace(/Product Name\s*:/i, '').trim();
    t = t.replace(/^\[.*?\]\s*/i, '').trim();

    // 1. 先去除品牌後綴 (例如 - MARDI MERCREDI | 마르디 메크르디)
    t = t.replace(/\s*[-–|]\s*(MARDI MERCREDI|ROCKFISH|WEATHERWEAR|마르디|메크르디).*$/i, '').trim();
    t = t.replace(/\s*\|.*$/, '').trim();

    var color = '';

    // 2. 原版最穩定邏輯：直接以破折號切出顏色 (支援單字與多字，如 - SKY BLUE, - LIGHT GREY, - PINK)
    var dashMatch = t.match(/\s*[-–]\s*([A-Za-z\s]+)$/);
    if (dashMatch) {
      color = dashMatch[1].trim();
      t = t.substring(0, dashMatch.index).trim();
    }

    // 3. 處理底線式命名 (例如 CHECK_BLUE)
    if (!color) {
      var underscoreMatch = t.match(/_([A-Za-z\s]+)$/);
      if (underscoreMatch) {
        color = underscoreMatch[1].trim();
        t = t.substring(0, underscoreMatch.index).trim();
      }
    }

    // 4. 若標題無顏色，從 URL slug 推斷
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
        var commonColors = ['blue', 'pink', 'mint', 'beige', 'brown', 'black', 'white', 'silver', 'navy', 'gray', 'grey', 'red', 'green', 'ivory', 'cream', 'khaki', 'camel', 'yellow', 'purple', 'charcoal', 'gold', 'orange', 'oatmeal', 'melange'];
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

    // 格式化顏色字串（首字母大寫）
    if (color) {
      color = color.toLowerCase().split(/\s+/).map(function(word) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }).join(' ');
    } else {
      color = 'Default Color';
    }

    // 清理標題結尾殘留符號
    t = t.replace(/[\s_-]+$/, '').trim();
    return { title: t, color: color };
  }
};
