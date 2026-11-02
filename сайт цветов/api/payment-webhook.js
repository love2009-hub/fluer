// Принимает уведомления от ЮKassa и пишет вам в Telegram
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8712931552:AAGilnxTtpCwE9COCp1AxyTT4M9Tf0qJbQE';
const TG_CHAT = process.env.TELEGRAM_CHAT_ID || '7196676689';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const event = req.body || {};
  const type = event.event;

  if (type === 'payment.succeeded' || type === 'payment.canceled') {
    const p = event.object || {};
    const orderNumber = p.metadata?.orderNumber || '—';
    const amount = p.amount?.value || '—';
    const method = p.payment_method?.type || '—';
    const status = type === 'payment.succeeded' ? '✅ ОПЛАЧЕН' : '❌ ОТМЕНЁН';

    const text =
      `${status} (ЮKassa)\n\n` +
      `🧾 Заказ: ${orderNumber}\n` +
      `💰 Сумма: ${amount} ₽\n` +
      `💳 Способ: ${method}\n` +
      `🆔 Платёж: ${p.id}`;

    try {
      await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TG_CHAT, text })
      });
    } catch (e) { /* молча игнорируем */ }
  }

  return res.status(200).json({ ok: true });
}