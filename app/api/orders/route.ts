import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: Fetch all orders from database
export async function GET() {
  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('Error fetching orders:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(orders);
  } catch (err: any) {
    console.error('Orders GET handler error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Reset mock data or update order state
export async function POST(req: Request) {
  try {
    const { action } = await req.json();

    if (action === 'reset') {
      console.log('DB Reset requested via API route');
      const initialOrders = [
        { id: 'ORD-1001', status: 'delivered', days_delayed: 0 },
        { id: 'ORD-1002', status: 'delayed', days_delayed: 7 },
        { id: 'ORD-1003', status: 'shipped', days_delayed: 1 },
        { id: 'ORD-1004', status: 'delayed', days_delayed: 2 },
        { id: 'ORD-1005', status: 'processing', days_delayed: 0 }
      ];

      for (const order of initialOrders) {
        await supabase
          .from('orders')
          .update({ status: order.status, days_delayed: order.days_delayed })
          .eq('id', order.id);
      }

      return NextResponse.json({ success: true, message: 'Database mock data reset successfully.' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('Orders POST handler error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
