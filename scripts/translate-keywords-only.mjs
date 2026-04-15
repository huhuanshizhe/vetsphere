/**
 * 通过 admin API 调用翻译，只针对还缺 focus_keyword 翻译的产品
 * 会翻译所有字段（包括 focus_keyword）
 */

const ADMIN_API = 'http://localhost:3002';

const productIds = [
  'prod_mnvf3m6c_z60feu', // ALI0001
  'prod_mnvf3oh1_wly81f', // ALI0002
  'prod_mnvf3qxw_p4j3gu', // ALI0005
  'prod_mnvf3vib_3hk3z4', // ALI0008
  'prod_mnvf3xho_7952td', // ALI0011
  'prod_mnvf403t_rpl3l1', // ALI0017
  'prod_mnvf40wl_18d5hm', // ALI0018
  'prod_mnvf41q0_0movph', // ALI0019
  'prod_mnvf42iu_a8yg8q', // ALI0020
  'prod_mnvf468h_09ayz5', // ALI0023
  'prod_mnvf472k_kyg7ru', // ALI0024
  'prod_mnvf49ci_jx6l9h', // ALI0026
  'prod_mnvf4fa3_plwvjx', // ALI0027
  'prod_mnvf4i42_p49yrn', // ALI0031
  'prod_mnvf4jz7_ssrcap', // ALI0034
  'prod_mnvf4kwe_xzf0st', // ALI0039
  'prod_mnvf4me7_868op2', // ALI0040
  'prod_mnvf4nb0_glcz8w', // ALI0054
  'prod_mnvf4ogo_atnz0s', // ALI0064
  'prod_mnvf4pke_0npnnv', // ALI0065
  'prod_mnvf4qni_qlwg0c', // ALI0066
  'prod_mnvf4ruz_xv4j4o', // ALI0067
  'prod_mnvf4t3c_t2odd6', // ALI0068
  'prod_mnvf4vcr_sejbgp', // ALI0070
];

async function main() {
  console.log(`开始翻译 ${productIds.length} 个产品的 focus_keyword...\n`);
  let success = 0, failed = 0;

  for (let i = 0; i < productIds.length; i++) {
    const id = productIds[i];
    console.log(`[${i + 1}/${productIds.length}] 翻译产品 ${id}...`);
    try {
      const resp = await fetch(`${ADMIN_API}/api/products/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: id }),
      });
      const data = await resp.json();
      if (resp.ok) {
        console.log(`  ✅ ${data.completedLanguages?.join(', ') || 'done'}`);
        success++;
      } else {
        console.log(`  ❌ ${data.error || resp.status}`);
        failed++;
      }
    } catch (err) {
      console.log(`  ❌ ${err.message}`);
      failed++;
    }
    // 避免API限流
    if (i < productIds.length - 1) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  console.log(`\n完成: ${success} 成功, ${failed} 失败`);
}

main();
