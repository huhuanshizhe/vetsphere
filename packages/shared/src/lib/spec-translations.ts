// Spec label translations for product specifications
export const specLabelTranslations: Record<string, { en: string; ja: string; th: string; zh: string }> = {
  // Weight/Size
  '重量': { en: 'Weight', ja: '重量', th: 'น้ำหนัก', zh: '重量' },
  '尺寸': { en: 'Dimensions', ja: 'サイズ', th: 'ขนาด', zh: '尺寸' },
  '长度': { en: 'Length', ja: '長さ', th: 'ความยาว', zh: '长度' },
  '宽度': { en: 'Width', ja: '幅', th: 'ความกว้าง', zh: '宽度' },
  '高度': { en: 'Height', ja: '高さ', th: 'ความสูง', zh: '高度' },

  // LED/Power
  'LED 功率': { en: 'LED Power', ja: 'LED 電力', th: 'กำลัง LED', zh: 'LED 功率' },
  'LED功率': { en: 'LED Power', ja: 'LED 電力', th: 'กำลัง LED', zh: 'LED功率' },
  '功率': { en: 'Power', ja: '電力', th: 'กำลัง', zh: '功率' },
  '功耗': { en: 'Power Consumption', ja: '消費電力', th: 'การใช้พลังงาน', zh: '功耗' },

  // Light/Brightness
  '亮度范围': { en: 'Brightness Range', ja: '輝度範囲', th: 'ช่วงความสว่าง', zh: '亮度范围' },
  '亮度': { en: 'Brightness', ja: '輝度', th: 'ความสว่าง', zh: '亮度' },
  '光照强度': { en: 'Illuminance', ja: '照度', th: 'ความเข้มแสง', zh: '光照强度' },
  '光照度': { en: 'Illuminance', ja: '照度', th: 'ความเข้มแสง', zh: '光照度' },

  // Color Temperature
  '色温范围': { en: 'Color Temperature Range', ja: '色温度範囲', th: 'ช่วงอุณหภูมิสี', zh: '色温范围' },
  '色温': { en: 'Color Temperature', ja: '色温度', th: 'อุณหภูมิสี', zh: '色温' },

  // Battery
  '电池续航': { en: 'Battery Life', ja: 'バッテリー持続時間', th: 'อายุแบตเตอรี่', zh: '电池续航' },
  '电池容量': { en: 'Battery Capacity', ja: 'バッテリー容量', th: 'ความจุแบตเตอรี่', zh: '电池容量' },
  '充电时间': { en: 'Charging Time', ja: '充電時間', th: 'เวลาชาร์จ', zh: '充电时间' },
  '续航时间': { en: 'Battery Life', ja: '持続時間', th: 'ระยะเวลาใช้งาน', zh: '续航时间' },

  // Light Source
  '光源类型': { en: 'Light Source Type', ja: '光源タイプ', th: 'ประเภทแหล่งกำเนิดแสง', zh: '光源类型' },
  '光源': { en: 'Light Source', ja: '光源', th: 'แหล่งกำเนิดแสง', zh: '光源' },

  // Protection
  '防护等级': { en: 'Protection Rating', ja: '保護等級', th: 'ระดับการป้องกัน', zh: '防护等级' },
  '防水等级': { en: 'Waterproof Rating', ja: '防水等級', th: 'ระดับกันน้ำ', zh: '防水等级' },

  // Material
  '材质': { en: 'Material', ja: '素材', th: 'วัสดุ', zh: '材质' },
  '材料': { en: 'Material', ja: '材料', th: 'วัสดุ', zh: '材料' },

  // Package
  '包装': { en: 'Package', ja: 'パッケージ', th: 'บรรจุภัณฑ์', zh: '包装' },
  '包装数量': { en: 'Package Quantity', ja: '包装数量', th: 'จำนวนบรรจุ', zh: '包装数量' },
  '数量': { en: 'Quantity', ja: '数量', th: 'จำนวน', zh: '数量' },

  // Compatibility
  '兼容性': { en: 'Compatibility', ja: '互換性', th: 'ความเข้ากันได้', zh: '兼容性' },
  '适用场景': { en: 'Application', ja: '適用シーン', th: 'การใช้งาน', zh: '适用场景' },
  '适用范围': { en: 'Application Range', ja: '適用範囲', th: 'ขอบเขตการใช้งาน', zh: '适用范围' },

  // Certification
  '认证': { en: 'Certification', ja: '認証', th: 'การรับรอง', zh: '认证' },
  '证书': { en: 'Certificate', ja: '証明書', th: 'ใบรับรอง', zh: '证书' },

  // Origin
  '产地': { en: 'Country of Origin', ja: '生産国', th: 'ประเทศต้นกำเนิด', zh: '产地' },
  '品牌': { en: 'Brand', ja: 'ブランド', th: 'แบรนด์', zh: '品牌' },

  // Warranty
  '保修期': { en: 'Warranty Period', ja: '保証期間', th: 'ระยะเวลาประกัน', zh: '保修期' },
  '保修': { en: 'Warranty', ja: '保証', th: 'การรับประกัน', zh: '保修' },

  // Technical
  '电压': { en: 'Voltage', ja: '電圧', th: 'แรงดันไฟฟ้า', zh: '电压' },
  '频率': { en: 'Frequency', ja: '周波数', th: 'ความถี่', zh: '频率' },
  '电流': { en: 'Current', ja: '電流', th: 'กระแสไฟฟ้า', zh: '电流' },

  // Other common specs
  '颜色': { en: 'Color', ja: '色', th: 'สี', zh: '颜色' },
  '颜色分类': { en: 'Color Classification', ja: 'カラー分類', th: 'การจำแนกสี', zh: '颜色分类' },
  '型号': { en: 'Model', ja: 'モデル', th: 'รุ่น', zh: '型号' },
  '规格': { en: 'Specification', ja: '仕様', th: 'ข้อมูลจำเพาะ', zh: '规格' },
  '上市时间': { en: 'Launch Date', ja: '発売時期', th: 'วันที่เปิดตัว', zh: '上市时间' },
  '生产企业': { en: 'Manufacturer', ja: '製造企業', th: 'ผู้ผลิต', zh: '生产企业' },
  '医疗器械注册证编号': { en: 'Medical Device Registration', ja: '医療機器登録番号', th: 'หมายเลขทะเบียนอุปกรณ์การแพทย์', zh: '医疗器械注册证编号' },
};

