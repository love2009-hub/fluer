// Создаёт платёж в ЮKassa и возвращает ссылку на платёжную страницу
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Метод не поддерживается' });

  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secret = process.env.YOOKASSA_SECRET_KEY;
  if (!shopId || !secret) {
    return res.status(500).json({ error: 'Ключи ЮKassa не настроены (Environment Variables)' });
  }

  const { amount, orderNumber, phone, items } = req.body || {};
  if (!amount || !orderNumber) {
    return res.status(400).json({ error: 'Не указана сумма или номер заказа' });
  }

  const host = req.headers.host || 'localhost';
  const returnUrl = `https://${host}/?payment=done`;

  const payload = {
    amount: { value: Number(amount).toFixed(2), currency: 'RUB' },
    capture: true,
    confirmation: { type: 'redirect', return_url: returnUrl },
    description: `Заказ ${orderNumber} — Fleur`,
    metadata: { orderNumber }
  };

  // Чек (54-ФЗ) — только если включено переменной окружения
  if (process.env.YOOKASSA_SEND_RECEIPT === 'true' && Array.isArray(items) && items.length) {
    payload.receipt = {
      customer: { phone: (phone || '').replace(/\D/g, '') },
      items: items.map(i => ({
        description: i.name,
        quantity: String(i.qty),
        amount: { value: Number(i.price).toFixed(2), currency: 'RUB' },
        vat_code: 'without_vat',
        payment_mode: 'full_payment',
        payment_subject: 'commodity'
      }))
    };
  }

  const auth = Buffer.from(`${shopId}:${secret}`).toString('base64');

  try {
    const response = await fetch('https://api.yookassa.ru/v3/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotence-Key': `${orderNumber}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify(payload)
    });
    const payment = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: payment.description || 'ЮKassa отклонила запрос' });
    }
    return res.status(200).json({
      paymentUrl: payment.confirmation?.confirmation_url,
      paymentId: payment.id
    });
  } catch (e) {
    return res.status(500).json({ error: 'Не удалось связаться с ЮKassa' });
  }
}