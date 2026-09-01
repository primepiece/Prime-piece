import { requireAuth } from '../../scale-os/lib/auth.js';
import { renderShell } from '../../scale-os/lib/layout.js';
import { PRODUCT_LAB_STYLE, PRODUCT_LAB_BODY, PRODUCT_LAB_SCRIPT } from '../../scale-os/lib/product-lab.js';

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;

  const html = renderShell({
    title: 'Product Lab',
    activeKey: 'product-lab',
    bodyHtml: PRODUCT_LAB_BODY,
    extraStyle: PRODUCT_LAB_STYLE,
    extraScript: PRODUCT_LAB_SCRIPT,
  });

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(html);
}
