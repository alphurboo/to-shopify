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
    t = t.replace(/\s*[-–|]\s*(MARDI MERCREDI|ROCKFISH|WEATHERWEAR|마르디|메크르디).*$/i, '').trim();
    t = t.replace(/\s*\|.*$/, '').trim();

    var color = '';

    // 支援複合顏色（先匹配雙字複合色，如 SKY BLUE, LIGHT GREY, MELANGE BROWN）
    var compoundRegex = /[\s_-]+(SKY\s+BLUE|LIGHT\s+GREY|LIGHT\s+GRAY|DARK\s+BROWN|MELANGE\s+BROWN|MELANGE\s+GREY|MELANGE\s+GRAY|BABY\s+PINK|IVORY\s+WHITE|DEEP\s+GREEN|CHARCOAL\s+GREY|CHARCOAL\s+GRAY)$/i;
    var matchCompound = t.match(compoundRegex);
    if (matchCompound) {
      color = matchCompound[1].trim();
      t = t.substring(0, matchCompound.index).trim();
    }

    // 若非複合色，匹配標準單字顏色
    if (!color) {
      var singleRegex = /[\s_-]+(BLUE|PINK|MINT|BEIGE|BROWN|BLACK|WHITE|SILVER|NAVY|GRAY|GREY|RED|GREEN|IVORY|CREAM|KHAKI|CAMEL|YELLOW|PURPLE|CHARCOAL|GOLD|ORANGE|OATMEAL|MELANGE)$/i;
      var matchSingle = t.match(singleRegex);
      if (matchSingle) {
        color = matchSingle[1].trim();
        t = t.substring(0, matchSingle.index).trim();
      }
    }

    // 若標題仍無顏色，從 URL slug 提取
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

    // 清理標題結尾多餘橫線與底線
    t = t.replace(/[\s_-]+$/, '').trim();
    return { title: t, color: color };
  }
};
