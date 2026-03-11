import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  subject: string;
  template: "purchase_order" | "supplier_complaint" | "general";
  data: Record<string, any>;
  company_id: string;
}

const getPurchaseOrderTemplate = (data: Record<string, any>) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
    .logo { font-size: 24px; font-weight: bold; }
    .content { padding: 30px; background: #f9fafb; }
    .order-info { background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .order-number { font-size: 18px; font-weight: bold; color: #667eea; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f3f4f6; font-weight: 600; }
    .total-row { font-weight: bold; background: #f0f9ff; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">${data.company_name || 'StockFlow'}</div>
    <p style="margin: 5px 0;">Purchase Order Request</p>
  </div>
  <div class="content">
    <div class="order-info">
      <p class="order-number">Order #: ${data.order_number}</p>
      <p><strong>Date:</strong> ${new Date(data.created_at).toLocaleDateString()}</p>
      <p><strong>From:</strong> ${data.company_name}</p>
      ${data.company_address ? `<p><strong>Address:</strong> ${data.company_address}</p>` : ''}
      ${data.company_phone ? `<p><strong>Phone:</strong> ${data.company_phone}</p>` : ''}
    </div>
    
    <h3>Order Items</h3>
    <table>
      <thead>
        <tr>
          <th>Product</th>
          <th>Quantity</th>
          <th>Unit Price</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${data.items?.map((item: any) => `
          <tr>
            <td>${item.product_name || item.product?.name || 'N/A'}</td>
            <td>${item.quantity}</td>
            <td>${data.currency_symbol || 'Rs.'} ${item.unit_price?.toFixed(2)}</td>
            <td>${data.currency_symbol || 'Rs.'} ${item.total?.toFixed(2)}</td>
          </tr>
        `).join('') || ''}
        <tr class="total-row">
          <td colspan="3">Subtotal</td>
          <td>${data.currency_symbol || 'Rs.'} ${data.subtotal?.toFixed(2)}</td>
        </tr>
        <tr>
          <td colspan="3">Tax</td>
          <td>${data.currency_symbol || 'Rs.'} ${data.tax?.toFixed(2)}</td>
        </tr>
        <tr class="total-row">
          <td colspan="3">Total</td>
          <td>${data.currency_symbol || 'Rs.'} ${data.total?.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>
    
    ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ''}
    
    <p style="margin-top: 30px;">Please confirm receipt of this order and expected delivery date.</p>
  </div>
  <div class="footer">
    <p>This email was sent from ${data.company_name}'s inventory management system.</p>
    <p>Powered by StockFlow</p>
  </div>
</body>
</html>
  `;
};

const getComplaintTemplate = (data: Record<string, any>) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
    .header { background: #dc2626; color: white; padding: 30px; text-align: center; }
    .content { padding: 30px; background: #f9fafb; }
    .complaint-info { background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h2 style="margin: 0;">Supplier Complaint</h2>
    <p style="margin: 5px 0;">${data.company_name}</p>
  </div>
  <div class="content">
    <div class="complaint-info">
      <h3>${data.subject}</h3>
      <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
      ${data.product_name ? `<p><strong>Related Product:</strong> ${data.product_name}</p>` : ''}
    </div>
    
    <h4>Description:</h4>
    <p>${data.description}</p>
    
    <p style="margin-top: 30px;">Please address this issue at your earliest convenience.</p>
    
    <p>Best regards,<br>${data.company_name}</p>
  </div>
  <div class="footer">
    <p>Powered by StockFlow</p>
  </div>
</body>
</html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  console.log("Email function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, template, data, company_id }: EmailRequest = await req.json();
    
    console.log(`Sending ${template} email to ${to}`);

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    let html = "";
    
    switch (template) {
      case "purchase_order":
        html = getPurchaseOrderTemplate(data);
        break;
      case "supplier_complaint":
        html = getComplaintTemplate(data);
        break;
      default:
        html = `<p>${data.message || 'No content provided'}</p>`;
    }

    // Send email via Resend API directly
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "StockFlow <onboarding@resend.dev>",
        to: [to],
        subject: subject,
        html: html,
      }),
    });

    const emailResult = await emailResponse.json();
    
    if (!emailResponse.ok) {
      throw new Error(emailResult.message || "Failed to send email");
    }

    console.log("Email sent successfully:", emailResult);

    // Log email in database
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    await supabaseAdmin.from("email_logs").insert({
      company_id,
      recipient_email: to,
      recipient_type: template === "purchase_order" ? "supplier" : "general",
      subject,
      template_used: template,
      status: "sent",
      sent_at: new Date().toISOString(),
      metadata: { resend_id: emailResult.id },
    });

    return new Response(JSON.stringify({ success: true, id: emailResult.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending email:", error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);