require('dotenv/config');
const postgres = require('postgres');

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

function round2(value) {
  return Number(Number(value).toFixed(2));
}

function mapIncomePaymentMethod(method) {
  // incomes.payment_method currently supports CASH/QRIS.
  if (method === 'TRANSFER') return 'QRIS';
  if (method === 'CASH' || method === 'QRIS') return method;
  return null;
}

async function main() {
  const shouldApply = process.argv.includes('--apply');

  console.log(shouldApply ? 'Running in APPLY mode' : 'Running in DRY-RUN mode');

  const bills = await sql`
    SELECT
      id,
      user_id,
      bill_number,
      invoice_number,
      customer_name,
      total_amount,
      down_payment_percent,
      down_payment_amount,
      paid_amount,
      payment_method,
      status,
      created_at
    FROM open_bills
    WHERE status <> 'VOID'
      AND COALESCE(down_payment_percent, 0) > 0
    ORDER BY created_at ASC
  `;

  let checked = 0;
  let updatedBills = 0;
  let insertedIncome = 0;
  let skippedNoPaymentMethod = 0;

  for (const bill of bills) {
    checked += 1;

    const totalAmount = Number(bill.total_amount || 0);
    const downPaymentPercent = Number(bill.down_payment_percent || 0);
    const storedDownPaymentAmount = Number(bill.down_payment_amount || 0);
    const storedPaidAmount = Number(bill.paid_amount || 0);

    const computedDownPayment = round2(Math.min(totalAmount, Math.max(0, (totalAmount * downPaymentPercent) / 100)));

    const shouldUpdateDownPaymentAmount = Math.abs(storedDownPaymentAmount - computedDownPayment) > 0.009;

    const shouldUpdatePaidAmount =
      (bill.status === 'OPEN' || bill.status === 'PARTIAL') &&
      Math.abs(storedPaidAmount - computedDownPayment) > 0.009;

    if (shouldUpdateDownPaymentAmount || shouldUpdatePaidAmount) {
      if (shouldApply) {
        await sql`
          UPDATE open_bills
          SET
            down_payment_amount = ${computedDownPayment},
            paid_amount = CASE
              WHEN ${shouldUpdatePaidAmount} THEN ${computedDownPayment}
              ELSE paid_amount
            END,
            status = CASE
              WHEN ${shouldUpdatePaidAmount} AND ${computedDownPayment} > 0 THEN 'PARTIAL'::open_bill_status
              WHEN ${shouldUpdatePaidAmount} AND ${computedDownPayment} = 0 THEN 'OPEN'::open_bill_status
              ELSE status
            END,
            updated_at = NOW()
          WHERE id = ${bill.id}
        `;
      }
      updatedBills += 1;
    }

    if (computedDownPayment <= 0) {
      continue;
    }

    const existingIncome = await sql`
      SELECT id
      FROM incomes
      WHERE notes = ${`Open Bill: ${bill.bill_number}`}
        AND description ILIKE 'Down Payment - %'
      LIMIT 1
    `;

    if (existingIncome.length > 0) {
      continue;
    }

    const incomePaymentMethod = mapIncomePaymentMethod(bill.payment_method);
    if (!incomePaymentMethod) {
      skippedNoPaymentMethod += 1;
      continue;
    }

    const incomeDescription = `Down Payment - ${bill.invoice_number || bill.bill_number} (${bill.customer_name || 'Walk-in'})`;

    if (shouldApply) {
      await sql`
        INSERT INTO incomes (
          user_id,
          description,
          amount,
          category,
          payment_method,
          date,
          notes,
          created_at
        ) VALUES (
          ${bill.user_id},
          ${incomeDescription},
          ${computedDownPayment},
          'OTHER'::income_category,
          ${incomePaymentMethod}::transaction_payment_method,
          ${bill.created_at},
          ${`Open Bill: ${bill.bill_number}`},
          NOW()
        )
      `;
    }

    insertedIncome += 1;
  }

  console.log('Summary:');
  console.log(`- Checked bills: ${checked}`);
  console.log(`- Bills to update: ${updatedBills}`);
  console.log(`- Down payment incomes to insert: ${insertedIncome}`);
  console.log(`- Skipped (missing payment method): ${skippedNoPaymentMethod}`);

  if (!shouldApply) {
    console.log('\nNo data changed (dry-run). Use --apply to execute updates.');
  }
}

main()
  .catch((error) => {
    console.error('Script failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sql.end({ timeout: 0 });
  });