// Spec value translations - translate Chinese values to locale-specific values
type SpecValueTranslation = { en: string; ja: string; th: string };
export const specValueTranslations: Record<string, SpecValueTranslation> = {
  // Time units
  '小时': { en: 'hours', ja: '時間', th: 'ชั่วโมง' },
  '分钟': { en: 'minutes', ja: '分', th: 'นาที' },
  '秒': { en: 'seconds', ja: '秒', th: 'วินาที' },
  // Common value patterns
  '是': { en: 'Yes', ja: 'はい', th: 'ใช่' },
  '否': { en: 'No', ja: 'いいえ', th: 'ไม่ใช่' },
};

/**
 * Translate a spec value to the target locale
 */
export function translateSpecValue(value: string, locale: string): string {
  if (!value || typeof value !== 'string') return value;

  // Check if the entire value matches a translation
  const translations = specValueTranslations[value];
  if (translations) {
    if (locale === 'ja' && translations.ja) return translations.ja;
    if (locale === 'th' && translations.th) return translations.th;
    if (translations.en) return translations.en;
  }

  // Replace Chinese time units within values like "4-6 小时" → "4-6 hours"
  let translated = value;
  translated = translated.replace(/小时/g, locale === 'ja' ? '時間' : locale === 'th' ? 'ชั่วโมง' : 'hours');
  translated = translated.replace(/分钟/g, locale === 'ja' ? '分' : locale === 'th' ? 'นาที' : 'minutes');
  translated = translated.replace(/秒/g, locale === 'ja' ? '秒' : locale === 'th' ? 'วินาที' : 'seconds');

  return translated;
}

/**
 * Translate a spec key to the target locale
 */
export function translateSpecKey(key: string, locale: string): string {
  const translations = specLabelTranslations[key];
  if (!translations) {
    return key; // Return original if no translation found
  }
  const localeKey = locale as keyof typeof translations;
  return translations[localeKey] || translations.en || key;
}

/**
 * Translate all specs object to target locale (both keys and values)
 */
export function translateSpecs(specs: Record<string, any>, locale: string): Record<string, any> {
  const translated: Record<string, any> = {};
  for (const [key, value] of Object.entries(specs)) {
    const translatedKey = translateSpecKey(key, locale);
    const translatedValue = typeof value === 'string' ? translateSpecValue(value, locale) : value;
    translated[translatedKey] = translatedValue;
  }
  return translated;
}
