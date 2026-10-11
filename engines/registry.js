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
    var colorMatch = t.match(/[\s_-]+(BLUE|PINK|MINT|BEIGE|BROWN|BLACK|WHITE|SILVER|NAVY|GRAY|GREY|RED|GREEN|IVORY|CREAM|KHAKI|CAMEL|YELLOW|PURPLE|CHARCOAL|GOLD|ORANGE|OATMEAL)$/i);
    if (colorMatch) {
      color = colorMatch[1].trim();
      t = t.substring(0, colorMatch.index).trim();
    }
    if (!color) {
      var lowUrl = url.toLowerCase();
      var commonColors = ['blue', 'pink', 'mint', 'beige', 'brown', 'black', 'white', 'silver', 'navy', 'gray', 'grey', 'red', 'green', 'ivory', 'cream', 'khaki', 'camel', 'yellow', 'purple', 'charcoal', 'gold'];
      for (var c = 0; c < commonColors.length; c++) {
        if (lowUrl.indexOf(commonColors[c]) !== -1) {
          color = commonColors[c]; break;
        }
      }
    }
    color = color ? (color.charAt(0).toUpperCase() + color.slice(1).toLowerCase()) : 'Default Color';
    t = t.replace(/[\s_-]+$/, '').trim();
    return { title: t, color: color };
  }
};
